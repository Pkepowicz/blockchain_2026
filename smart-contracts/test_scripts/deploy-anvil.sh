#!/bin/bash
# Deploy contracts to local Anvil and save addresses to .env

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RPC_URL="http://127.0.0.1:8545"
PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
ENV_FILE="$PROJECT_ROOT/.env"

echo "Deploying contracts..."
OUTPUT=$(cd "$PROJECT_ROOT" && forge script script/DeployAnvil.s.sol:DeployAnvil \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$PK" 2>&1)

echo "$OUTPUT"

# Extract addresses from forge output
TOKEN_ADDR=$(echo "$OUTPUT" | grep "BettingToken:" | awk '{print $2}')
MARKET_ADDR=$(echo "$OUTPUT" | grep "PredictionMarket:" | awk '{print $2}')

if [ -z "$TOKEN_ADDR" ] || [ -z "$MARKET_ADDR" ]; then
  echo "Error: Could not extract addresses from deploy output."
  exit 1
fi

# Write .env file to project root
cat > "$ENV_FILE" <<EOF
BETTING_TOKEN_ADDRESS=$TOKEN_ADDR
PREDICTION_MARKET_ADDRESS=$MARKET_ADDR
EOF

echo ""
echo "Addresses saved to $ENV_FILE"
echo "  BETTING_TOKEN_ADDRESS=$TOKEN_ADDR"
echo "  PREDICTION_MARKET_ADDRESS=$MARKET_ADDR"
