#!/bin/bash
# BUSTED! Deployment Script
# Run this script from Apps/Busted/app directory

set -e

# Configuration
SERVER_USER="root"
SERVER_IP="${HETZNER_SERVER_IP:-YOUR_SERVER_IP}"
DEPLOY_PATH="/var/www/busted.exkatibur.de"
APP_DIR="$(dirname "$0")/../app"

echo "🎮 BUSTED! Deployment Script"
echo "============================="

# Check if we're in the right directory
if [ ! -f "$APP_DIR/package.json" ]; then
    echo "❌ Error: package.json not found. Run from Apps/Busted directory."
    exit 1
fi

cd "$APP_DIR"

# Step 1: Install dependencies
echo ""
echo "📦 Step 1: Installing dependencies..."
npm install

# Step 2: Build web export
echo ""
echo "🔨 Step 2: Building web export..."
npx expo export --platform web

# Check if dist exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found after build"
    exit 1
fi

echo "✅ Build complete! Files in dist/"

# Step 3: Deploy to server
echo ""
echo "🚀 Step 3: Deploying to Hetzner..."

if [ "$SERVER_IP" = "YOUR_SERVER_IP" ]; then
    echo "⚠️  Server IP not configured!"
    echo ""
    echo "To deploy, set HETZNER_SERVER_IP environment variable:"
    echo "  export HETZNER_SERVER_IP=your.server.ip"
    echo ""
    echo "Or deploy manually:"
    echo "  scp -r dist/* root@YOUR_SERVER:/var/www/busted.exkatibur.de/"
    exit 0
fi

# Create directory on server if it doesn't exist
ssh $SERVER_USER@$SERVER_IP "mkdir -p $DEPLOY_PATH"

# Upload files
rsync -avz --delete dist/ $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app is live at: https://busted.exkatibur.de"
echo ""
echo "📋 Don't forget to:"
echo "   1. Add DNS A record: busted.exkatibur.de → $SERVER_IP"
echo "   2. Copy Caddyfile to server and reload Caddy"
