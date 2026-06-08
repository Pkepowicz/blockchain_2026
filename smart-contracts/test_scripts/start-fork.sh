#!/bin/bash
# Start Anvil forked from Sepolia via Alchemy RPC.
# Usage: bash test_scripts/start-fork.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

if [ -z "$ALCHEMY_SEPOLIA_URL" ] || [ "$ALCHEMY_SEPOLIA_URL" = "https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY" ]; then
  echo "Error: Set ALCHEMY_SEPOLIA_URL in $ENV_FILE"
  echo "  Copy .env.example to .env and add your Alchemy API key."
  exit 1
fi

# Force chain ID 31337 so MetaMask matches the local Anvil network.
# Without this, a Sepolia fork reports chain ID 11155111 and transactions fail.
FORK_ARGS=(--fork-url "$ALCHEMY_SEPOLIA_URL" --chain-id 31337 --port 8545)

if [ -n "$FORK_BLOCK_NUMBER" ]; then
  FORK_ARGS+=(--fork-block-number "$FORK_BLOCK_NUMBER")
  echo "Forking Sepolia at block $FORK_BLOCK_NUMBER via Alchemy..."
else
  echo "Forking Sepolia (latest block) via Alchemy..."
fi

echo "Anvil will listen on http://127.0.0.1:8545 (chain ID 31337)"
exec anvil "${FORK_ARGS[@]}"
