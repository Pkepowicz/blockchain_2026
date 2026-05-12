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

type MarketDashboardProps = {
  selectedMarketId: number | null;
  onSelectMarket: (marketId: number | null) => void;
  refreshKey?: number;
  disabled?: boolean;
};

export default function MarketDashboard({
  selectedMarketId,
  onSelectMarket,
  refreshKey,
  disabled = false,
}: MarketDashboardProps) {
  const { predictionMarket } = useWeb3();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [filterText, setFilterText] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchMarkets = async (isInitial = false) => {
    if (!predictionMarket) return;
    if (isInitial && !hasLoaded) {
      setLoading(true);
    }
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
      if (isInitial && !hasLoaded) {
        setLoading(false);
        setHasLoaded(true);
      }
    }
  };

  useEffect(() => {
    fetchMarkets(true);
  }, [predictionMarket, refreshKey]);

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

  const describeMarket = (market: Market) => {
    const state = market.resolved ? (market.yesWins ? 'YES resolved' : 'NO resolved') : timeRemaining(market.endTime);
    return `#${market.id} | ${state} | strike $${formatPrice(market.strikePrice)}`;
  };

  const visibleMarkets = markets.filter((market) => {
    if (!filterText.trim()) return true;
    const query = filterText.toLowerCase();
    return (
      `#${market.id}`.includes(query) ||
      describeMarket(market).toLowerCase().includes(query)
    );
  });

  if (loading) return <div className="loading">Loading markets...</div>;

  return (
    <div className="market-dashboard card">
      <h2>Active Markets</h2>
      {markets.length === 0 ? (
        <p>No markets available</p>
      ) : (
        <div className="market-list">
          <div className="market-picker market-picker-inline">
            <div className="market-picker-header">
              <div>
                <h3>Choose market</h3>
                <p>Filter the list below by id, status, or strike price.</p>
              </div>
              <button
                type="button"
                className="clear-selection-btn"
                onClick={() => onSelectMarket(null)}
                disabled={selectedMarketId === null || disabled}
              >
                Clear
              </button>
            </div>

            <input
              type="text"
              className="market-filter"
              placeholder="Type a market id, status, or strike price..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              disabled={disabled}
            />
              <p className="selected-market-empty">
                {selectedMarketId !== null
                  ? `Selected market #${selectedMarketId} is shown in the betting panel below.`
                  : 'Pick a market to start betting.'}
              </p>
          </div>

          {visibleMarkets.length === 0 ? (
            <p className="selected-market-empty">No markets match your search.</p>
          ) : visibleMarkets.map((market) => (
            <button
              key={market.id}
              type="button"
              className={`market-item ${market.resolved ? 'resolved' : ''} ${selectedMarketId === market.id ? 'active' : ''}`}
              onClick={() => onSelectMarket(market.id)}
              disabled={disabled}
            >
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
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
