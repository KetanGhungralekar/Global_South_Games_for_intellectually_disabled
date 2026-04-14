import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Coins,
  Trophy,
  Plus,
  Minus,
  RotateCcw,
  ArrowRight,
  Lightbulb,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Constants & Data ---

const CURRENCY = '₹';

const ITEM_POOL = [
  { id: 'apple', name: 'Apple', price: 10, icon: '🍎' },
  { id: 'bread', name: 'Bread', price: 30, icon: '🍞' },
  { id: 'milk', name: 'Milk', price: 25, icon: '🥛' },
  { id: 'juice', name: 'Juice', price: 20, icon: '🧃' },
  { id: 'banana', name: 'Banana', price: 5, icon: '🍌' },
  { id: 'egg', name: 'Egg', price: 5, icon: '🥚' },
  { id: 'cookie', name: 'Cookie', price: 15, icon: '🍪' },
  { id: 'water', name: 'Water', price: 10, icon: '💧' },
  { id: 'chocolate', name: 'Chocolate', price: 40, icon: '🍫' },
  { id: 'candy', name: 'Candy', price: 5, icon: '🍬' },
  { id: 'cake', name: 'Cake', price: 50, icon: '🍰' },
  { id: 'orange', name: 'Orange', price: 15, icon: '🍊' },
  { id: 'pear', name: 'Pear', price: 10, icon: '🍐' },
  { id: 'grapes', name: 'Grapes', price: 35, icon: '🍇' },
  { id: 'watermelon', name: 'Watermelon', price: 45, icon: '🍉' },
  { id: 'carrot', name: 'Carrot', price: 5, icon: '🥕' },
  { id: 'corn', name: 'Corn', price: 15, icon: '🌽' },
  { id: 'cheese', name: 'Cheese', price: 25, icon: '🧀' },
  { id: 'pizza', name: 'Pizza', price: 60, icon: '🍕' },
  { id: 'burger', name: 'Burger', price: 55, icon: '🍔' },
  { id: 'fries', name: 'Fries', price: 20, icon: '🍟' },
  { id: 'donut', name: 'Donut', price: 10, icon: '🍩' },
  { id: 'icecream', name: 'Ice Cream', price: 30, icon: '🍦' },
  { id: 'honey', name: 'Honey', price: 45, icon: '🍯' },
];

const DIFFICULTY_CONFIG = {
  easy: { itemsRange: [1, 2], denominations: [10, 20], distractors: [] },
  medium: { itemsRange: [2, 3], denominations: [10, 15, 20], distractors: [] },
  hard: { itemsRange: [3, 4], denominations: [10, 15, 20, 50], distractors: [5] },
};

// --- Helper Functions ---

