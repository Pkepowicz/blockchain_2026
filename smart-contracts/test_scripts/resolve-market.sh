#!/bin/bash
# Warp Anvil time forward, mine a block, then broadcast the resolve script.

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

# 1. Fast-forward Anvil time by 5 minutes (300 seconds)
echo "Warping Anvil time..."
cast rpc evm_increaseTime 300 --rpc-url "$RPC_URL"

# 2. Mine a new block to solidify the timestamp change
cast rpc evm_mine --rpc-url "$RPC_URL"

# 3. Run the broadcast script
echo "Resolving market..."
cd "$PROJECT_ROOT" && forge script script/ForceResolve.s.sol:ForceResolve \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
