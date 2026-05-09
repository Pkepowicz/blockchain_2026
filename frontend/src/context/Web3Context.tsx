import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ethers } from 'ethers';
import BettingTokenABI from '../abi/BettingToken.json';
import PredictionMarketABI from '../abi/PredictionMarket.json';
import { config } from '../config';

type Web3ContextType = {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  address: string | null;
  chainId: number | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  bettingToken: ethers.Contract | null;
  predictionMarket: ethers.Contract | null;
  isWalletConnected: boolean;
};

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

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

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask');
      return;
    }

    try {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await ethProvider.send('eth_requestAccounts', []);
      const network = await ethProvider.getNetwork();
      const signerInstance = await ethProvider.getSigner();

      console.log('Connected to chain:', Number(network.chainId), '(expected:', config.chainId, ')');

      setProvider(ethProvider);
      setSigner(signerInstance);
      setAddress(accounts[0]);
      setChainId(Number(network.chainId));

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

      // Set up event listeners after successful connection
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if ((accounts as string[]).length === 0) {
          disconnectWallet();
        } else {
          setAddress((accounts as string[])[0]);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Check browser console for details.');
    }
  }, [config.bettingTokenAddress, config.predictionMarketAddress, config.chainId, disconnectWallet]);

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

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}