const getRandomItems = (count) => {
  const shuffled = [...ITEM_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const isSolvable = (target, denoms) => {
  if (target === 0) return true;
  const dp = new Array(target + 1).fill(false);
  dp[0] = true;
  for (const d of denoms) {
    for (let i = d; i <= target; i++) {
      if (dp[i - d]) dp[i] = true;
    }
  }
  return dp[target];
};

// --- Main Component ---

export default function App() {
  const [level, setLevel] = useState('easy');
  const [items, setItems] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState({});
  const [score, setScore] = useState(0);
  const [tokens, setTokens] = useState(3);
  const [gameStatus, setGameStatus] = useState('playing'); // 'playing', 'success', 'incorrect'
  const [showHint, setShowHint] = useState(false);
  const [hintMessage, setHintMessage] = useState('');

  // Initialize game
  useEffect(() => {
    startNewRound();
  }, [level]);

  const startNewRound = () => {
    const config = DIFFICULTY_CONFIG[level];
    
    let newItems = [];
    let total = 0;
    let attempts = 0;
    
    // Ensure the total is solvable with given denominations
    do {
      const [min, max] = config.itemsRange;
      const count = Math.floor(Math.random() * (max - min + 1)) + min;
      newItems = getRandomItems(count);
      total = newItems.reduce((sum, item) => sum + item.price, 0);
      attempts++;
    } while (!isSolvable(total, config.denominations) && attempts < 50);

    setItems(newItems);
    const initialNotes = {};
    [...config.denominations, ...config.distractors].forEach(d => {
      initialNotes[d] = 0;
    });
    setSelectedNotes(initialNotes);
    setGameStatus('playing');
    setShowHint(false);
    setHintMessage('');
  };

  const totalCost = items.reduce((sum, item) => sum + item.price, 0);
  const selectedTotal = Object.entries(selectedNotes).reduce(
    (sum, [denom, count]) => sum + (parseInt(denom) * count),
    0
  );

  const handleAdjustNote = (denom, delta) => {
    if (gameStatus !== 'playing') return;
    setSelectedNotes(prev => {
      const newValue = Math.max(0, (prev[denom] || 0) + delta);
      return { ...prev, [denom]: newValue };
    });
  };

  const handleValidate = () => {
    if (selectedTotal === totalCost) {
      setGameStatus('success');
      setScore(s => s + 1);
      setTokens(t => t + 2);
    } else {
      setGameStatus('incorrect');
    }
  };

  const useHint = () => {
    if (tokens < 1 || gameStatus !== 'playing') return;

    setTokens(t => t - 1);
    setShowHint(true);

    // Logic: Find a denomination that is needed but under-represented
    // or one that is over-represented.
    // For simplicity: Suggest adding one of the correct notes needed to build the sum.
    const config = DIFFICULTY_CONFIG[level];
    const target = totalCost;
    let current = selectedTotal;

    if (current < target) {
      const diff = target - current;
      const suggested = config.denominations.find(d => d <= diff) || config.denominations[0];
      setHintMessage(`Try adding one ${CURRENCY}${suggested} note!`);
    } else if (current > target) {
      const overflowDenom = Object.keys(selectedNotes).find(d => selectedNotes[d] > 0);
      setHintMessage(`Try removing one ${CURRENCY}${overflowDenom} note.`);
    } else {
      setHintMessage("You have the exact amount! Press Check.");
    }
  };

  const getStatusColor = () => {
    if (gameStatus === 'success') return 'var(--secondary)';
    if (gameStatus === 'incorrect') return 'var(--danger)';
    return 'var(--primary)';
  };

  return (
    <div className="game-container">
      {/* Header */}
      <header className="glass-card header-stats">
        <div className="stat-item">
          <Trophy className="icon text-primary" size={20} />
          <span>Score: <strong>{score}</strong></span>
        </div>
        <div className="stat-item">
          <Coins className="icon text-accent" size={20} />
          <span>Tokens: <strong>{tokens}</strong></span>
        </div>
        <div className="level-selector">
          {Object.keys(DIFFICULTY_CONFIG).map(l => (
            <button
              key={l}
              className={`level-btn ${level === l ? 'active' : ''}`}
              onClick={() => setLevel(l)}
            >
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {/* Shop Area */}
      <section className="shop-section">
        <h2 className="section-title">
          <ShoppingBag className="icon" size={24} />
          Your Shopping List
        </h2>
        <div className="items-grid">
          {items.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="item-card glass-card"
            >
              <span className="item-emoji">{item.icon}</span>
              <div className="item-info">
                <span className="item-name">{item.name}</span>
                <span className="item-price">{CURRENCY}{item.price}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Wallet / Payment Area */}
      <section className="payment-section">
        <h2 className="section-title">
          <Coins className="icon" size={24} />
          Your Wallet
        </h2>
        <div className="wallet-grid">
          {Object.keys(selectedNotes).map((denom) => (
            <div key={denom} className="note-selector glass-card">
              <div className="note-visual">
                <span className="denom-value">{CURRENCY}{denom}</span>
              </div>
              <div className="note-controls">
                <button
                  className="btn-icon minus"
                  onClick={() => handleAdjustNote(denom, -1)}
                >
                  <Minus size={20} />
                </button>
                <span className="note-count">{selectedNotes[denom]}</span>
                <button
                  className="btn-icon plus"
                  onClick={() => handleAdjustNote(denom, 1)}
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Total Display */}
        <div className="selected-summary glass-card" style={{ borderColor: getStatusColor() }}>
          <div className="summary-left">
            <span>Selected Money:</span>
            <span className="selected-total">{CURRENCY}{selectedTotal}</span>
          </div>
          {gameStatus === 'playing' ? (
            <button className="btn-primary" onClick={handleValidate}>
              <CheckCircle2 size={20} style={{ marginRight: '8px' }} />
              Check Total
            </button>
          ) : (
            <button className="btn-secondary" onClick={startNewRound}>
              <ArrowRight size={20} style={{ marginRight: '8px' }} />
              Next Round
            </button>
          )}
        </div>
      </section>

      {/* Hints & Feedback */}
      <AnimatePresence>
        {gameStatus !== 'playing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
          />
        )}

        {gameStatus === 'incorrect' && (
          <motion.div
            key="incorrect"
            initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
            className="feedback-popup incorrect"
          >
            <AlertCircle size={48} className="popup-icon" />
            <h3>Oops!</h3>
            <p>The total is {selectedTotal > totalCost ? 'too high' : 'not enough'}.</p>
            <p>You have {CURRENCY}{selectedTotal}, but we need {CURRENCY}{totalCost}.</p>
            <button className="btn-primary retry-btn" onClick={() => setGameStatus('playing')}>
              <RotateCcw size={20} style={{ marginRight: '8px' }} />
              Try Again
            </button>
          </motion.div>
        )}

        {gameStatus === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
            className="feedback-popup success"
          >
            <CheckCircle2 size={48} className="popup-icon" />
            <h3>Great Job!</h3>
            <p>You paid exactly {CURRENCY}{totalCost}.</p>
            <div className="reward-badge">+2 Tokens ✨</div>
            <button className="btn-secondary next-btn" onClick={startNewRound}>
              <ArrowRight size={20} style={{ marginRight: '8px' }} />
              Next Round
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint Button */}
      <div className="hint-container">
        <button
          className="btn-hint"
          onClick={useHint}
          disabled={tokens < 1 || gameStatus !== 'playing'}
        >
          <Lightbulb size={20} color={tokens > 0 ? 'var(--accent)' : 'var(--text-muted)'} />
          <span>Need a Hint? (1 Token)</span>
        </button>
        {showHint && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="hint-text"
          >
            {hintMessage}
          </motion.p>
        )}
      </div>

      <style jsx>{`
        .game-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          min-height: calc(100vh - 40px);
        }

        .header-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.1rem;
        }

        .level-selector {
          display: flex;
          gap: 8px;
          background: rgba(0,0,0,0.05);
          padding: 4px;
          border-radius: 12px;
        }

        .level-btn {
          padding: 6px 14px;
          font-size: 0.9rem;
          border-radius: 8px;
          background: transparent;
          color: var(--text-muted);
        }

        .level-btn.active {
          background: white;
          color: var(--primary);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.3rem;
          margin-bottom: 16px;
          color: var(--text-main);
        }

        .icon {
          color: var(--primary);
        }

        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 16px;
        }

        .item-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;
          padding: 16px;
        }

        .item-emoji {
          font-size: 2.5rem;
        }

        .item-name {
          display: block;
          font-weight: 500;
          font-size: 1rem;
        }

        .item-price {
          font-weight: 700;
          color: var(--primary);
          font-size: 1.2rem;
        }

        .total-banner-container {
          margin-top: 20px;
          display: flex;
          justify-content: center;
        }

        .total-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 32px;
          background: var(--primary);
          color: white;
          border-radius: 50px;
        }

        .total-banner span:first-child {
          font-size: 1.2rem;
        }

        .total-price {
          font-size: 2rem;
          font-weight: 700;
        }

        .wallet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }

        .note-selector {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 20px;
        }

        .note-visual {
          width: 100px;
          height: 60px;
          background: #dcfce7;
          border: 2px solid #10b981;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 0 #059669;
        }

        .denom-value {
          font-weight: 700;
          font-size: 1.4rem;
          color: #065f46;
        }

        .note-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .btn-icon {
          background: white;
          color: var(--primary);
          border: 2px solid var(--primary);
        }

        .btn-icon.minus {
          color: var(--danger);
          border-color: var(--danger);
        }

        .note-count {
          font-size: 1.5rem;
          font-weight: 700;
          min-width: 30px;
          text-align: center;
        }

        .selected-summary {
          margin-top: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 32px;
          border-width: 3px;
        }

        .summary-left {
          display: flex;
          flex-direction: column;
        }

        .selected-total {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .btn-retry {
          background: var(--danger);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0 auto;
          margin-top: 10px;
        }

        .feedback-popup {
          background: white;
          padding: 32px;
          border-radius: 32px;
          text-align: center;
          box-shadow: 0 30px 60px rgba(0,0,0,0.3);
          position: fixed;
          top: 50%;
          left: 50%;
          z-index: 1001;
          width: 90%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
        }

        .popup-icon {
          margin-bottom: 8px;
        }

        .feedback-popup h3 {
          font-size: 1.8rem;
          margin: 0;
        }

        .feedback-popup p {
          font-size: 1.1rem;
          margin: 0;
          color: var(--text-muted);
        }

        .feedback-popup.success {
          border: 6px solid var(--secondary-light);
        }

        .feedback-popup.success h3 {
          color: var(--secondary);
        }

        .feedback-popup.incorrect {
          border: 6px solid #fecaca;
        }

        .feedback-popup.incorrect h3 {
          color: var(--danger);
        }

        .retry-btn {
          width: 100%;
          margin-top: 8px;
          background: var(--danger);
        }

        .next-btn {
          width: 100%;
          margin-top: 8px;
          background: var(--secondary);
        }

        .reward-badge {
          display: inline-block;
          background: var(--accent);
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: 600;
          margin-top: 10px;
        }

        .hint-container {
          margin-top: auto;
          text-align: center;
          padding: 20px;
        }

        .btn-hint {
          background: transparent;
          color: var(--text-muted);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
        }

        .hint-text {
          margin-top: 8px;
          color: var(--accent);
          font-weight: 500;
          font-size: 1.1rem;
        }

        @media (max-width: 480px) {
          .items-grid { grid-template-columns: 1fr 1fr; }
          .wallet-grid { grid-template-columns: 1fr; }
          .summary-left span:first-child { font-size: 0.9rem; }
          .selected-total { font-size: 1.5rem; }
        }
      `}</style>
    </div>
  );
}
