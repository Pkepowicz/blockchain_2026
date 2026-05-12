import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';
import ChainlinkPrice from './ChainlinkPrice';

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
  const { predictionMarket, bettingToken, address, isWalletConnected } = useWeb3();
  const [amount, setAmount] = useState('');
  const [isSelected, setIsSelected] = useState<boolean | null>(null);
  const [marketInfo, setMarketInfo] = useState<MarketInfo | null>(null);
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
      setMarketInfo({
        aggregator: market.aggregator,
        strikePrice: BigInt(market.strikePrice),
        endTime: BigInt(market.endTime),
        resolved: market.resolved,
        yesWins: market.yesWins,
        totalYesPool: BigInt(market.totalYesPool),
        totalNoPool: BigInt(market.totalNoPool),
      });
    } catch (error) {
      console.error('Failed to fetch selected market:', error);
      setMarketInfo(null);
    }
  };

  useEffect(() => {
    checkAllowance();
    fetchMarketInfo();
  }, [address, bettingToken, predictionMarket, marketId, refreshKey]);

  const formatPrice = (price: bigint) => Number(ethers.formatEther(price)).toFixed(2);

  const timeRemaining = (endTime: bigint) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = Number(endTime) - now;
    if (diff <= 0) return 'Ended';
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const isClosed = !!marketInfo && (marketInfo.resolved || Number(marketInfo.endTime) <= Math.floor(Date.now() / 1000));

  const handleBet = async () => {
    if (!amount || isSelected === null || !predictionMarket || !bettingToken) {
      setFeedback('Please fill all fields and select Yes/No', 'error');
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
      setFeedback('Bet placed successfully!', 'success');
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

  return (
    <div className="betting-interface card">
      <div className="betting-header">
        <div>
          <p className="betting-kicker">Selected market</p>
          <h3>Place Bet - Market #{marketId}</h3>
        </div>
        <span className={`betting-market-pill ${marketInfo?.resolved ? 'resolved' : isClosed ? 'closed' : 'open'}`}>
          {marketInfo?.resolved ? (marketInfo.yesWins ? 'YES won' : 'NO won') : isClosed ? 'Closed' : 'Open'}
        </span>
      </div>

      {marketInfo && (
        <div className="betting-market-summary">
          <div className="betting-summary-row">
            <span>Strike</span>
            <span>${formatPrice(marketInfo.strikePrice)}</span>
          </div>
          <div className="betting-summary-row">
            <span>Live</span>
            <ChainlinkPrice aggregatorAddress={marketInfo.aggregator} />
          </div>
          <div className="betting-summary-row">
            <span>Ends</span>
            <span>{timeRemaining(marketInfo.endTime)}</span>
          </div>
          <div className="betting-summary-row">
            <span>Total pool</span>
            <span>{formatPrice(marketInfo.totalYesPool + marketInfo.totalNoPool)} BETT</span>
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
            placeholder={isClosed ? 'Market closed' : 'Enter amount'}
            disabled={loading || !isWalletConnected || isClosed || isLocked}
          />
        </div>
        <div className="form-group">
          <label>Outcome:</label>
          <div className="outcome-selector">
            <button
              className={`outcome-btn ${isSelected === true ? 'selected' : ''}`}
              onClick={() => setIsSelected(true)}
              disabled={loading || !isWalletConnected || isClosed || isLocked}
            >
              YES
            </button>
            <button
              className={`outcome-btn ${isSelected === false ? 'selected' : ''}`}
              onClick={() => setIsSelected(false)}
              disabled={loading || !isWalletConnected || isClosed || isLocked}
            >
              NO
            </button>
          </div>
        </div>
        <button
          className="bet-btn"
          onClick={handleBet}
          disabled={loading || !isWalletConnected || isClosed || isLocked}
        >
          {isClosed ? 'Market Closed' : loading ? 'Processing...' : 'Place Bet'}
        </button>
        {status && <p className={`status ${statusTone}`}>{status}</p>}
      </div>
    </div>
  );
}
