import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';
import ChainlinkPrice from './ChainlinkPrice';

interface Market {
  id: number;
  aggregator: string;
  strikePrice: bigint;
  endTime: bigint;
  resolved: boolean;
  yesWins: boolean;
  totalYesPool: bigint;
  totalNoPool: bigint;
}

export default function MarketDashboard() {
  const { predictionMarket } = useWeb3();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarkets = async () => {
    if (!predictionMarket) return;
    setLoading(true);
    try {
      const count = await predictionMarket.nextMarketId();
      const fetched: Market[] = [];
      for (let i = 0; i < Number(count); i++) {
        const market = await predictionMarket.markets(i);
        fetched.push({
          id: i,
          aggregator: market.aggregator,
          strikePrice: BigInt(market.strikePrice),
          endTime: BigInt(market.endTime),
          resolved: market.resolved,
          yesWins: market.yesWins,
          totalYesPool: BigInt(market.totalYesPool),
          totalNoPool: BigInt(market.totalNoPool),
        });
      }
      setMarkets(fetched);
    } catch (error) {
      console.error('Failed to fetch markets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 10000);
    return () => clearInterval(interval);
  }, [predictionMarket]);

  const formatPrice = (price: bigint) => {
    return (Number(ethers.formatEther(price))).toFixed(2);
  };

  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  const timeRemaining = (endTime: bigint) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = Number(endTime) - now;
    if (diff <= 0) return 'Ended';
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  if (loading) return <div className="loading">Loading markets...</div>;

  return (
    <div className="market-dashboard card">
      <h2>Active Markets</h2>
      {markets.length === 0 ? (
        <p>No markets available</p>
      ) : (
        <div className="market-list">
          {markets.map((market) => (
            <div key={market.id} className={`market-item ${market.resolved ? 'resolved' : ''}`}>
              <div className="market-header">
                <span className="market-id">Market #{market.id}</span>
                {market.resolved ? (
                  <span className={`result-badge ${market.yesWins ? 'yes' : 'no'}`}>
                    {market.yesWins ? 'YES Wins' : 'NO Wins'}
                  </span>
                ) : (
                  <span className="time-remaining">{timeRemaining(market.endTime)}</span>
                )}
              </div>
              <div className="market-details">
                <div className="detail-row">
                  <span>Strike Price:</span>
                  <span>${formatPrice(market.strikePrice)}</span>
                </div>
                <div className="detail-row">
                  <span>Live Price:</span>
                  <ChainlinkPrice aggregatorAddress={market.aggregator} />
                </div>
                <div className="detail-row">
                  <span>Ends:</span>
                  <span>{formatTime(market.endTime)}</span>
                </div>
                <div className="detail-row">
                  <span>Yes Pool:</span>
                  <span>{formatPrice(market.totalYesPool)} BETT</span>
                </div>
                <div className="detail-row">
                  <span>No Pool:</span>
                  <span>{formatPrice(market.totalNoPool)} BETT</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
