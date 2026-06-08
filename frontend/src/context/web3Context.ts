import { createContext } from 'react';
import type { ethers } from 'ethers';

export type Web3ContextType = {
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

export const Web3Context = createContext<Web3ContextType | undefined>(undefined);
