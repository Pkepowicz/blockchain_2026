#!/bin/bash
# Background resolver: polls the fork and resolves ended markets using the
# Anvil deployer key. No MetaMask popups — run this in a terminal during demos.
#
# Usage: bash test_scripts/watch-resolve.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RPC_URL="http://127.0.0.1:8545"
PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
POLL_SECONDS=10

if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

if [ -z "$PREDICTION_MARKET_ADDRESS" ]; then
  echo "Error: PREDICTION_MARKET_ADDRESS not set. Run deploy-fork.sh first."
  exit 1
fi

if ! cast block-number --rpc-url "$RPC_URL" > /dev/null 2>&1; then
  echo "Error: Anvil is not running on $RPC_URL"
  exit 1
fi

echo "Watching for ended markets on $PREDICTION_MARKET_ADDRESS (every ${POLL_SECONDS}s)..."
echo "Press Ctrl+C to stop."

while true; do
  CHAIN_NOW=$(cast block latest --field timestamp --rpc-url "$RPC_URL")
  COUNT=$(cast call "$PREDICTION_MARKET_ADDRESS" "nextMarketId()(uint256)" --rpc-url "$RPC_URL")

  for ((i = 0; i < COUNT; i++)); do
    MARKET=$(cast call "$PREDICTION_MARKET_ADDRESS" \
      "markets(uint256)(address,int256,uint256,bool,bool,uint256,uint256)" \
      "$i" --rpc-url "$RPC_URL")

    END_TIME=$(echo "$MARKET" | sed -n '3p')
    RESOLVED=$(echo "$MARKET" | sed -n '4p')

    if [ "$RESOLVED" = "true" ]; then
      continue
    fi

    if [ "$CHAIN_NOW" -ge "$END_TIME" ]; then
      echo "[$(date +%H:%M:%S)] Resolving market #$i..."
      if cast send "$PREDICTION_MARKET_ADDRESS" "resolveMarket(uint256)" "$i" \
        --rpc-url "$RPC_URL" --private-key "$PK" > /dev/null 2>&1; then
        echo "  Market #$i resolved."
      else
        echo "  Market #$i resolve failed (chain time may need to advance)."
      fi
    fi
  done

  sleep "$POLL_SECONDS"
done
