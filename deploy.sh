#!/usr/bin/env bash
set -euo pipefail

VPS="root@72.62.252.76"
REMOTE_DIR="/opt/biolearn"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Deploying BioLearn to $VPS ==="

# 1. Sync backend app/ and requirements.txt
echo ">> Uploading backend files..."
scp -r "$LOCAL_DIR/backend/app" "$VPS:$REMOTE_DIR/backend/"
scp "$LOCAL_DIR/backend/requirements.txt" "$VPS:$REMOTE_DIR/backend/"

# 2. Sync frontend src/ and static/
echo ">> Uploading frontend files..."
scp -r "$LOCAL_DIR/frontend/src" "$VPS:$REMOTE_DIR/frontend/"
scp -r "$LOCAL_DIR/frontend/static" "$VPS:$REMOTE_DIR/frontend/"

# 3. Install any new backend deps
echo ">> Installing backend dependencies..."
ssh "$VPS" "cd $REMOTE_DIR/backend && venv/bin/pip install -r requirements.txt"

# 4. Build frontend
echo ">> Building frontend..."
ssh "$VPS" "cd $REMOTE_DIR/frontend && npm run build"

# 5. Restart services
echo ">> Restarting services..."
ssh "$VPS" "systemctl restart biolearn-backend biolearn-frontend"

echo "=== Deploy complete ==="
