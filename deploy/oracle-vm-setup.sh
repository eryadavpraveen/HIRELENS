#!/usr/bin/env bash
# Oracle Cloud Always Free VM — one-time setup (Ubuntu 22.04/24.04).
# Run on the VM after cloning the repo to /opt/hirelens
#
# Usage:
#   sudo bash deploy/oracle-vm-setup.sh
#
# Prerequisites:
#   - backend/.env with DATABASE_URL, SECRET_KEY, FRONTEND_URL=https://your-vercel-url
#   - Ports 80/443 open in Oracle security list + Ubuntu firewall

set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/hirelens}"
DOMAIN="${DOMAIN:-}"  # optional: your-domain.com

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx git

python3 -m venv "$APP_ROOT/venv"
"$APP_ROOT/venv/bin/pip" install --upgrade pip

# Backend (heavy ML stack)
"$APP_ROOT/venv/bin/pip" install -r "$APP_ROOT/backend/requirements.txt"

# Attention service
"$APP_ROOT/venv/bin/pip" install -r "$APP_ROOT/attention_service/requirements.txt"

# Migrations
cd "$APP_ROOT/backend"
set -a
source "$APP_ROOT/backend/.env"
set +a
"$APP_ROOT/venv/bin/python" scripts/apply_migrations.py

# systemd units
cp "$APP_ROOT/deploy/systemd/hirelens-backend.service" /etc/systemd/system/
cp "$APP_ROOT/deploy/systemd/hirelens-attention.service" /etc/systemd/system/
sed -i "s|/opt/hirelens|$APP_ROOT|g" /etc/systemd/system/hirelens-*.service

systemctl daemon-reload
systemctl enable hirelens-backend hirelens-attention
systemctl restart hirelens-backend hirelens-attention

# Nginx reverse proxy
cp "$APP_ROOT/deploy/nginx-hirelens.conf" /etc/nginx/sites-available/hirelens
ln -sf /etc/nginx/sites-available/hirelens /etc/nginx/sites-enabled/hirelens
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

if [[ -n "$DOMAIN" ]]; then
  certbot --nginx -d "$DOMAIN" -d "api.$DOMAIN" -d "attention.$DOMAIN" --non-interactive --agree-tos -m admin@"$DOMAIN" || true
fi

echo "Done. Backend :8000, Attention :8001 (via nginx if DOMAIN set)."
echo "Point Vercel env to https://api.$DOMAIN and https://attention.$DOMAIN"
