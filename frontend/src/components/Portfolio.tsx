import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';

interface UserBet {
  marketId: number;
  amount: bigint;
  isYes: boolean;
  claimed: boolean;
  marketResolved: boolean;
  yesWins: boolean;
  canClaim: boolean;
}

export default function Portfolio() {
  const { predictionMarket, address, isWalletConnected } = useWeb3();
  const [bets, setBets] = useState<UserBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('');

  const fetchBets = async () => {
    if (!predictionMarket || !address) {
      setLoading(false);
      return;
    }
    setLoading(true);
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
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBets();
  }, [address, predictionMarket]);

  const handleRefresh = async () => {
    if (!predictionMarket || !address) return;
    setRefreshing(true);
    try {
      await fetchBets();
    } finally {
      setRefreshing(false);
    }
  };

  const handleClaim = async (marketId: number) => {
    if (!predictionMarket) return;
    setLoading(true);
    setStatus('Claiming winnings...');
    try {
      const tx = await predictionMarket.claimWinnings(marketId);
      await tx.wait();
      setStatus('Winnings claimed successfully!');
      fetchBets();
    } catch (error) {
      setStatus('Claim failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isWalletConnected) {
    return (
      <div className="portfolio card">
        <h2>Portfolio</h2>
        <p className="connect-prompt">Connect wallet to view your bets</p>
      </div>
    );
  }

  if (loading) return <div className="portfolio card"><p>Loading portfolio...</p></div>;

  return (
    <div className="portfolio card">
      <div className="portfolio-header">
        <h2>Portfolio</h2>
        {isWalletConnected && (
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
      </div>
      {bets.length === 0 ? (
        <p>No bets placed yet</p>
      ) : (
        <div className="bet-list">
          {bets.map((bet) => (
            <div key={bet.marketId} className="bet-item">
              <div className="bet-header">
                <span>Market #{bet.marketId}</span>
                <span className={`outcome-label ${bet.isYes ? 'yes' : 'no'}`}>
                  {bet.isYes ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="bet-details">
                <span>Amount: {Number(ethers.formatEther(bet.amount)).toFixed(2)} BETT</span>
                {bet.marketResolved && (
                  <span className={bet.canClaim || bet.claimed ? 'winner' : 'loser'}>
                    {bet.canClaim || bet.claimed ? 'Winner' : 'Loser'}
                  </span>
                )}
                {bet.claimed && <span className="claimed-badge">Claimed</span>}
              </div>
              {bet.canClaim && (
                <button className="claim-btn" onClick={() => handleClaim(bet.marketId)}>
                  Claim Winnings
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {status && <p className="status">{status}</p>}
    </div>
  );
}
