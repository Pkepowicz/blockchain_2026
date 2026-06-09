import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';
import ChainlinkPrice from './ChainlinkPrice';
import { getAggregatorDecimals } from '../utils/aggregator';
import { getChainTimestamp } from '../utils/autoResolve';
import { getMarketQuestion, getMarketTitle, getOutcomeLabel, getResolvedLabel } from '../utils/marketLabels';
import { formatAggregatorPrice, formatTokenAmount } from '../utils/priceFormat';

interface MarketInfo {
  aggregator: string;
  strikePrice: bigint;
  endTime: bigint;
  resolved: boolean;
  yesWins: boolean;
  totalYesPool: bigint;
  totalNoPool: bigint;
}

interface BettingInterfaceProps {
  marketId: number;
  onBetPlaced: () => void;
  refreshKey?: number;
  isLocked?: boolean;
  onProcessingChange?: (processing: boolean) => void;
}

export default function BettingInterface({
  marketId,
  onBetPlaced,
  refreshKey,
  isLocked = false,
  onProcessingChange,
}: BettingInterfaceProps) {
  const { predictionMarket, bettingToken, address, isWalletConnected, provider } = useWeb3();
  const [amount, setAmount] = useState('');
  const [isSelected, setIsSelected] = useState<boolean | null>(null);
  const [marketInfo, setMarketInfo] = useState<MarketInfo | null>(null);
  const [strikeDecimals, setStrikeDecimals] = useState(8);
  const [chainNow, setChainNow] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [statusTone, setStatusTone] = useState<'pending' | 'success' | 'error' | ''>('');
  const [loading, setLoading] = useState(false);
  const [allowance, setAllowance] = useState<bigint>(BigInt(0));

  const setFeedback = (message: string, tone: 'pending' | 'success' | 'error' | '') => {
    setStatus(message);
    setStatusTone(tone);
  };

  const extractErrorMessage = (error: unknown) => {
    if (error && typeof error === 'object') {
      const maybeError = error as {
        reason?: string;
        shortMessage?: string;
        message?: string;
        info?: { error?: { message?: string } };
        data?: { message?: string };
      };

      return (
        maybeError.reason ||
        maybeError.shortMessage ||
        maybeError.data?.message ||
        maybeError.info?.error?.message ||
        maybeError.message ||
        'Transaction failed'
      );
    }

    return 'Transaction failed';
  };

  const checkAllowance = async () => {
    if (bettingToken && address && predictionMarket) {
      const marketAddr = predictionMarket.target as string;
      const allowed = await bettingToken.allowance(address, marketAddr);
      setAllowance(allowed);
    }
  };

  const fetchMarketInfo = async () => {
    if (!predictionMarket) return;
    try {
      const market = await predictionMarket.markets(marketId);
      const aggregator = market.aggregator as string;
      setMarketInfo({
        aggregator,
        strikePrice: BigInt(market.strikePrice),
        endTime: BigInt(market.endTime),
        resolved: market.resolved,
        yesWins: market.yesWins,
        totalYesPool: BigInt(market.totalYesPool),
        totalNoPool: BigInt(market.totalNoPool),
      });
      if (provider) {
        setStrikeDecimals(await getAggregatorDecimals(provider, aggregator));
        setChainNow(await getChainTimestamp(provider));
      }
    } catch (error) {
      console.error('Failed to fetch selected market:', error);
      setMarketInfo(null);
    }
  };

  useEffect(() => {
    checkAllowance();
    fetchMarketInfo();
  }, [address, bettingToken, predictionMarket, marketId, refreshKey, provider]);

  const formatStrike = (price: bigint) => formatAggregatorPrice(price, strikeDecimals);

  const timeRemaining = (endTime: bigint) => {
    if (chainNow === null) return 'Loading...';
    const diff = Number(endTime) - chainNow;
    if (diff <= 0) return 'Betting closed';
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    return `${hours}h ${mins}m left`;
  };

  const isClosed = !!marketInfo && (
    marketInfo.resolved ||
    (chainNow !== null && Number(marketInfo.endTime) <= chainNow)
  );

  const handleBet = async () => {
    if (!amount || isSelected === null || !predictionMarket || !bettingToken) {
      setFeedback('Enter an amount and pick above or below the strike', 'error');
      return;
    }

    const betAmount = ethers.parseEther(amount);
    if (betAmount <= BigInt(0)) {
      setFeedback('Amount must be greater than 0', 'error');
      return;
    }

    setLoading(true);
    setFeedback('Processing...', 'pending');
    onProcessingChange?.(true);

    try {
      if (allowance < betAmount) {
        setFeedback('Approving tokens...', 'pending');
        const approveTx = await bettingToken.approve(
          predictionMarket.target,
          betAmount
        );
        await approveTx.wait();
        setFeedback('Approved! Placing bet...', 'pending');
      }

      const betTx = await predictionMarket.placeBet(
        marketId,
        isSelected,
        betAmount
      );
      await betTx.wait();
      setFeedback(`Bet placed on "${getOutcomeLabel(isSelected, strikeFormatted)}"`, 'success');
      setAmount('');
      setIsSelected(null);
      checkAllowance();
      onBetPlaced();
    } catch (error) {
      setFeedback(extractErrorMessage(error), 'error');
      console.error(error);
    } finally {
      setLoading(false);
      onProcessingChange?.(false);
    }
  };

  const marketTitle = marketInfo ? getMarketTitle(marketInfo.aggregator) : `Market #${marketId}`;
  const strikeFormatted = marketInfo ? formatStrike(marketInfo.strikePrice) : '';
  const yesLabel = getOutcomeLabel(true);
  const noLabel = getOutcomeLabel(false);

  return (
    <div className="betting-interface card">
      <div className="betting-header">
        <div>
          <p className="betting-kicker">Selected market</p>
          <h3>{marketTitle}</h3>
          {marketInfo && (
            <p className="market-question">{getMarketQuestion(marketInfo.aggregator, strikeFormatted)}</p>
          )}
        </div>
        <span className={`betting-market-pill ${marketInfo?.resolved ? 'resolved' : isClosed ? 'closed' : 'open'}`}>
          {marketInfo?.resolved
            ? getResolvedLabel(marketInfo.yesWins)
            : isClosed
              ? 'Awaiting resolution'
              : 'Open'}
        </span>
      </div>

      {marketInfo && (
        <div className="betting-market-summary">
          <div className="betting-summary-row">
            <span>Strike price</span>
            <span>${strikeFormatted}</span>
          </div>
          <div className="betting-summary-row">
            <span>Current Chainlink price</span>
            <ChainlinkPrice aggregatorAddress={marketInfo.aggregator} />
          </div>
          <div className="betting-summary-row">
            <span>Betting closes</span>
            <span>{timeRemaining(marketInfo.endTime)}</span>
          </div>
          <div className="betting-summary-row">
            <span>Total pool</span>
            <span>{formatTokenAmount(marketInfo.totalYesPool + marketInfo.totalNoPool)} BETT</span>
          </div>
        </div>
      )}

      <div className="bet-form">
        <div className="form-group">
          <label>Amount (BETT):</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={isClosed ? 'Betting closed' : 'Enter amount'}
            disabled={loading || !isWalletConnected || isClosed || isLocked}
          />
        </div>
        <div className="form-group">
          <label>Your prediction:</label>
          <p className="outcome-hint">
            Win if the Chainlink price at resolution is {isSelected === null ? 'above or below' : isSelected ? 'above' : 'below'} ${strikeFormatted || 'the strike'}.
          </p>
          <div className="outcome-selector">
            <button
              className={`outcome-btn ${isSelected === true ? 'selected' : ''}`}
              onClick={() => setIsSelected(true)}
              disabled={loading || !isWalletConnected || isClosed || isLocked}
            >
              {yesLabel}
            </button>
            <button
              className={`outcome-btn ${isSelected === false ? 'selected' : ''}`}
              onClick={() => setIsSelected(false)}
              disabled={loading || !isWalletConnected || isClosed || isLocked}
            >
              {noLabel}
            </button>
          </div>
        </div>
        <button
          className="bet-btn"
          onClick={handleBet}
          disabled={loading || !isWalletConnected || isClosed || isLocked}
        >
          {isClosed ? 'Betting closed' : loading ? 'Processing...' : 'Place bet'}
        </button>
        {status && <p className={`status ${statusTone}`}>{status}</p>}
      </div>
    </div>
  );
}
