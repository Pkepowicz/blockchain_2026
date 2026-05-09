import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';

export default function TokenFaucet() {
  const { bettingToken, isWalletConnected, address } = useWeb3();
  const [balance, setBalance] = useState<string>('0');
  const [minting, setMinting] = useState(false);
  const [status, setStatus] = useState('');

  const fetchBalance = async () => {
    if (bettingToken && address) {
      const bal = await bettingToken.balanceOf(address);
      setBalance(Number(ethers.formatEther(bal)).toFixed(2));
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [address, bettingToken]);

  const handleMint = async () => {
    if (!bettingToken) return;
    setMinting(true);
    setStatus('Minting tokens...');
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
      <h2>Token Faucet</h2>
      <div className="balance">
        <span className="label">Balance:</span>
        <span className="value">{balance} BETT</span>
      </div>
      <button
        className="mint-btn"
        onClick={handleMint}
        disabled={minting || !isWalletConnected}
      >
        {minting ? 'Minting...' : 'Get Tokens'}
      </button>
      {status && <p className="status">{status}</p>}
    </div>
  );
}
