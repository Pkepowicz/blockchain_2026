import { useWeb3 } from '../hooks/useWeb3';
import { config } from '../config';

export default function Header() {
  const { address, chainId, connectWallet, disconnectWallet, isWalletConnected } = useWeb3();

  const shortenAddress = (addr: string) =>
    addr.slice(0, 6) + '...' + addr.slice(-4);

  const isWrongNetwork = isWalletConnected && chainId !== config.chainId;

  return (
    <header className="header">
      <h1 className="header-title">Prediction Market</h1>
      <div className="header-right">
        {isWalletConnected && address && (
          <div className="wallet-info">
            <span className="wallet-address">{shortenAddress(address)}</span>
            <button className="disconnect-btn" onClick={disconnectWallet}>Disconnect</button>
          </div>
        )}
        {isWrongNetwork && (
          <span className="network-warning">Switch to {config.chainName} (chain {config.chainId})</span>
        )}
        <button className="connect-btn" onClick={connectWallet}>
          {isWalletConnected ? 'Connected' : 'Connect Wallet'}
        </button>
      </div>
    </header>
  );
}
