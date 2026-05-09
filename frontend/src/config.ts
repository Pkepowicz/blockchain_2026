export const config = {
  rpcUrl: import.meta.env.VITE_RPC_URL || 'http://localhost:8545',
  bettingTokenAddress: import.meta.env.VITE_BETTING_TOKEN_ADDRESS || '0x5fbdb2315678afecb367f032d93f642f64180aa3',
  predictionMarketAddress: import.meta.env.VITE_PREDICTION_MARKET_ADDRESS || '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0',
  chainId: parseInt(import.meta.env.VITE_CHAIN_ID || '31337'),
  chainName: import.meta.env.VITE_CHAIN_NAME || 'Anvil',
};
