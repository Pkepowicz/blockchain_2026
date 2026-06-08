import { ethers } from 'ethers';

export const AggregatorV3ABI = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const decimalsCache = new Map<string, number>();

export async function getAggregatorDecimals(
  provider: ethers.Provider,
  aggregatorAddress: string
): Promise<number> {
  const key = aggregatorAddress.toLowerCase();
  const cached = decimalsCache.get(key);
  if (cached !== undefined) return cached;

  const aggregator = new ethers.Contract(aggregatorAddress, AggregatorV3ABI, provider);
  const decimals = Number(await aggregator.decimals());
  decimalsCache.set(key, decimals);
  return decimals;
}
