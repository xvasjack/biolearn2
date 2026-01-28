#!/usr/bin/env bash
set -euo pipefail

# BioLearn VPS setup script — Ubuntu 22.04
# Run as root: bash deploy/setup-server.sh

echo "=== BioLearn Server Setup ==="

# System updates
apt-get update && apt-get upgrade -y

# Node.js 20 via nodesource
if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node $(node -v)"

# Python 3.11
apt-get install -y python3.11 python3.11-venv python3-pip

# Nginx & Certbot
apt-get install -y nginx certbot python3-certbot-nginx

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Create app directory
mkdir -p /opt/biolearn

echo "=== Setup complete ==="
echo "Next: clone repo into /opt/biolearn, then follow the deploy guide."
