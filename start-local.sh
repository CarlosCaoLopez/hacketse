#!/bin/bash

# HackETSE Local Development Launcher
# Starts signaling server, 2 peer nodes, and task coordinator

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
SIGNALING_PORT="${PORT:-3000}"
BROWSER_DELAY=5  # seconds to wait before opening browsers

# Process tracking
declare -a PIDS=()

# Banner
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     HackETSE Local Development Setup      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Cleanup function
cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping all processes...${NC}"
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      echo -e "${GREEN}✓${NC} Stopped process $pid"
    fi
  done
  wait 2>/dev/null
  echo -e "${GREEN}All processes stopped. Goodbye!${NC}"
  exit 0
}

# Trap on exit
trap cleanup EXIT INT TERM

# Create logs directory
mkdir -p "$LOG_DIR"
echo -e "${GREEN}✓${NC} Created logs directory: $LOG_DIR"

# Check if port is available
if lsof -Pi :$SIGNALING_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${RED}✗${NC} Port $SIGNALING_PORT is already in use!"
  echo -e "${YELLOW}  Please stop the process using this port or set a different PORT environment variable${NC}"
  exit 1
fi

# Function to install dependencies if needed
install_deps() {
  local component=$1
  local dir=$2

  echo -e "${BLUE}[${component}]${NC} Checking dependencies..."
  cd "$dir"

  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  Installing dependencies...${NC}"
    npm install > "$LOG_DIR/${component}-install.log" 2>&1
    echo -e "${GREEN}✓${NC} Dependencies installed"
  else
    echo -e "${GREEN}✓${NC} Dependencies already installed"
  fi
}

# Install dependencies for all components
echo ""
echo -e "${BLUE}════ Installing Dependencies ════${NC}"
install_deps "signaling-server" "$PROJECT_DIR/signaling-server"
install_deps "peer-node" "$PROJECT_DIR/peer-node"
install_deps "task-coordinator" "$PROJECT_DIR/task-coordinator"

# Start signaling server
echo ""
echo -e "${BLUE}════ Starting Services ════${NC}"
echo -e "${BLUE}[Signaling Server]${NC} Starting on port $SIGNALING_PORT..."
cd "$PROJECT_DIR/signaling-server"
npm run dev > "$LOG_DIR/signaling-server.log" 2>&1 &
SIGNALING_PID=$!
PIDS+=($SIGNALING_PID)
echo -e "${GREEN}✓${NC} Signaling server started (PID: $SIGNALING_PID)"

# Wait for signaling server to start
echo -e "${YELLOW}  Waiting for signaling server to initialize...${NC}"
sleep 3

# Check if signaling server is running
if ! kill -0 $SIGNALING_PID 2>/dev/null; then
  echo -e "${RED}✗${NC} Signaling server failed to start!"
  echo -e "${YELLOW}  Check logs at: $LOG_DIR/signaling-server.log${NC}"
  exit 1
fi

# Build and start peer node compilation
echo ""
echo -e "${BLUE}[Peer Node]${NC} Building TypeScript..."
cd "$PROJECT_DIR/peer-node"
npm run build > "$LOG_DIR/peer-node-build.log" 2>&1
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} Peer node compiled successfully"
else
  echo -e "${RED}✗${NC} Peer node build failed!"
  echo -e "${YELLOW}  Check logs at: $LOG_DIR/peer-node-build.log${NC}"
  exit 1
fi

# Start watch mode for peer node
echo -e "${BLUE}[Peer Node]${NC} Starting watch mode..."
npm run watch > "$LOG_DIR/peer-node-watch.log" 2>&1 &
PEER_WATCH_PID=$!
PIDS+=($PEER_WATCH_PID)
echo -e "${GREEN}✓${NC} Peer node watch mode started (PID: $PEER_WATCH_PID)"

# Build and start task coordinator compilation
echo ""
echo -e "${BLUE}[Task Coordinator]${NC} Building TypeScript..."
cd "$PROJECT_DIR/task-coordinator"
npm run build > "$LOG_DIR/coordinator-build.log" 2>&1
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} Task coordinator compiled successfully"
else
  echo -e "${RED}✗${NC} Task coordinator build failed!"
  echo -e "${YELLOW}  Check logs at: $LOG_DIR/coordinator-build.log${NC}"
  exit 1
fi

# Start watch mode for coordinator
echo -e "${BLUE}[Task Coordinator]${NC} Starting watch mode..."
npm run watch > "$LOG_DIR/coordinator-watch.log" 2>&1 &
COORD_WATCH_PID=$!
PIDS+=($COORD_WATCH_PID)
echo -e "${GREEN}✓${NC} Task coordinator watch mode started (PID: $COORD_WATCH_PID)"

# Wait before opening browsers
echo ""
echo -e "${YELLOW}Waiting ${BROWSER_DELAY}s before opening browsers...${NC}"
sleep "$BROWSER_DELAY"

# Open browsers
echo ""
echo -e "${BLUE}════ Opening Browsers ════${NC}"

# Check if xdg-open is available
if ! command -v xdg-open &> /dev/null; then
  echo -e "${RED}✗${NC} xdg-open not found!"
  echo -e "${YELLOW}  Please manually open these URLs in your browser:${NC}"
  echo -e "  - Peer Node 1: file://$PROJECT_DIR/peer-node/www/index.html"
  echo -e "  - Peer Node 2: file://$PROJECT_DIR/peer-node/www/index.html"
  echo -e "  - Task Coordinator: file://$PROJECT_DIR/task-coordinator/www/index.html"
else
  echo -e "${BLUE}[Browser]${NC} Opening Peer Node 1..."
  xdg-open "file://$PROJECT_DIR/peer-node/www/index.html" 2>/dev/null &
  sleep 1

  echo -e "${BLUE}[Browser]${NC} Opening Peer Node 2..."
  xdg-open "file://$PROJECT_DIR/peer-node/www/index.html" 2>/dev/null &
  sleep 1

  echo -e "${BLUE}[Browser]${NC} Opening Task Coordinator..."
  xdg-open "file://$PROJECT_DIR/task-coordinator/www/index.html" 2>/dev/null &

  echo -e "${GREEN}✓${NC} Browsers opened"
fi

# Display status
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  HackETSE Infrastructure Started! 🚀      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  📡 Signaling Server: ${GREEN}http://localhost:$SIGNALING_PORT${NC}"
echo -e "  🖥️  Peer Node 1:      ${GREEN}file://$PROJECT_DIR/peer-node/www/index.html${NC}"
echo -e "  🖥️  Peer Node 2:      ${GREEN}file://$PROJECT_DIR/peer-node/www/index.html${NC}"
echo -e "  🎛️  Task Coordinator: ${GREEN}file://$PROJECT_DIR/task-coordinator/www/index.html${NC}"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo -e "  📄 $LOG_DIR/"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for all background processes
wait
