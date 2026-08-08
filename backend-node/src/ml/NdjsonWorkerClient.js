import { spawn } from 'child_process'
import path from 'path'
import { randomUUID } from 'crypto'
import readline from 'readline'
import { EventEmitter } from 'events'

/**
 * Persistent Python worker client using stdin/stdout NDJSON.
 * Requests are serialized (one in-flight) to keep the protocol safe.
 */
export class NdjsonWorkerClient extends EventEmitter {
  constructor({ name, pythonPath, scriptPath, env = process.env, cwd }) {
    super()
    this.name = name
    this.pythonPath = pythonPath
    this.scriptPath = scriptPath
    this.env = env
    this.cwd = cwd || path.dirname(scriptPath)
    this.proc = null
    this.ready = false
    this.restarting = false
    this.queue = Promise.resolve()
    this.pending = null
    this.restartDelayMs = 1000
    this.maxRestartDelayMs = 15000
  }

  start() {
    if (this.proc) return
    console.info(`[${this.name}] starting worker: ${this.pythonPath} ${this.scriptPath}`)
    this.proc = spawn(this.pythonPath, [this.scriptPath], {
      env: this.env,
      cwd: this.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })

    this.ready = false

    const rl = readline.createInterface({ input: this.proc.stdout })
    rl.on('line', (line) => this._onLine(line))

    this.proc.stderr.on('data', (buf) => {
      const text = buf.toString().trimEnd()
      if (text) console.error(`[${this.name}:stderr] ${text}`)
    })

    this.proc.on('error', (err) => {
      console.error(`[${this.name}] spawn error:`, err)
      this.ready = false
    })

    this.proc.on('exit', (code, signal) => {
      console.error(`[${this.name}] exited code=${code} signal=${signal}`)
      this.proc = null
      this.ready = false
      if (this.pending) {
        const { reject } = this.pending
        this.pending = null
        reject(new Error(`${this.name} worker exited`))
      }
      this._scheduleRestart()
    })

    // Wait for ready handshake from worker
    this._waitForReady()
  }

  _waitForReady() {
    // Worker sends {"type":"ready"} on startup; also accept first response as ready.
    this.once('ready', () => {
      this.ready = true
      this.restartDelayMs = 1000
      console.info(`[${this.name}] worker ready`)
    })
  }

  _scheduleRestart() {
    if (this.restarting) return
    this.restarting = true
    const delay = this.restartDelayMs
    this.restartDelayMs = Math.min(this.restartDelayMs * 2, this.maxRestartDelayMs)
    console.info(`[${this.name}] restarting in ${delay}ms`)
    setTimeout(() => {
      this.restarting = false
      this.start()
    }, delay)
  }

  _onLine(line) {
    let msg
    try {
      msg = JSON.parse(line)
    } catch {
      console.error(`[${this.name}] invalid JSON from worker: ${line}`)
      return
    }

    if (msg.type === 'ready') {
      if (msg.ok === false) {
        console.error(`[${this.name}] worker reported not ready:`, msg.error)
        return
      }
      this.emit('ready')
      return
    }

    if (msg.type === 'error') {
      console.error(`[${this.name}] worker error event:`, msg.error || msg)
      return
    }

    if (!this.pending) {
      console.error(`[${this.name}] unexpected response:`, msg)
      return
    }

    const { id, resolve, reject } = this.pending
    if (msg.id !== id) {
      console.error(`[${this.name}] response id mismatch expected=${id} got=${msg.id}`)
      return
    }

    this.pending = null
    if (!this.ready) this.emit('ready')
    if (msg.ok) resolve(msg.result)
    else reject(new Error(msg.error || 'Worker error'))
  }

  request(op, payload = {}, timeoutMs = 60000) {
    const run = this.queue.then(async () => {
      if (!this.proc) {
        throw new Error(`${this.name} worker unavailable`)
      }
      if (!this.ready) {
        await new Promise((resolve, reject) => {
          const onReady = () => {
            clearTimeout(timer)
            resolve()
          }
          const timer = setTimeout(() => {
            this.off('ready', onReady)
            reject(new Error(`${this.name} worker not ready`))
          }, 180000)
          this.once('ready', onReady)
        })
      }
      return this._requestOnce(op, payload, timeoutMs)
    })
    this.queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  _requestOnce(op, payload, timeoutMs) {
    if (!this.proc || !this.proc.stdin.writable) {
      return Promise.reject(new Error(`${this.name} worker unavailable`))
    }

    const id = randomUUID()
    const body = JSON.stringify({ id, op, ...payload })

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending?.id === id) {
          this.pending = null
          reject(new Error(`${this.name} worker timeout for op=${op}`))
        }
      }, timeoutMs)

      this.pending = {
        id,
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        reject: (err) => {
          clearTimeout(timer)
          reject(err)
        },
      }

      try {
        this.proc.stdin.write(`${body}\n`)
      } catch (err) {
        clearTimeout(timer)
        this.pending = null
        reject(err)
      }
    })
  }

  async stop() {
    if (!this.proc) return
    const proc = this.proc
    this.proc = null
    this.ready = false
    try {
      proc.stdin.write(`${JSON.stringify({ id: 'shutdown', op: 'shutdown' })}\n`)
    } catch {
      /* ignore */
    }
    proc.kill()
  }
}
