# The Oracle Problem

Smart contracts can only access data that already exists on the blockchain. They cannot fetch stock prices, weather reports, or sports scores on their own. Any real-world fact a contract needs must be brought on-chain by an **oracle**.

This creates a fundamental tension: blockchains are designed to be trustless, but most useful applications depend on off-chain information that must be trusted at some point.

## Centralized Oracles

The simplest approach is a single trusted party that publishes data on-chain. A server watches BTC/USD on exchanges, then a private key signs and submits the price to a contract.

**Advantages:** Simple to build, low latency, easy to reason about.

**Disadvantages:**

- **Single point of failure** — if the server goes down, all dependent contracts stop working.
- **Manipulation risk** — whoever controls the key can publish false prices. In a prediction market, a corrupt oracle could declare the wrong winner and steal the entire pool.
- **No accountability** — users must trust the operator with no cryptographic proof that the published price matches reality.

This is the classic **oracle problem**: the blockchain is decentralized, but the data pipeline is not.

## Decentralized Oracles (Chainlink)

Chainlink addresses this by using a network of independent node operators. Each node fetches price data from multiple sources, aggregates it, and publishes it on-chain. No single node controls the outcome.

In this project, `PredictionMarket.resolveMarket()` calls `latestRoundData()` on a Chainlink `AggregatorV3Interface` contract. The aggregator stores the consensus price that Chainlink nodes have committed to Sepolia. Resolution is deterministic: the contract compares the oracle answer to the strike price and sets the winner without any off-chain callback or admin intervention.

**Advantages:**

- No single operator can unilaterally set the price.
- Data is on-chain and verifiable by anyone.
- The contract logic is self-contained — resolution requires only a read call to the aggregator.

**Trade-offs:**

- Feeds update on a heartbeat or deviation threshold, not every block.
- Stale or invalid data must be rejected (this project checks `roundId`, `startedAt`, and `updatedAt`).
- Testnet feeds may lag or behave differently from mainnet.

## How This Project Uses Chainlink

Each market stores a Chainlink aggregator address and a strike price. When the market ends:

1. Anyone calls `resolveMarket(marketId)`.
2. The contract reads `latestRoundData()` from the configured aggregator.
3. If `answer > strikePrice`, YES wins; otherwise NO wins.
4. Winners claim their proportional share of the losing pool.

For local demos, Anvil forks Sepolia via Alchemy so the same Chainlink aggregator contracts are available at their Sepolia addresses, providing real currency prices without deploying to a public server.

## Conclusion

The oracle problem is not about whether you need external data — you always do. It is about **who you trust to provide it**. Centralized oracles are fast but fragile. Decentralized feeds like Chainlink distribute trust across many operators, which is why prediction markets and DeFi protocols rely on them for price resolution instead of a single admin key.
