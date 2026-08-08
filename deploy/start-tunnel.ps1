# Start Cloudflare Tunnel -> Main Express (127.0.0.1:8000 only).
# Does NOT expose Attention Express (:8001) or Python ML workers.
#
# Modes:
#   1) Quick tunnel (default): ephemeral https://*.trycloudflare.com
#   2) Named tunnel token: set CLOUDFLARE_TUNNEL_TOKEN (never commit the token)
#   3) Named tunnel config: set CLOUDFLARE_TUNNEL_CONFIG to a local config.yml path
#
# Usage:
#   .\deploy\start-tunnel.ps1
#   .\deploy\start-tunnel.ps1 -Detach
#   npm run tunnel   (from backend-node)

param(
    [switch]$Detach,
    [string]$Origin = "http://127.0.0.1:8000"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$DeployDir = Join-Path $Root "deploy"
$OutLog = Join-Path $DeployDir "tunnel-api.log"
$ErrLog = Join-Path $DeployDir "tunnel-api-err.log"

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Error "cloudflared not found on PATH. Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/  Or: winget install --id Cloudflare.cloudflared"
}

# Prefer IPv4 loopback - "localhost" can resolve to ::1 and fail if Node listens on IPv4 only.
if ($Origin -match '^https?://localhost(?::|/|$)') {
    $Origin = $Origin -replace '://localhost', '://127.0.0.1'
    Write-Host "Normalized tunnel origin to $Origin (IPv4 loopback)" -ForegroundColor Yellow
}

try {
    $probe = Invoke-WebRequest -Uri $Origin -UseBasicParsing -TimeoutSec 3
    Write-Host "Origin reachable: $Origin (HTTP $($probe.StatusCode))" -ForegroundColor Green
} catch {
    Write-Warning "Main Express may not be up yet at $Origin - start backend-node first (npm start)."
}

$token = $env:CLOUDFLARE_TUNNEL_TOKEN
$configPath = $env:CLOUDFLARE_TUNNEL_CONFIG
$cfArgs = @()

if ($token) {
    Write-Host "Starting NAMED tunnel via CLOUDFLARE_TUNNEL_TOKEN (dashboard origin should be $Origin)" -ForegroundColor Cyan
    $cfArgs = @("tunnel", "--no-autoupdate", "run", "--token", $token)
} elseif ($configPath) {
    if (-not (Test-Path $configPath)) {
        Write-Error "CLOUDFLARE_TUNNEL_CONFIG not found: $configPath"
    }
    Write-Host "Starting NAMED tunnel via config: $configPath" -ForegroundColor Cyan
    $cfArgs = @("tunnel", "--no-autoupdate", "--config", $configPath, "run")
} else {
    Write-Host "Starting QUICK tunnel -> $Origin (WebSocket supported by default)" -ForegroundColor Cyan
    Write-Host "Public URL will appear in deploy\tunnel-api-err.log (trycloudflare.com)." -ForegroundColor Yellow
    # Quick tunnels: ingress is the --url origin. WS upgrade works without extra flags.
    $cfArgs = @("tunnel", "--no-autoupdate", "--url", $Origin)
}

New-Item -ItemType Directory -Force -Path $DeployDir | Out-Null

if ($Detach) {
    Start-Process -FilePath "cloudflared" -ArgumentList $cfArgs `
        -RedirectStandardOutput $OutLog `
        -RedirectStandardError $ErrLog `
        -WindowStyle Hidden
    Write-Host "Tunnel started in background." -ForegroundColor Green
    Write-Host "Logs: $OutLog / $ErrLog"
    Write-Host "Wait a few seconds, then search tunnel-api-err.log for https://*.trycloudflare.com"
} else {
    Write-Host "Press Ctrl+C to stop the tunnel." -ForegroundColor Yellow
    & cloudflared @cfArgs
}
