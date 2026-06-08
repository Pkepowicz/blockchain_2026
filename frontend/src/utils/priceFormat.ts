import { ethers } from 'ethers';

export function formatAggregatorPrice(raw: bigint, decimals: number): string {
  const formatted = ethers.formatUnits(raw, decimals);
  const num = Number(formatted);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatTokenAmount(raw: bigint, decimals = 18): string {
  const formatted = ethers.formatUnits(raw, decimals);
  const num = Number(formatted);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
