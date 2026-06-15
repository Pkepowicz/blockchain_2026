#!/bin/bash
# Background resolver: mines blocks to keep Anvil time near wall clock, then
# resolves ended markets using the Anvil deployer key. No MetaMask popups.
#
# Uses evm_mine (not evm_increaseTime) so chain timestamps follow real time.
#
# Usage: bash test_scripts/watch-resolve.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RPC_URL="http://127.0.0.1:8545"
PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
POLL_SECONDS=10

# cast may print "1781558336 [1.781e9]" for large uints; bash needs plain integers.
cast_uint() {
  echo "$1" | awk '{print $1}'
}

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
echo "Mining a block each poll to sync chain time with wall clock (no evm_increaseTime)."
echo "Press Ctrl+C to stop."

while true; do
  # Mine an empty block so Anvil sets block.timestamp to current wall-clock time.
  cast rpc evm_mine --rpc-url "$RPC_URL" > /dev/null 2>&1 || true

  CHAIN_NOW=$(cast_uint "$(cast block latest --field timestamp --rpc-url "$RPC_URL")")
  COUNT=$(cast_uint "$(cast call "$PREDICTION_MARKET_ADDRESS" "nextMarketId()(uint256)" --rpc-url "$RPC_URL")")

  for ((i = 0; i < COUNT; i++)); do
    MARKET=$(cast call "$PREDICTION_MARKET_ADDRESS" \
      "markets(uint256)(address,address,int256,uint256,bool,bool,uint256,uint256,bool)" \
      "$i" --rpc-url "$RPC_URL")

    END_TIME=$(cast_uint "$(echo "$MARKET" | sed -n '4p')")
    RESOLVED=$(echo "$MARKET" | sed -n '5p' | tr -d '[:space:]')

    if [ "$RESOLVED" = "true" ]; then
      continue
    fi

    if [ "$CHAIN_NOW" -ge "$END_TIME" ]; then
      echo "[$(date +%H:%M:%S)] Resolving market #$i (chain=$CHAIN_NOW, end=$END_TIME)..."
      if cast send "$PREDICTION_MARKET_ADDRESS" "resolveMarket(uint256)" "$i" \
        --rpc-url "$RPC_URL" --private-key "$PK" > /dev/null 2>&1; then
        echo "  Market #$i resolved."
      else
        echo "  Market #$i resolve failed."
      fi
    fi
  done

  sleep "$POLL_SECONDS"
done
