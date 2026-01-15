import React from 'react';
import './Dashboard.css';

export default function Dashboard({ balance, stats, currentTrade }) {
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    };

    const formatPercent = (value) => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    const profitPercent = ((balance?.total - 1000) / 1000) * 100;

    return (
        <div className="dashboard">
            {/* Balance Card */}
            <div className="card balance-card">
                <div className="card-header">
                    <h3 className="card-title">
                        <span className="icon">💰</span>
                        Saldo da Carteira
                    </h3>
                </div>

                <div className="balance-main">
                    <div className="balance-total">
                        <span className="balance-label">Total</span>
                        <span className="balance-value">{formatCurrency(balance?.total || 0)}</span>
                    </div>

                    <div className={`balance-profit ${profitPercent >= 0 ? 'positive' : 'negative'}`}>
                        <span className="profit-icon">{profitPercent >= 0 ? '📈' : '📉'}</span>
                        <span className="profit-value">{formatPercent(profitPercent)}</span>
                    </div>
                </div>

                <div className="balance-breakdown">
                    <div className="balance-item">
                        <span className="label">Disponível</span>
                        <span className="value">{formatCurrency(balance?.available || 0)}</span>
                    </div>
                    <div className="balance-item">
                        <span className="label">Em Posição</span>
                        <span className="value">{formatCurrency(balance?.inPosition || 0)}</span>
                    </div>
                </div>
            </div>

            {/* Stats Card */}
            <div className="card stats-card">
                <div className="card-header">
                    <h3 className="card-title">
                        <span className="icon">📊</span>
                        Estatísticas
                    </h3>
                </div>

                <div className="stats-grid">
                    <div className="stat-item">
                        <div className="stat-icon">🎯</div>
                        <div className="stat-content">
                            <span className="stat-label">Win Rate</span>
                            <span className={`stat-value ${stats?.winRate >= 60 ? 'success' : 'warning'}`}>
                                {stats?.winRate?.toFixed(1) || 0}%
                            </span>
                        </div>
                    </div>

                    <div className="stat-item">
                        <div className="stat-icon">🔢</div>
                        <div className="stat-content">
                            <span className="stat-label">Total de Trades</span>
                            <span className="stat-value">{stats?.totalTrades || 0}</span>
                        </div>
                    </div>

                    <div className="stat-item">
                        <div className="stat-icon">✅</div>
                        <div className="stat-content">
                            <span className="stat-label">Vencedoras</span>
                            <span className="stat-value success">{stats?.winningTrades || 0}</span>
                        </div>
                    </div>

                    <div className="stat-item">
                        <div className="stat-icon">❌</div>
                        <div className="stat-content">
                            <span className="stat-label">Perdedoras</span>
                            <span className="stat-value danger">{stats?.losingTrades || 0}</span>
                        </div>
                    </div>

                    <div className="stat-item">
                        <div className="stat-icon">💵</div>
                        <div className="stat-content">
                            <span className="stat-label">Lucro Total</span>
                            <span className={`stat-value ${stats?.totalProfit >= 0 ? 'success' : 'danger'}`}>
                                {formatCurrency(stats?.totalProfit || 0)}
                            </span>
                        </div>
                    </div>

                    <div className="stat-item">
                        <div className="stat-icon">📅</div>
                        <div className="stat-content">
                            <span className="stat-label">Hoje</span>
                            <span className="stat-value">{stats?.todayTrades || 0} trades</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Current Trade Status */}
            {currentTrade && (
                <div className="card current-trade-card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <span className="icon">⚡</span>
                            Operação Atual
                        </h3>
                        <span className={`badge badge-${currentTrade.type === 'LONG' ? 'success' : 'danger'}`}>
                            {currentTrade.type}
                        </span>
                    </div>

                    <div className="trade-info">
                        <div className="trade-row">
                            <span className="label">Entrada</span>
                            <span className="value">{formatCurrency(currentTrade.entry)}</span>
                        </div>
                        <div className="trade-row">
                            <span className="label">Stop Loss</span>
                            <span className="value danger">{formatCurrency(currentTrade.stopLoss)}</span>
                        </div>
                        <div className="trade-row">
                            <span className="label">Take Profit</span>
                            <span className="value success">{formatCurrency(currentTrade.takeProfit)}</span>
                        </div>
                        <div className="trade-row">
                            <span className="label">Confiança</span>
                            <span className="value">{(currentTrade.confidence * 100).toFixed(1)}%</span>
                        </div>
                    </div>

                    <div className="confidence-bar">
                        <div
                            className="confidence-fill"
                            style={{ width: `${currentTrade.confidence * 100}%` }}
                        ></div>
                    </div>
                </div>
            )}
        </div>
    );
}
