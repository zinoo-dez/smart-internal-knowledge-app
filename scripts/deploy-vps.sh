#!/usr/bin/env bash
# ==============================================================================
# Production Server Hardening & Deployment Script (Ubuntu / Debian / Oracle Linux)
# Enforces: UFW Firewall, Docker Setup, Non-root isolation, SSL Bootstrapping
# ==============================================================================

set -euo pipefail

DOMAIN="${1:-}"

if [ -z "$DOMAIN" ]; then
  echo "Usage: sudo ./scripts/deploy-vps.sh <your-domain.com>"
  exit 1
fi

echo "=========================================================="
echo " Starting Production Hardening for: $DOMAIN"
echo "=========================================================="

# 1. Update OS packages
echo "[1/5] Updating system packages..."
apt-get update -y && apt-get upgrade -y
apt-get install -y ufw curl git ca-certificates gnupg lsb-release

# 2. Configure Hardened UFW Firewall (Never expose DB/Redis)
echo "[2/5] Hardening UFW Firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow ONLY SSH, HTTP, and HTTPS
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP ACME & Web'
ufw allow 443/tcp comment 'HTTPS Secure Web'

# Enable firewall
ufw --force enable
ufw status verbose

# 3. Ensure Docker & Docker Compose are installed
echo "[3/5] Verifying Docker environment..."
if ! command -v docker &> /dev/null; then
  echo "Installing Docker Engine..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# 4. Secure Environment File Permissions
echo "[4/5] Hardening environment secrets permissions..."
if [ -f ".env.production" ]; then
  chmod 600 .env.production
  echo "Applied chmod 600 to .env.production"
else
  echo "WARNING: .env.production not found. Please create it from .env.example with chmod 600"
fi

# 5. Bootstrap Certbot SSL Certificate
echo "[5/5] Provisioning SSL certificate for $DOMAIN..."
mkdir -p /var/www/certbot

docker compose -f docker-compose.prod.yml up -d nginx

docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "admin@$DOMAIN" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

echo "=========================================================="
echo " Deployment Environment Hardened Successfully!"
echo " Start services: docker compose -f docker-compose.prod.yml up -d --build"
echo "=========================================================="
