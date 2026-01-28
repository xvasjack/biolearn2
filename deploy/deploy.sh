#!/usr/bin/env bash
set -euo pipefail

# BioLearn deploy/update script
# Run from repo root: bash deploy/deploy.sh

APP_DIR="/opt/biolearn"
cd "$APP_DIR"

echo "=== Pulling latest code ==="
git pull

echo "=== Backend: installing dependencies ==="
cd "$APP_DIR/backend"
source venv/bin/activate
pip install -r requirements.txt
deactivate

echo "=== Frontend: building ==="
cd "$APP_DIR/frontend"
npm ci
npm run build

echo "=== Restarting services ==="
systemctl restart biolearn-backend biolearn-frontend

echo "=== Done ==="
systemctl status biolearn-backend biolearn-frontend --no-pager
