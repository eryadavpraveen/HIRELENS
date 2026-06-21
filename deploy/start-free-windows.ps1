# HIRELENS free-tier local stack (Windows): backend + attention + Cloudflare tunnel
$ErrorActionPreference = "Stop"
$Root = Split-Path $Parent -Parent $MyInvocation.MyCommand.Path
$VenvPython = Join-Path $Root "mediapipe_env\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
    Write-Error "Python venv not found at mediapipe_env. Create it and install backend/requirements.txt first."
}

Write-Host "Installing backend deps (websockets required for interview video)..." -ForegroundColor Cyan
& $VenvPython -m pip install -q -r (Join-Path $Root "backend\requirements.txt")

Write-Host "Stopping any process on port 8000 / 8001..." -ForegroundColor Cyan
Get-NetTCPConnection -LocalPort 8000,8001 -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

$deployDir = Join-Path $Root "deploy"
New-Item -ItemType Directory -Force -Path $deployDir | Out-Null

Write-Host "Starting attention service on :8001..." -ForegroundColor Green
Start-Process -FilePath $VenvPython -ArgumentList "-m","uvicorn","main:app","--host","0.0.0.0","--port","8001" `
    -WorkingDirectory (Join-Path $Root "attention_service") `
    -RedirectStandardOutput (Join-Path $deployDir "attention.log") `
    -RedirectStandardError (Join-Path $deployDir "attention-err.log")

Write-Host "Starting backend on :8000..." -ForegroundColor Green
Start-Process -FilePath $VenvPython -ArgumentList "-m","uvicorn","app.main:app","--host","0.0.0.0","--port","8000" `
    -WorkingDirectory (Join-Path $Root "backend") `
    -RedirectStandardOutput (Join-Path $deployDir "backend.log") `
    -RedirectStandardError (Join-Path $deployDir "backend-err.log")

Start-Sleep -Seconds 3
try {
    $health = Invoke-RestMethod "http://127.0.0.1:8000/" -TimeoutSec 5
    Write-Host "Backend OK: $($health.message)" -ForegroundColor Green
} catch {
    Write-Warning "Backend not responding yet — check deploy\backend-err.log"
}

if (Get-Command cloudflared -ErrorAction SilentlyContinue) {
    Write-Host "Starting Cloudflare tunnel for :8000 (copy URL into Vercel env vars)..." -ForegroundColor Green
    Start-Process cloudflared -ArgumentList "tunnel","--url","http://localhost:8000" `
        -RedirectStandardOutput (Join-Path $deployDir "tunnel-api.log") `
        -RedirectStandardError (Join-Path $deployDir "tunnel-api-err.log")
} else {
    Write-Warning "cloudflared not found — install it to expose backend to Vercel."
}

Write-Host ""
Write-Host "Done. If video still fails, run: deploy\test_ws.py (WebSocket must connect)." -ForegroundColor Yellow
Write-Host "Tunnel URL is in deploy\tunnel-api.log — update Vercel VITE_API_BASE_URL and VITE_WS_BASE_URL." -ForegroundColor Yellow
