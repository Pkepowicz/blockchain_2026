import { useCallback, useEffect, useState } from 'react';
import { Web3Provider } from './context/Web3Context';
import Header from './components/Header';
import MarketDashboard from './components/MarketDashboard';
import BettingInterface from './components/BettingInterface';
import TokenFaucet from './components/TokenFaucet';
import Portfolio from './components/Portfolio';
import './App.css';

function AppContent() {
  const [selectedMarket, setSelectedMarket] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isBetProcessing, setIsBetProcessing] = useState(false);

  const handleBetPlaced = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="top-section">
          <div className="top-grid">
            <TokenFaucet refreshKey={refreshKey} />
            <Portfolio
              refreshKey={refreshKey}
              onPortfolioChanged={handleBetPlaced}
            />
          </div>
        </div>
        <div className="bottom-section">
          <div className="market-workbench">
            <MarketDashboard
              refreshKey={refreshKey}
              selectedMarketId={selectedMarket}
              disabled={isBetProcessing}
              onSelectMarket={(marketId) => setSelectedMarket(marketId)}
              onMarketsUpdated={handleBetPlaced}
            />
            <div className="betting-section">
              {selectedMarket !== null ? (
                <BettingInterface
                  refreshKey={refreshKey}
                  marketId={selectedMarket}
                  isLocked={isBetProcessing}
                  onProcessingChange={setIsBetProcessing}
                  onBetPlaced={handleBetPlaced}
                />
              ) : (
                <div className="card betting-placeholder">
                  <h3>Choose a market from the list to place a bet</h3>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Web3Provider>
      <AppContent />
    </Web3Provider>
  );
}
