export async function recordAudio(
    duration = 5000
) {

    const stream =
        await navigator.mediaDevices
            .getUserMedia({
                audio: true
            });

    const recorder =
        new MediaRecorder(stream);

    const chunks = [];

    recorder.ondataavailable =
        e => chunks.push(e.data);

    recorder.start();

    await new Promise(
        resolve =>
            setTimeout(
                resolve,
                duration
            )
    );

    recorder.stop();

    return await new Promise(
        resolve => {

            recorder.onstop =
                () => {

                    const blob =
                        new Blob(
                            chunks,
                            {
                                type:
                                "audio/webm"
                            }
                        );

                    resolve(blob);

                    stream
                    .getTracks()
                    .forEach(
                        t =>
                        t.stop()
                    );
                };
        }
    );
}

let recordingActive = false

/**
 * Record audio from an existing MediaStream (e.g. WebRTC mic).
 * Does not open a new getUserMedia session. Skips if a recording is already active.
 */
export async function recordAudioFromStream(stream, duration = 5000) {
    if (recordingActive) {
        return null
    }

    const audioTracks = stream?.getAudioTracks?.() || []
    if (!audioTracks.length) {
        return null
    }

    recordingActive = true

    const audioStream = new MediaStream(audioTracks)
    const recorder = new MediaRecorder(audioStream)
    const chunks = []

    recorder.ondataavailable = (e) => chunks.push(e.data)

    try {
        recorder.start()

        const blob = await new Promise((resolve) => {
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' })
                resolve(blob)
            }
            setTimeout(() => {
                if (recorder.state !== 'inactive') {
                    recorder.stop()
                }
            }, duration)
        })

        return blob
    } finally {
        recordingActive = false
    }
}

/** Decode browser WebM/Opus clips to WAV for the Resemblyzer backend. */
export async function ensureWavBlob(blob) {
    if (!blob) throw new Error('No audio recorded')
    if (blob.type.includes('wav')) return blob

    const arrayBuffer = await blob.arrayBuffer()
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
        return encodeWavFromAudioBuffer(audioBuffer)
    } finally {
        await audioContext.close()
    }
}

function encodeWavFromAudioBuffer(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const bytesPerSample = 2
    const blockAlign = numChannels * bytesPerSample
    const dataLength = audioBuffer.length * blockAlign
    const buffer = new ArrayBuffer(44 + dataLength)
    const view = new DataView(buffer)

    const writeString = (offset, str) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i))
        }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + dataLength, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, dataLength, true)

    let offset = 44
    for (let i = 0; i < audioBuffer.length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(ch)[i]))
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
            offset += 2
        }
    }

    return new Blob([buffer], { type: 'audio/wav' })
}
