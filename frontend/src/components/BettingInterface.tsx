import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';

interface BettingInterfaceProps {
  marketId: number;
  onBetPlaced: () => void;
}

export default function BettingInterface({ marketId, onBetPlaced }: BettingInterfaceProps) {
  const { predictionMarket, bettingToken, address, isWalletConnected } = useWeb3();
  const [amount, setAmount] = useState('');
  const [isSelected, setIsSelected] = useState<boolean | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [allowance, setAllowance] = useState<bigint>(BigInt(0));

  const checkAllowance = async () => {
    if (bettingToken && address && predictionMarket) {
      const marketAddr = predictionMarket.target as string;
      const allowed = await bettingToken.allowance(address, marketAddr);
      setAllowance(allowed);
    }
  };

  useEffect(() => {
    checkAllowance();
  }, [address, bettingToken]);

  const handleBet = async () => {
    if (!amount || isSelected === null || !predictionMarket || !bettingToken) {
      setStatus('Please fill all fields and select Yes/No');
      return;
    }

    const betAmount = ethers.parseEther(amount);
    if (betAmount <= BigInt(0)) {
      setStatus('Amount must be greater than 0');
      return;
    }

    setLoading(true);
    setStatus('Processing...');

    try {
      if (allowance < betAmount) {
        setStatus('Approving tokens...');
        const approveTx = await bettingToken.approve(
          predictionMarket.target,
          betAmount
        );
        await approveTx.wait();
        setStatus('Approved! Placing bet...');
      }

      const betTx = await predictionMarket.placeBet(
        marketId,
        isSelected,
        betAmount
      );
      await betTx.wait();
      setStatus('Bet placed successfully!');
      setAmount('');
      setIsSelected(null);
      checkAllowance();
      onBetPlaced();
    } catch (error) {
      setStatus('Bet failed. Check console for details.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="betting-interface card">
      <h3>Place Bet - Market #{marketId}</h3>
      <div className="bet-form">
        <div className="form-group">
          <label>Amount (BETT):</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            disabled={loading || !isWalletConnected}
          />
        </div>
        <div className="form-group">
          <label>Outcome:</label>
          <div className="outcome-selector">
            <button
              className={`outcome-btn ${isSelected === true ? 'selected' : ''}`}
              onClick={() => setIsSelected(true)}
              disabled={loading || !isWalletConnected}
            >
              YES
            </button>
            <button
              className={`outcome-btn ${isSelected === false ? 'selected' : ''}`}
              onClick={() => setIsSelected(false)}
              disabled={loading || !isWalletConnected}
            >
              NO
            </button>
          </div>
        </div>
        <button
          className="bet-btn"
          onClick={handleBet}
          disabled={loading || !isWalletConnected}
        >
          {loading ? 'Processing...' : 'Place Bet'}
        </button>
        {status && <p className="status">{status}</p>}
      </div>
    </div>
  );
}
