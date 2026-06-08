import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';
import { getMarketTitle, getOutcomeLabel, getResolvedLabel } from '../utils/marketLabels';

interface UserBet {
  marketId: number;
  aggregator: string;
  amount: bigint;
  isYes: boolean;
  claimed: boolean;
  marketResolved: boolean;
  yesWins: boolean;
  canClaim: boolean;
}

type PortfolioProps = {
  onPortfolioChanged?: () => void;
  refreshKey?: number;
};

export default function Portfolio({ onPortfolioChanged, refreshKey }: PortfolioProps) {
  const { predictionMarket, address, isWalletConnected } = useWeb3();
  const [bets, setBets] = useState<UserBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingMarketId, setClaimingMarketId] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [statusTone, setStatusTone] = useState<'pending' | 'success' | 'error' | ''>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const fetchBets = async (isInitial = false) => {
    if (!predictionMarket || !address) {
      setLoading(false);
      return;
    }
    if (isInitial && !hasLoaded) {
      setLoading(true);
    }
    try {
      const count = await predictionMarket.nextMarketId();
      const userBets: UserBet[] = [];

      for (let i = 0; i < Number(count); i++) {
        const market = await predictionMarket.markets(i);
        const bet = await predictionMarket.userBets(i, address);

        const betAmount = BigInt(bet.amount);
        if (betAmount > BigInt(0)) {
          const isWinner = market.resolved && (market.yesWins === bet.isYes);
          userBets.push({
            marketId: i,
            aggregator: market.aggregator,
            amount: betAmount,
            isYes: bet.isYes,
            claimed: bet.claimed,
            marketResolved: market.resolved,
            yesWins: market.yesWins,
            canClaim: market.resolved && isWinner && !bet.claimed,
          });
        }
      }
      setBets(userBets);
      setLastUpdated(new Date());
      if (isInitial && !hasLoaded) {
        setHasLoaded(true);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    } finally {
      if (isInitial && !hasLoaded) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchBets(true);
  }, [address, predictionMarket, refreshKey]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchBets(false);
    } finally {
      setRefreshing(false);
    }
  };

  const handleClaim = async (marketId: number) => {
    if (!predictionMarket) return;
    setClaimingMarketId(marketId);
    setFeedback('', '');
    try {
      const tx = await predictionMarket.claimWinnings(marketId);
      await tx.wait();
      fetchBets();
      onPortfolioChanged?.();
    } catch (error) {
      setFeedback(extractErrorMessage(error), 'error');
      console.error(error);
    } finally {
      setClaimingMarketId(null);
    }
  };

  if (!isWalletConnected) {
    return (
      <div className="portfolio card">
        <div className="portfolio-header">
          <h2>Portfolio</h2>
        </div>
        <p className="connect-prompt">Connect wallet to view your bets</p>
      </div>
    );
  }

  if (loading) return <div className="portfolio card"><p>Loading portfolio...</p></div>;

  const totalBetAmount = bets.reduce((sum, bet) => sum + bet.amount, BigInt(0));
  const wonBets = bets.filter((bet) => bet.marketResolved && (bet.canClaim || bet.claimed)).length;
  const lostBets = bets.filter((bet) => bet.marketResolved && !bet.canClaim && !bet.claimed).length;
  const pendingBets = bets.filter((bet) => !bet.marketResolved).length;
  const claimableBets = bets.filter((bet) => bet.canClaim).length;

  const formatUpdatedAt = () => {
    if (!lastUpdated) return 'Never';
    return lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getBetStatus = (bet: UserBet) => {
    if (!bet.marketResolved) return { label: 'Awaiting resolution', tone: 'pending' };
    if (bet.canClaim) return { label: 'Claim available', tone: 'win' };
    if (bet.claimed) return { label: 'Claimed', tone: 'claimed' };
    return { label: 'Lost', tone: 'loss' };
  };

  return (
    <div className="portfolio card">
      <div className="portfolio-header">
        <div>
          <h2>Portfolio</h2>
        </div>
        <div className="portfolio-header-actions">
          <button
            type="button"
            className="clear-selection-btn"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <span className="portfolio-updated">Updated {formatUpdatedAt()}</span>
        </div>
      </div>
      <div className="portfolio-summary">
        <div className="portfolio-stat">
          <span className="portfolio-stat-label">Total staked</span>
          <span className="portfolio-stat-value">{Number(ethers.formatEther(totalBetAmount)).toFixed(2)} BETT</span>
        </div>
        <div className="portfolio-stat">
          <span className="portfolio-stat-label">Claimable</span>
          <span className="portfolio-stat-value win">{claimableBets}</span>
        </div>
        <div className="portfolio-stat">
          <span className="portfolio-stat-label">Won / Lost</span>
          <span className="portfolio-stat-value">{wonBets} / {lostBets}</span>
        </div>
        <div className="portfolio-stat">
          <span className="portfolio-stat-label">Pending</span>
          <span className="portfolio-stat-value pending">{pendingBets}</span>
        </div>
      </div>
      {bets.length === 0 ? (
        <p className="empty-state">No bets placed yet</p>
      ) : (
        <div className="bet-list">
          {bets.map((bet) => (
            <div key={bet.marketId} className="bet-item">
              <div className="bet-header">
                <div className="bet-title-wrap">
                  <span className="bet-market-id">{getMarketTitle(bet.aggregator)}</span>
                  <span className={`outcome-label ${bet.isYes ? 'yes' : 'no'}`}>
                    {getOutcomeLabel(bet.isYes)}
                  </span>
                </div>
                <span className={`bet-status-pill ${getBetStatus(bet).tone}`}>
                  {getBetStatus(bet).label}
                </span>
              </div>
              <div className="bet-details">
                <span className="bet-amount">Amount: {Number(ethers.formatEther(bet.amount)).toFixed(2)} BETT</span>
                {bet.marketResolved && (
                  <span className={bet.canClaim || bet.claimed ? 'winner' : 'loser'}>
                    {bet.canClaim || bet.claimed
                      ? `Won — ${getResolvedLabel(bet.yesWins)}`
                      : `Lost — ${getResolvedLabel(bet.yesWins)}`}
                  </span>
                )}
                {bet.claimed && (
                  <span className="claimed-badge">Claimed</span>
                )}
              </div>
              {bet.canClaim && (
                <button
                  className="claim-btn"
                  onClick={() => handleClaim(bet.marketId)}
                  disabled={claimingMarketId !== null}
                >
                  {claimingMarketId === bet.marketId ? 'Claiming...' : 'Claim Winnings'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {status && <p className={`status ${statusTone}`}>{status}</p>}
    </div>
  );
}
