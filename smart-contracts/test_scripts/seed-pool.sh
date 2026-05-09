#!/bin/bash
# Seed the NO pool using Anvil account #1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RPC_URL="http://127.0.0.1:8545"

# Load deployed addresses from project root
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
else
  echo "Error: .env not found in $PROJECT_ROOT. Run deploy-anvil.sh first."
  exit 1
fi

echo "Seeding NO pool..."
cd "$PROJECT_ROOT" && forge script script/SeedPool.s.sol:SeedPool \
  --rpc-url "$RPC_URL" \
  --broadcast
