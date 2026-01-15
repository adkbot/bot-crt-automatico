import React from 'react';
import './ControlPanel.css';

const PAIRS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT'];
const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];

export default function ControlPanel({
    activePair,
    activeInterval,
    autoTrading,
    onChangePair,
    onChangeInterval,
    onToggleAutoTrading
}) {
    return (
        <div className="control-panel">
            <div className="control-group">
                <label htmlFor="pair-select">Par:</label>
                <select
                    id="pair-select"
                    className="select"
                    value={activePair}
                    onChange={(e) => onChangePair(e.target.value)}
                >
                    {PAIRS.map(pair => (
                        <option key={pair} value={pair}>{pair}</option>
                    ))}
                </select>
            </div>

            <div className="control-group">
                <label htmlFor="interval-select">Timeframe:</label>
                <select
                    id="interval-select"
                    className="select"
                    value={activeInterval}
                    onChange={(e) => onChangeInterval(e.target.value)}
                >
                    {INTERVALS.map(interval => (
                        <option key={interval} value={interval}>{interval}</option>
                    ))}
                </select>
            </div>

            <div className="control-group">
                <button
                    className={`btn toggle-btn ${autoTrading ? 'active' : 'inactive'}`}
                    onClick={() => onToggleAutoTrading(!autoTrading)}
                >
                    <span className="toggle-icon">{autoTrading ? '🤖' : '⏸️'}</span>
                    <span className="toggle-text">
                        {autoTrading ? 'Auto Trading ON' : 'Auto Trading OFF'}
                    </span>
                </button>
            </div>
        </div>
    );
}
