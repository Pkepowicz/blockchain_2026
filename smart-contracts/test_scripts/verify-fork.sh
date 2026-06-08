#!/bin/bash
# Verify the forked Anvil node can read real Chainlink price feeds.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RPC_URL="http://127.0.0.1:8545"

if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

BTC_AGG="${CHAINLINK_BTC_USD:-0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43}"
ETH_AGG="${CHAINLINK_ETH_USD:-0x694AA1769357215DE4FAC081bf1f309aDC325306}"

if ! cast block-number --rpc-url "$RPC_URL" > /dev/null 2>&1; then
  echo "Error: Anvil is not running on $RPC_URL"
  exit 1
fi

echo "Checking Chainlink feeds on fork..."
echo ""

for LABEL_AGG in "BTC/USD:$BTC_AGG" "ETH/USD:$ETH_AGG"; do
  LABEL="${LABEL_AGG%%:*}"
  ADDR="${LABEL_AGG##*:}"

  ROUND_ID=$(cast call "$ADDR" "latestRoundData()(uint80,int256,uint256,uint256,uint80)" --rpc-url "$RPC_URL" 2>&1 | head -1)
  if [ $? -ne 0 ]; then
    echo "  $LABEL ($ADDR): FAILED"
    continue
  fi

  ANSWER=$(cast call "$ADDR" "latestRoundData()(uint80,int256,uint256,uint256,uint80)" --rpc-url "$RPC_URL" | awk 'NR==2 {print $1}')
  DECIMALS=$(cast call "$ADDR" "decimals()(uint8)" --rpc-url "$RPC_URL")

  echo "  $LABEL ($ADDR)"
  echo "    roundId:  $ROUND_ID"
  echo "    answer:   $ANSWER (raw)"
  echo "    decimals: $DECIMALS"
  echo ""
done

echo "Fork verification complete."
