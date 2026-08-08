# Cloudflare Tunnel → Main Express (HIRELENS)

Expose only the **Main Express** API + WebSocket signaling to the internet. Attention Express and Python ML workers stay on localhost.

```text
Internet
   ↓
Cloudflare Tunnel  (https://… / wss://…)
   ↓
Main Express  http://127.0.0.1:8000
   ↓ (local only)
Attention Express  http://127.0.0.1:8001
   ↓
Python Vision / Attention workers (spawned by Express; never tunneled)
```

## What was used before

The free Windows stack ran a **quick tunnel**:

```text
cloudflared tunnel --url http://localhost:8000
```

That pointed at whatever process listened on `:8000` (previously the API on that port). Historical demo host from logs:

`https://toe-greatly-jeans-collectibles.trycloudflare.com`

Quick-tunnel hostnames are **ephemeral** — they change when `cloudflared` restarts. There is no checked-in named-tunnel credential file under `~/.cloudflared` in this environment.

## Origin (new Express stack)

Always use IPv4 loopback (avoids `localhost` → `::1` failures on Windows):

```text
http://127.0.0.1:8000
```

Do **not** tunnel:

- `http://127.0.0.1:8001` (Attention Express)
- Python worker processes / ports

Main Express must keep:

```env
ATTENTION_SERVICE_URL=http://127.0.0.1:8001
```

## Install cloudflared

1. Download: [Cloudflare Tunnel downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
2. Or Windows: `winget install --id Cloudflare.cloudflared`
3. Verify: `cloudflared --version`

## Login / authentication

### Quick tunnel (default local demo)

No login required. Cloudflare issues a temporary `*.trycloudflare.com` URL.

### Named tunnel (stable hostname — optional)

1. Create a tunnel in [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → Networks → Tunnels.
2. Set the public hostname’s service/origin to `http://127.0.0.1:8000`.
3. Prefer a **tunnel token** via environment variable (do not commit tokens):

```powershell
$env:CLOUDFLARE_TUNNEL_TOKEN = "<token from dashboard>"
.\deploy\start-tunnel.ps1
```

Or use a local config file (see `deploy/cloudflare/config.example.yml`):

```powershell
$env:CLOUDFLARE_TUNNEL_CONFIG = "C:\secure\path\config.yml"
.\deploy\start-tunnel.ps1
```

## Start order

```powershell
# 1) Attention Express (local only) — spawns Attention Worker
cd D:\Desktop\HIRELENS\attention-node
npm start

# 2) Main Express — spawns Vision Worker; proxies /attention and /voice
cd D:\Desktop\HIRELENS\backend-node
npm start

# 3) Tunnel → Main Express only
cd D:\Desktop\HIRELENS\backend-node
npm run tunnel
# or:  .\deploy\start-tunnel.ps1
# or:  cloudflared tunnel --url http://127.0.0.1:8000
```

Background tunnel:

```powershell
.\deploy\start-tunnel.ps1 -Detach
```

## Frontend environment

After the quick tunnel prints a URL (or from `deploy/tunnel-api-err.log`):

```env
VITE_API_BASE_URL=https://<tunnel-domain>
VITE_WS_BASE_URL=wss://<tunnel-domain>
VITE_USE_MOCK=false
```

Paths (unchanged):

- REST: `/auth/*`, `/interviews/*`, `/attention/analyze`, `/voice/*`, …
- WebSocket: `/ws/interview/{id}?role=recruiter|student`

Do **not** point the frontend at Attention Express or workers.

## WebSocket support

Cloudflare Tunnel supports WebSocket upgrades to an HTTP origin by default. No extra `cloudflared` flag is required for quick tunnels.

Requirements on our side:

- Tunnel origin = Main Express (`127.0.0.1:8000`)
- Frontend uses `wss://` when API is `https://`
- CORS allows the Vercel (or local) frontend origin (`backend-node` already allows `*.trycloudflare.com` and `*.vercel.app` via default regex)

## Validate

With Main + Attention + tunnel running:

```powershell
node deploy/validate-tunnel.mjs
```

Or manually:

```powershell
Invoke-RestMethod https://<tunnel-domain>/
# WebSocket path is covered by validate-tunnel.mjs
```

## Scripts

| Script | Purpose |
|---|---|
| `deploy/start-tunnel.ps1` | Start quick/named tunnel → `:8000` |
| `deploy/start-tunnel.bat` | Windows wrapper |
| `backend-node` → `npm run tunnel` | Same as start-tunnel.ps1 |
| `deploy/validate-tunnel.mjs` | REST + WS + local Attention/worker checks |
| `deploy/cloudflare/config.example.yml` | Optional named-tunnel config template |

## Limitations

- Quick-tunnel URLs change on every restart — update Vercel/`frontend/.env` each time.
- Named tunnels need Cloudflare account + token/config; not created automatically here.
- ML cold start can make the first proxied `/attention` or `/cv` call slow through the tunnel.
- WebRTC media still uses peer connections / TURN; only **signaling** goes through this tunnel.
