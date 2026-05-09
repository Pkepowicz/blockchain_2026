# Prediction Market DApp

A decentralized prediction market built on Ethereum. Users can bet YES or NO on whether a Chainlink price feed will be above or below a strike price at a given time.

## Tech Stack

- **Smart Contracts**: Solidity, Foundry, OpenZeppelin, Chainlink
- **Frontend**: React, TypeScript, Vite, ethers.js
- **Testing**: Foundry (unit tests), manual integration scripts

## Project Structure

```
prediction-market/
├── smart-contracts/
│   ├── src/                    # Solidity contracts
│   │   ├── Token/BettingToken.sol
│   │   ├── Market/PredictionMarket.sol
│   │   └── mocks/MockV3Aggregator.sol
│   ├── script/                 # Foundry deployment scripts
│   ├── test/                   # Foundry unit tests
│   ├── test_scripts/           # Manual integration test scripts
│   │   ├── deploy-anvil.sh
│   │   ├── seed-pool.sh
│   │   └── resolve-market.sh
│   ├── lib/                    # Dependencies (git submodules)
│   ├── foundry.toml
│   └── remappings.txt
├── frontend/
│   ├── src/                    # React components
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`, `anvil`)
- [Node.js](https://nodejs.org/) (v18+) and npm

## Setup

### Smart Contracts

```bash
cd smart-contracts

# Install dependencies
forge install

# Compile
forge build

# Run unit tests
forge test
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

## Testing

### Unit Tests

```bash
cd smart-contracts
forge test
```

Runs 31 tests covering token, oracle, and market logic.

### Manual Integration Test

Walk through the full dApp flow on a local Anvil node.

**Step 1 — Start Anvil**

```bash
anvil --port 8545
```

**Step 2 — Deploy Contracts**

In a new terminal:

```bash
cd smart-contracts
bash test_scripts/deploy-anvil.sh
```

Deploys `BettingToken`, `MockV3Aggregator`, and `PredictionMarket`. Saves addresses to `.env`.

**Step 3 — Seed the NO Pool**

```bash
bash test_scripts/seed-pool.sh
```

Places a 100 BETT bet on the NO outcome using Anvil account #1.

**Step 4 — Resolve the Market**

```bash
bash test_scripts/resolve-market.sh
```

Warps Anvil time forward, mines a block, then broadcasts `resolveMarket()`. The market resolves with YES winning (price 50,000 > strike 45,000).

**Step 5 — Verify**

```bash
cast call <PREDICTION_MARKET_ADDRESS> \
  "getMarket(uint256)(address,int256,uint256,bool,bool,uint256,uint256)" \
  0 --rpc-url http://127.0.0.1:8545
```

Expected: `resolved = true`, `yesWins = true`, `noPool = 100 BETT`.

## How It Works

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  BettingToken│────▶│ PredictionMarket │◀────│   User       │
│  (ERC20)     │     │                  │     │              │
└──────────────┘     └────────┬─────────┘     └──────────────┘
                              │
                              │ resolveMarket()
                              ▼
                     ┌──────────────────┐
                     │  Chainlink Price │
                     │  Feed (oracle)   │
                     └──────────────────┘
```

1. Owner creates a market with a Chainlink aggregator, strike price, and duration
2. Users mint BETT tokens, approve the market, and place YES or NO bets
3. After the market ends, anyone calls `resolveMarket()` — the contract reads the Chainlink price and determines the winner
4. Winners call `claimWinnings()` to receive their proportional share of the losing pool

## Contract Addresses (Local)

Generated at runtime by `deploy-anvil.sh` and saved to `smart-contracts/.env`.
