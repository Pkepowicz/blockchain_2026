import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';
import ChainlinkPrice from './ChainlinkPrice';
import { getAggregatorDecimals } from '../utils/aggregator';
import { autoResolveEndedMarkets, getChainTimestamp, getEndedUnresolvedMarketIds } from '../utils/autoResolve';
import { getBetMarketTitle, getMarketQuestion, getMarketTitle, getPoolLabels, getResolvedLabel } from '../utils/marketLabels';
import { formatAggregatorPrice, formatTokenAmount } from '../utils/priceFormat';

const poolLabels = getPoolLabels();
const MARKET_CREATION_FEE = ethers.parseEther('100');
const AGGREGATOR_PRESETS = {
  btc: {
    label: 'BTC/USD',
    address: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43',
  },
  eth: {
    label: 'ETH/USD',
    address: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
  },
} as const;

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
  const { predictionMarket, bettingToken, address, provider, isWalletConnected } = useWeb3();
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
  const [creatorAggregatorChoice, setCreatorAggregatorChoice] = useState<keyof typeof AGGREGATOR_PRESETS | 'custom'>('btc');
  const [creatorCustomAggregator, setCreatorCustomAggregator] = useState('');
  const [creatorStrikePrice, setCreatorStrikePrice] = useState('');
  const [creatorDurationMinutes, setCreatorDurationMinutes] = useState('10');
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState('');
  const [createStatusTone, setCreateStatusTone] = useState<'pending' | 'success' | 'error' | ''>('');

  const setCreateFeedback = (message: string, tone: 'pending' | 'success' | 'error' | '') => {
    setCreateStatus(message);
    setCreateStatusTone(tone);
  };

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

  const handleCreateMarket = async () => {
    if (!predictionMarket || !bettingToken || !provider || !address) {
      setCreateFeedback('Connect a wallet to create a market.', 'error');
      return;
    }

    const aggregatorInput = creatorAggregatorChoice === 'custom'
      ? creatorCustomAggregator.trim()
      : AGGREGATOR_PRESETS[creatorAggregatorChoice].address;
    const strikeInput = creatorStrikePrice.trim();
    const durationInput = creatorDurationMinutes.trim();

    if (!aggregatorInput || !strikeInput || !durationInput) {
      setCreateFeedback('Fill in aggregator, strike price, and duration.', 'error');
      return;
    }

    setCreating(true);
    setCreateFeedback('Preparing market creation...', 'pending');

    try {
      if (!ethers.isAddress(aggregatorInput)) {
        setCreateFeedback('Invalid aggregator address. Choose BTC/USD, ETH/USD, or paste a valid 0x address.', 'error');
        return;
      }

      const aggregatorAddress = ethers.getAddress(aggregatorInput);
      const decimals = await getAggregatorDecimals(provider, aggregatorAddress);
      const strikePrice = ethers.parseUnits(strikeInput, decimals);
      const durationMinutes = Number(durationInput);

      if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        setCreateFeedback('Duration must be a positive number.', 'error');
        return;
      }

      const durationSeconds = Math.floor(durationMinutes * 60);
      const allowance = await bettingToken.allowance(address, predictionMarket.target);

      if (allowance < MARKET_CREATION_FEE) {
        setCreateFeedback('Approving creation fee...', 'pending');
        const approveTx = await bettingToken.approve(predictionMarket.target, MARKET_CREATION_FEE);
        await approveTx.wait();
      }

      setCreateFeedback('Creating market...', 'pending');
      const createTx = await predictionMarket.createMarket(aggregatorAddress, strikePrice, durationSeconds);
      await createTx.wait();

      setCreateFeedback('Market created successfully.', 'success');
      setCreatorAggregatorChoice('btc');
      setCreatorCustomAggregator('');
      setCreatorStrikePrice('');
      setCreatorDurationMinutes('10');
      await fetchMarkets(false);
      onMarketsUpdated?.();
    } catch (error) {
      console.error('Create market failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to create market.';
      setCreateFeedback(message, 'error');
    } finally {
      setCreating(false);
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
    const title = getBetMarketTitle(market.aggregator, market.yesWins, formatStrike(market.strikePrice, market.aggregator));
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
      <div className="market-creator">
        <div className="market-creator-header">
          <div>
            <h3>Create market</h3>
            <p>Open to anyone. Pay a 100 BETT creation fee and seed a new prediction market.</p>
          </div>
          <span className="creator-fee-badge">Fee: {formatTokenAmount(MARKET_CREATION_FEE)} BETT</span>
        </div>
        <div className="market-creator-grid">
          <div className="market-creator-field market-creator-field-wide">
            <label htmlFor="creator-aggregator">Aggregator address</label>
            <select
              id="creator-aggregator"
              className="market-creator-input"
              value={creatorAggregatorChoice}
              onChange={(e) => setCreatorAggregatorChoice(e.target.value as keyof typeof AGGREGATOR_PRESETS | 'custom')}
              disabled={creating || !isWalletConnected}
            >
              <option value="btc">BTC/USD - 0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43</option>
              <option value="eth">ETH/USD - 0x694AA1769357215DE4FAC081bf1f309aDC325306</option>
              <option value="custom">Custom address</option>
            </select>
            {creatorAggregatorChoice === 'custom' && (
              <input
                type="text"
                className="market-creator-input"
                placeholder="Paste your own aggregator address"
                value={creatorCustomAggregator}
                onChange={(e) => setCreatorCustomAggregator(e.target.value)}
                disabled={creating || !isWalletConnected}
              />
            )}
          </div>
          <div className="market-creator-field">
            <label htmlFor="creator-strike">Strike price</label>
            <input
              id="creator-strike"
              type="number"
              className="market-creator-input"
              placeholder="e.g. 50000"
              value={creatorStrikePrice}
              onChange={(e) => setCreatorStrikePrice(e.target.value)}
              disabled={creating || !isWalletConnected}
            />
          </div>
          <div className="market-creator-field">
            <label htmlFor="creator-duration">Duration (minutes)</label>
            <input
              id="creator-duration"
              type="number"
              className="market-creator-input"
              placeholder="10"
              value={creatorDurationMinutes}
              onChange={(e) => setCreatorDurationMinutes(e.target.value)}
              disabled={creating || !isWalletConnected}
            />
          </div>
        </div>
        <p className="market-creator-note">
          BTC/USD and ETH/USD are prefilled. If you choose custom, the address must be a valid Chainlink aggregator.
        </p>
        <button
          type="button"
          className="create-market-btn"
          onClick={handleCreateMarket}
          disabled={creating || !isWalletConnected || !predictionMarket}
        >
          {creating ? 'Creating...' : 'Create market'}
        </button>
        {createStatus && <p className={`create-market-status ${createStatusTone}`}>{createStatus}</p>}
      </div>
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
                <span className="market-id">{getBetMarketTitle(market.aggregator, market.yesWins, formatStrike(market.strikePrice, market.aggregator))}</span>
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
