import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';

type TokenFaucetProps = {
  refreshKey?: number;
};

export default function TokenFaucet({ refreshKey }: TokenFaucetProps) {
  const { bettingToken, isWalletConnected, address } = useWeb3();
  const [balance, setBalance] = useState<string>('0');
  const [minting, setMinting] = useState(false);
  const [status, setStatus] = useState('');

  const canMint = !!bettingToken && isWalletConnected && !!address;

  const fetchBalance = async () => {
    if (bettingToken && address) {
      const bal = await bettingToken.balanceOf(address);
      setBalance(Number(ethers.formatEther(bal)).toFixed(2));
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [address, bettingToken, refreshKey]);

  const handleMint = async () => {
    if (!bettingToken) return;
    setMinting(true);
    setStatus('');
    try {
      const tx = await bettingToken.mint();
      await tx.wait();
      setStatus('1,000 BETT minted successfully!');
      fetchBalance();
    } catch (error) {
      setStatus('Mint failed');
      console.error(error);
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="token-faucet card">
      <div className="token-faucet-header">
        <div>
          <p className="token-faucet-kicker">Dev faucet</p>
          <h2>Token Faucet</h2>
        </div>
        <span className={`token-faucet-badge ${canMint ? 'ready' : 'locked'}`}>
          {canMint ? 'Ready' : 'Locked'}
        </span>
      </div>

      <div className="token-faucet-balance">
        <span className="token-faucet-balance-label">Current balance</span>
        <div className="token-faucet-balance-row">
          <span className="token-faucet-balance-value">{balance}</span>
          <span className="token-faucet-balance-unit">BETT</span>
        </div>
      </div>

      <p className="token-faucet-note">
        Mint 1,000 BETT for testing bets on the active market.
      </p>

      <button
        className="mint-btn"
        onClick={handleMint}
        disabled={minting || !canMint}
      >
        {minting ? 'Minting...' : 'Get Tokens'}
      </button>
      {status && <p className="status">{status}</p>}
    </div>
  );
}
