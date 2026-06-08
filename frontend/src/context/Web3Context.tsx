import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ethers } from 'ethers';
import BettingTokenABI from '../abi/BettingToken.json';
import PredictionMarketABI from '../abi/PredictionMarket.json';
import { config } from '../config';
import { Web3Context } from './web3Context';

export function Web3Provider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [bettingToken, setBettingToken] = useState<ethers.Contract | null>(null);
  const [predictionMarket, setPredictionMarket] = useState<ethers.Contract | null>(null);

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setBettingToken(null);
    setPredictionMarket(null);
  }, []);

  const ensureCorrectChain = async () => {
    const hexChainId = `0x${config.chainId.toString(16)}`;

    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
    } catch (switchError: unknown) {
      const error = switchError as { code?: number };
      if (error.code !== 4902) throw switchError;

      await window.ethereum!.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: hexChainId,
          chainName: config.chainName,
          rpcUrls: [config.rpcUrl],
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        }],
      });
    }
  };

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask');
      return;
    }

    try {
      await ensureCorrectChain();

      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await ethProvider.send('eth_requestAccounts', []);
      const network = await ethProvider.getNetwork();
      const currentChainId = Number(network.chainId);

      if (currentChainId !== config.chainId) {
        throw new Error(
          `Wrong network: MetaMask is on chain ${currentChainId}, expected ${config.chainId}. ` +
          'Use RPC http://127.0.0.1:8545 and restart the fork with start-fork.sh.'
        );
      }

      const signerInstance = await ethProvider.getSigner();

      console.log('Connected to chain:', currentChainId, '(expected:', config.chainId, ')');

      setProvider(ethProvider);
      setSigner(signerInstance);
      setAddress(accounts[0]);
      setChainId(currentChainId);

      const tokenAddress = ethers.getAddress(config.bettingTokenAddress);
      const marketAddress = ethers.getAddress(config.predictionMarketAddress);

      const tokenContract = new ethers.Contract(
        tokenAddress,
        BettingTokenABI,
        signerInstance
      );

      const marketContract = new ethers.Contract(
        marketAddress,
        PredictionMarketABI,
        signerInstance
      );

      setBettingToken(tokenContract);
      setPredictionMarket(marketContract);

      window.ethereum.on('accountsChanged', (...args: unknown[]) => {
        const nextAccounts = args[0] as string[];
        if (nextAccounts.length === 0) {
          disconnectWallet();
        } else {
          setAddress(nextAccounts[0]);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      const message = error instanceof Error ? error.message : 'Failed to connect wallet.';
      alert(message);
    }
  }, [disconnectWallet]);

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        address,
        chainId,
        connectWallet,
        disconnectWallet,
        bettingToken,
        predictionMarket,
        isWalletConnected: !!address,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}
