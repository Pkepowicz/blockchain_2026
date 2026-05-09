import { useState } from 'react';
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

  const handleBetPlaced = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="top-section">
          <TokenFaucet />
        </div>
        <div className="middle-section">
          <MarketDashboard key={refreshKey} />
        </div>
        <div className="bottom-section">
          <div className="betting-section">
            {selectedMarket !== null ? (
              <BettingInterface
                marketId={selectedMarket}
                onBetPlaced={handleBetPlaced}
              />
            ) : (
              <div className="card betting-placeholder">
                <h3>Select a market below to place a bet</h3>
              </div>
            )}
          </div>
          <Portfolio key={refreshKey} />
        </div>
        <div className="market-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            {[0, 1, 2, 3].map((id) => (
              <button
                key={id}
                className={`action-btn ${selectedMarket === id ? 'active' : ''}`}
                onClick={() =>
                  setSelectedMarket(selectedMarket === id ? null : id)
                }
              >
                Bet on Market #{id}
              </button>
            ))}
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
