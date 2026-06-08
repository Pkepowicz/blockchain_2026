import type { ethers } from 'ethers';

export async function getChainTimestamp(provider: ethers.Provider): Promise<number> {
  const block = await provider.getBlock('latest');
  return block?.timestamp ?? Math.floor(Date.now() / 1000);
}

export async function getEndedUnresolvedMarketIds(
  predictionMarket: ethers.Contract,
  provider: ethers.Provider
): Promise<number[]> {
  const chainNow = await getChainTimestamp(provider);
  const count = await predictionMarket.nextMarketId();
  const ids: number[] = [];

  for (let i = 0; i < Number(count); i++) {
    const market = await predictionMarket.markets(i);
    if (market.resolved) continue;
    if (chainNow >= Number(market.endTime)) ids.push(i);
  }

  return ids;
}

export async function autoResolveEndedMarkets(
  predictionMarket: ethers.Contract,
  provider: ethers.Provider
): Promise<number[]> {
  const ids = await getEndedUnresolvedMarketIds(predictionMarket, provider);
  const resolvedIds: number[] = [];

  for (const id of ids) {
    const tx = await predictionMarket.resolveMarket(id);
    await tx.wait();
    resolvedIds.push(id);
  }

  return resolvedIds;
}
