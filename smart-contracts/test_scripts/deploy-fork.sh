#!/bin/bash
# Deploy contracts to a forked Anvil node and save addresses to .env

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_ROOT="$PROJECT_ROOT/../frontend"
RPC_URL="http://127.0.0.1:8545"
PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
ENV_FILE="$PROJECT_ROOT/.env"
FRONTEND_ENV_FILE="$FRONTEND_ROOT/.env"

if ! cast block-number --rpc-url "$RPC_URL" > /dev/null 2>&1; then
  echo "Error: Anvil is not running on $RPC_URL"
  echo "  Start the fork first: bash test_scripts/start-fork.sh"
  exit 1
fi

echo "Deploying contracts to Sepolia fork..."
OUTPUT=$(cd "$PROJECT_ROOT" && forge script script/DeployFork.s.sol:DeployFork \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$PK" 2>&1)

echo "$OUTPUT"

TOKEN_ADDR=$(echo "$OUTPUT" | grep "BettingToken:" | awk '{print $2}')
MARKET_ADDR=$(echo "$OUTPUT" | grep "PredictionMarket:" | awk '{print $2}')

if [ -z "$TOKEN_ADDR" ] || [ -z "$MARKET_ADDR" ]; then
  echo "Error: Could not extract addresses from deploy output."
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

cat > "$ENV_FILE" <<EOF
ALCHEMY_SEPOLIA_URL=${ALCHEMY_SEPOLIA_URL:-}
CHAINLINK_BTC_USD=${CHAINLINK_BTC_USD:-0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43}
CHAINLINK_ETH_USD=${CHAINLINK_ETH_USD:-0x694AA1769357215DE4FAC081bf1f309aDC325306}
BETTING_TOKEN_ADDRESS=$TOKEN_ADDR
PREDICTION_MARKET_ADDRESS=$MARKET_ADDR
EOF

cat > "$FRONTEND_ENV_FILE" <<EOF
VITE_RPC_URL=$RPC_URL
VITE_CHAIN_ID=31337
VITE_CHAIN_NAME=Anvil Fork
VITE_BETTING_TOKEN_ADDRESS=$TOKEN_ADDR
VITE_PREDICTION_MARKET_ADDRESS=$MARKET_ADDR
EOF

echo ""
echo "Addresses saved to $ENV_FILE"
echo "  BETTING_TOKEN_ADDRESS=$TOKEN_ADDR"
echo "  PREDICTION_MARKET_ADDRESS=$MARKET_ADDR"
echo ""
echo "Frontend env saved to $FRONTEND_ENV_FILE"
