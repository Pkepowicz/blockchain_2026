# Prediction Market DApp

A decentralized prediction market built on Ethereum. Users bet YES or NO on whether a Chainlink price feed will be above or below a strike price at a given time.

## Tech Stack

- **Smart Contracts**: Solidity, Foundry, OpenZeppelin, Chainlink
- **Frontend**: React, TypeScript, Vite, ethers.js
- **Demo Infrastructure**: Anvil fork of Sepolia via Alchemy Node API
- **Testing**: Foundry (unit tests), manual integration scripts

## Project Structure

```
blockchain_2026/
├── smart-contracts/
│   ├── src/
│   │   ├── Token/BettingToken.sol
│   │   ├── Market/PredictionMarket.sol
│   │   └── mocks/MockV3Aggregator.sol
│   ├── script/
│   │   ├── DeployAnvil.s.sol      # blank Anvil + mock oracle
│   │   ├── DeployFork.s.sol       # Sepolia fork + real Chainlink
│   │   └── ForceResolve.s.sol
│   ├── test_scripts/
│   │   ├── start-fork.sh
│   │   ├── deploy-fork.sh
│   │   ├── verify-fork.sh
│   │   ├── deploy-anvil.sh
│   │   ├── seed-pool.sh
│   │   └── resolve-market.sh
│   └── .env.example
├── frontend/
│   ├── src/
│   └── .env.example
├── docs/ORACLE_PROBLEM.md
└── README.md
```

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`, `anvil`)
- [Node.js](https://nodejs.org/) (v18+) and npm
- [Alchemy](https://dashboard.alchemy.com/) account (free tier) for the fork demo
- MetaMask or compatible Web3 wallet

## Setup

### Smart Contracts

```bash
cd smart-contracts
forge install
forge build
forge test
```

### Frontend

```bash
cd frontend
npm install
```

### Alchemy Configuration

```bash
cd smart-contracts
cp .env.example .env
# Edit .env and set ALCHEMY_SEPOLIA_URL to your Sepolia RPC URL
```

---

## Demo: Sepolia Fork with Real Chainlink Prices (Recommended)

This demo uses Anvil forked from Sepolia via Alchemy. Your contracts run locally, but Chainlink BTC/USD and ETH/USD aggregators return **real live prices** from Sepolia.

### How Anvil Fork Works

```
MetaMask / Frontend  →  Anvil (localhost:8545)
                              │
                              │  on cache miss
                              ▼
                         Alchemy RPC  →  Sepolia (Chainlink contracts)
```

- Anvil runs locally with chain ID **31337** and free test ETH. The fork script passes `--chain-id 31337` explicitly — without it, Anvil would inherit Sepolia's chain ID (11155111) and MetaMask transactions would fail.
- Existing Sepolia contracts (Chainlink aggregators) are available at their Sepolia addresses.
- When your contract or the UI calls `latestRoundData()`, Anvil fetches the real state from Sepolia through Alchemy and caches it locally.
- You keep Anvil's developer tools: time warp, instant redeploy, no Sepolia ETH required.

### Step 1 — Start the Fork (Terminal 1)

```bash
cd smart-contracts
bash test_scripts/start-fork.sh
```

### Step 2 — Verify Chainlink Feeds (Terminal 2, optional)

```bash
bash test_scripts/verify-fork.sh
```

Expect valid `roundId` and price answers for BTC/USD and ETH/USD.

### Step 3 — Deploy Contracts

```bash
bash test_scripts/deploy-fork.sh
```

Deploys `BettingToken` and `PredictionMarket`, creates two markets (BTC/USD and ETH/USD) with strike prices derived from live oracle data. Writes addresses to `smart-contracts/.env` and `frontend/.env`.

### Step 4 — Start Frontend (Terminal 3)

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

### Step 5 — Configure MetaMask

| Field | Value |
|---|---|
| Network name | Anvil Fork |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency | ETH |

Import the default Anvil account (pre-funded on the fork):

```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### Step 6 — Demo Flow

1. Connect wallet → mint BETT tokens → place YES/NO bets
2. Resolve markets after end time:

```bash
cd smart-contracts
bash test_scripts/resolve-market.sh
```

3. Claim winnings in the Portfolio section

---

## Chainlink Integration

### Sepolia Aggregators

| Pair | Address | Decimals |
|---|---|---|
| BTC/USD | `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43` | 8 |
| ETH/USD | `0x694AA1769357215DE4FAC081bf1f309aDC325306` | 8 |

Verify current addresses on the [Chainlink docs](https://docs.chain.link/data-feeds/price-feeds/addresses).

### Price Format

Chainlink USD feeds use **8 decimals**. A raw answer of `3030914000000` means **$30,309.14**. Strike prices in `createMarket()` must use the same scale.

The frontend reads `decimals()` from each aggregator rather than assuming 18 decimals.

### Resolution Logic

Markets **close** at `endTime` (no more bets). They **resolve** when `resolveMarket()` runs in a transaction.

**Resolving markets (pick one approach):**

1. **Background watcher (recommended for demos)** — no MetaMask popups:
   ```bash
   bash test_scripts/watch-resolve.sh
   ```
   Polls the fork every 10s and resolves ended markets with the Anvil deployer key. The UI picks up changes on its 15s refresh cycle (or when you click **Refresh**).

2. **Manual button** — click **Resolve ended** in the Markets panel when you are ready. This uses your connected MetaMask wallet (one confirmation per market).

When `resolveMarket(marketId)` executes:

1. Contract calls `latestRoundData()` on the market's Chainlink aggregator
2. Validates `roundId`, timestamps, and data freshness
3. Sets `yesWins = (price > strikePrice)`
4. Winners call `claimWinnings()` for a proportional payout

**Which price wins?** The Chainlink `answer` returned at **resolution time** (when the transaction is mined), not the price at bet end time. If a market ends at 14:00 but someone resolves at 14:30, the 14:30 oracle price decides the outcome. On the fork, that read goes through Anvil to the real Sepolia Chainlink contract via Alchemy.

See [docs/ORACLE_PROBLEM.md](docs/ORACLE_PROBLEM.md) for a discussion of centralized vs decentralized oracles.

---

## Local Testing (Mock Oracle)

For unit tests and offline development without Alchemy, use a blank Anvil node with `MockV3Aggregator`:

```bash
anvil --port 8545
bash test_scripts/deploy-anvil.sh
bash test_scripts/seed-pool.sh
bash test_scripts/resolve-market.sh
```

This uses 18-decimal mock prices. The fork demo path uses real 8-decimal Chainlink feeds.

### Unit Tests

```bash
cd smart-contracts
forge test
```

Runs 31 tests covering token, oracle, and market logic.

---

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
