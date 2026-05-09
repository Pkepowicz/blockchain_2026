import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';

interface ChainlinkPriceProps {
  aggregatorAddress: string;
}

const AggregatorV3ABI = [
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
];

export default function ChainlinkPrice({ aggregatorAddress }: ChainlinkPriceProps) {
  const { provider } = useWeb3();
  const [price, setPrice] = useState<string>('--');
  const [loading, setLoading] = useState(true);

  const fetchPrice = async () => {
    if (!provider) return;
    try {
      const aggregator = new ethers.Contract(aggregatorAddress, AggregatorV3ABI, provider);
      const round = await aggregator.latestRoundData();
      const priceNum = Number(ethers.formatEther(round.answer));
      setPrice(priceNum.toFixed(2));
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
