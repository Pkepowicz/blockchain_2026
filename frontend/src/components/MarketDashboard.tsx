import { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import ChainlinkPrice from './ChainlinkPrice';
import { getAggregatorDecimals } from '../utils/aggregator';
import { autoResolveEndedMarkets, getChainTimestamp, getEndedUnresolvedMarketIds } from '../utils/autoResolve';
import { getMarketQuestion, getMarketTitle, getPoolLabels, getResolvedLabel } from '../utils/marketLabels';
import { formatAggregatorPrice, formatTokenAmount } from '../utils/priceFormat';

const poolLabels = getPoolLabels();

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
  onMarketsUpdated?: () => void;
  refreshKey?: number;
  disabled?: boolean;
};

export default function MarketDashboard({
  selectedMarketId,
  onSelectMarket,
  onMarketsUpdated,
  refreshKey,
  disabled = false,
}: MarketDashboardProps) {
  const { predictionMarket, provider, isWalletConnected } = useWeb3();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [aggregatorDecimals, setAggregatorDecimals] = useState<Record<string, number>>({});
  const [filterText, setFilterText] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [chainNow, setChainNow] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolveStatus, setResolveStatus] = useState('');
  const [endedCount, setEndedCount] = useState(0);

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

      if (provider) {
        const timestamp = await getChainTimestamp(provider);
        setChainNow(timestamp);
        if (predictionMarket) {
          const pending = await getEndedUnresolvedMarketIds(predictionMarket, provider);
          setEndedCount(pending.length);
        }
        const decimalsMap: Record<string, number> = {};
        const uniqueAggregators = [...new Set(fetched.map((m) => m.aggregator))];
        await Promise.all(
          uniqueAggregators.map(async (addr) => {
            decimalsMap[addr] = await getAggregatorDecimals(provider, addr);
          })
        );
        setAggregatorDecimals(decimalsMap);
      }
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

  const handleRefresh = async () => {
    if (!predictionMarket) return;
    setRefreshing(true);
    setResolveStatus('');
    try {
      await fetchMarkets(false);
    } finally {
      setRefreshing(false);
    }
  };

  const handleResolve = async () => {
    if (!predictionMarket || !provider || !isWalletConnected) return;
    setResolving(true);
    setResolveStatus('');
    try {
      const resolved = await autoResolveEndedMarkets(predictionMarket, provider);
      if (resolved.length === 0) {
        setResolveStatus('No ended markets to resolve.');
      } else {
        setResolveStatus(`Resolved ${resolved.length} market(s).`);
        await fetchMarkets(false);
        onMarketsUpdated?.();
      }
    } catch (error) {
      console.error('Resolve failed:', error);
      setResolveStatus('Resolution failed. Check console for details.');
    } finally {
      setResolving(false);
    }
  };

  const formatStrike = (price: bigint, aggregator: string) => {
    const decimals = aggregatorDecimals[aggregator] ?? 8;
    return formatAggregatorPrice(price, decimals);
  };

  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  const timeRemaining = (endTime: bigint, resolved: boolean) => {
    if (resolved) return 'Resolved';
    if (chainNow === null) return 'Loading...';
    const diff = Number(endTime) - chainNow;
    if (diff <= 0) return 'Awaiting resolution';
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const describeMarket = (market: Market) => {
    const title = getMarketTitle(market.aggregator);
    const strike = formatStrike(market.strikePrice, market.aggregator);
    const state = market.resolved
      ? getResolvedLabel(market.yesWins)
      : timeRemaining(market.endTime, market.resolved);
    return `${title} | ${state} | strike $${strike}`;
  };

  const visibleMarkets = markets.filter((market) => {
    if (!filterText.trim()) return true;
    const query = filterText.toLowerCase();
    return describeMarket(market).toLowerCase().includes(query);
  });

  if (loading) return <div className="loading">Loading markets...</div>;

  return (
    <div className="market-dashboard card">
      <div className="market-dashboard-header">
        <h2>Active Markets</h2>
        <div className="market-dashboard-actions">
          <button
            type="button"
            className="clear-selection-btn"
            onClick={handleRefresh}
            disabled={refreshing || !predictionMarket}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            className="resolve-markets-btn"
            onClick={handleResolve}
            disabled={resolving || !isWalletConnected || endedCount === 0}
            title={endedCount === 0 ? 'No ended markets awaiting resolution' : `Resolve ${endedCount} ended market(s)`}
          >
            {resolving ? 'Resolving...' : `Resolve ended${endedCount > 0 ? ` (${endedCount})` : ''}`}
          </button>
        </div>
      </div>
      {resolveStatus && <p className="market-resolve-status">{resolveStatus}</p>}
      {markets.length === 0 ? (
        <p>No markets available</p>
      ) : (
        <div className="market-list">
          <div className="market-picker market-picker-inline">
            <div className="market-picker-header">
              <div>
                <h3>Choose market</h3>
                <p>Pick a market — bet whether the price will be above or below the strike.</p>
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
              placeholder="Search by asset, status, or strike..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              disabled={disabled}
            />
              <p className="selected-market-empty">
                {selectedMarketId !== null && markets[selectedMarketId]
                  ? `${getMarketTitle(markets[selectedMarketId].aggregator)} selected — place your bet below.`
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
                <span className="market-id">{getMarketTitle(market.aggregator)}</span>
                {market.resolved ? (
                  <span className={`result-badge ${market.yesWins ? 'yes' : 'no'}`}>
                    {getResolvedLabel(market.yesWins)}
                  </span>
                ) : (
                  <span className="time-remaining">{timeRemaining(market.endTime, market.resolved)}</span>
                )}
              </div>
              <p className="market-card-question">
                {getMarketQuestion(market.aggregator, formatStrike(market.strikePrice, market.aggregator))}
              </p>
              <div className="market-details">
                <div className="detail-row">
                  <span>Strike price:</span>
                  <span>${formatStrike(market.strikePrice, market.aggregator)}</span>
                </div>
                <div className="detail-row">
                  <span>Current Chainlink price:</span>
                  <ChainlinkPrice aggregatorAddress={market.aggregator} />
                </div>
                <div className="detail-row">
                  <span>Betting closes:</span>
                  <span>{formatTime(market.endTime)}</span>
                </div>
                <div className="detail-row">
                  <span>{poolLabels.above}:</span>
                  <span>{formatTokenAmount(market.totalYesPool)} BETT</span>
                </div>
                <div className="detail-row">
                  <span>{poolLabels.below}:</span>
                  <span>{formatTokenAmount(market.totalNoPool)} BETT</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
