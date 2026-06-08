import { useEffect, useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { AggregatorV3ABI, getAggregatorDecimals } from '../utils/aggregator';
import { formatAggregatorPrice } from '../utils/priceFormat';
import { ethers } from 'ethers';

interface ChainlinkPriceProps {
  aggregatorAddress: string;
}

export default function ChainlinkPrice({ aggregatorAddress }: ChainlinkPriceProps) {
  const { provider } = useWeb3();
  const [price, setPrice] = useState<string>('--');
  const [loading, setLoading] = useState(true);

  const fetchPrice = async () => {
    if (!provider) return;
    try {
      const aggregator = new ethers.Contract(aggregatorAddress, AggregatorV3ABI, provider);
      const [round, decimals] = await Promise.all([
        aggregator.latestRoundData(),
        getAggregatorDecimals(provider, aggregatorAddress),
      ]);
      setPrice(formatAggregatorPrice(BigInt(round.answer), decimals));
    } catch {
      setPrice('unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 15000);
    return () => clearInterval(interval);
  }, [provider, aggregatorAddress]);

  return (
    <span className="chainlink-price" title="Chainlink price feed">
      {loading ? '...' : `$${price}`}
    </span>
  );
}
