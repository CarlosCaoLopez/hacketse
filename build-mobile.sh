#!/bin/bash

# HackETSE - Mobile Build Script
# Builds the Android APK for peer node deployment

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     HackETSE Mobile APK Builder           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Get local IP
echo -e "${BLUE}[Network]${NC} Detecting local IP address..."
LOCAL_IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1 | head -1)

if [ -z "$LOCAL_IP" ]; then
  echo -e "${RED}✗${NC} Could not detect local IP address!"
  echo -e "${YELLOW}  Please manually set it in peer-node/src/config.ts${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Local IP detected: ${GREEN}$LOCAL_IP${NC}"
echo -e "${YELLOW}  Make sure mobile devices connect to: ws://$LOCAL_IP:3000${NC}"
echo ""

# Step 1: Install dependencies
echo -e "${BLUE}[Dependencies]${NC} Installing peer-node dependencies..."
cd "$PROJECT_DIR/peer-node"

if [ ! -d "node_modules" ]; then
  npm install
  echo -e "${GREEN}✓${NC} Dependencies installed"
else
  echo -e "${GREEN}✓${NC} Dependencies already installed"
fi
echo ""

# Step 2: Build TypeScript
echo -e "${BLUE}[Build]${NC} Compiling TypeScript..."
npm run build

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} TypeScript compiled successfully"
else
  echo -e "${RED}✗${NC} TypeScript compilation failed!"
  exit 1
fi
echo ""

# Step 3: Sync with Capacitor
echo -e "${BLUE}[Capacitor]${NC} Syncing web assets to Android..."
npx cap sync

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} Web assets synced to Android project"
else
  echo -e "${RED}✗${NC} Capacitor sync failed!"
  exit 1
fi
echo ""

# Step 4: Build APK
echo -e "${BLUE}[Android]${NC} Building APK (this may take 3-5 minutes)..."
echo -e "${YELLOW}  First build downloads Gradle dependencies...${NC}"
cd "$PROJECT_DIR/peer-node/android"

./gradlew assembleDebug

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} APK built successfully!"
else
  echo -e "${RED}✗${NC} Gradle build failed!"
  exit 1
fi
echo ""

# Step 5: Locate APK
APK_PATH="$PROJECT_DIR/peer-node/android/app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$APK_PATH" ]; then
  APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
  echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║          APK Build Successful! 🎉         ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${BLUE}APK Location:${NC}"
  echo -e "  📦 $APK_PATH"
  echo -e "  📊 Size: ${GREEN}$APK_SIZE${NC}"
  echo ""
  echo -e "${BLUE}Next Steps:${NC}"
  echo ""
  echo -e "${YELLOW}1. Install on device via USB:${NC}"
  echo -e "   adb install -r $APK_PATH"
  echo ""
  echo -e "${YELLOW}2. Or share the APK:${NC}"
  echo -e "   - Copy to Google Drive / Dropbox"
  echo -e "   - Send via WhatsApp / Telegram"
  echo -e "   - Transfer via USB as file"
  echo ""
  echo -e "${YELLOW}3. Configure on mobile device:${NC}"
  echo -e "   - Open 'P2P Node' app"
  echo -e "   - Enter server: ${GREEN}ws://$LOCAL_IP:3000${NC}"
  echo -e "   - Tap 'Conectar'"
  echo ""
  echo -e "${YELLOW}4. Start signaling server:${NC}"
  echo -e "   cd signaling-server && npm run dev"
  echo ""
  echo -e "${GREEN}Full instructions: MOBILE-SETUP.md${NC}"
else
  echo -e "${RED}✗${NC} APK file not found at expected location!"
  echo -e "${YELLOW}  Expected: $APK_PATH${NC}"
  exit 1
fi
