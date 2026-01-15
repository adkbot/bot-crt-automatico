import React from 'react';
import './TradePanel.css';

export default function TradePanel({ analysis, currentTrade, recentTrades, learningReports, onManualClose }) {
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('pt-BR');
    };

    return (
        <div className="trade-panel">
            {/* Current Signal */}
            {analysis?.signals?.length > 0 && !currentTrade && (
                <div className="card signal-card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <span className="icon">🎯</span>
                            Sinal Detectado
                        </h3>
                        <span className={`badge badge-${analysis.signals[0].type === 'LONG' ? 'success' : 'danger'}`}>
                            {analysis.signals[0].type}
                        </span>
                    </div>

                    <div className="signal-content">
                        <div className="confidence-display">
                            <div className="confidence-label">Confiança</div>
                            <div className="confidence-value">
                                {(analysis.signals[0].confidence * 100).toFixed(1)}%
                            </div>
                            <div className="confidence-bar">
                                <div
                                    className="confidence-fill"
                                    style={{ width: `${analysis.signals[0].confidence * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="signal-details">
                            <div className="detail-row">
                                <span className="label">Entrada</span>
                                <span className="value">{formatCurrency(analysis.signals[0].entry)}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Stop Loss</span>
                                <span className="value danger">{formatCurrency(analysis.signals[0].stopLoss)}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Take Profit</span>
                                <span className="value success">{formatCurrency(analysis.signals[0].takeProfit)}</span>
                            </div>
                        </div>

                        <div className="signal-reasons">
                            <div className="reasons-title">Motivos:</div>
                            {analysis.signals[0].reasons?.map((reason, idx) => (
                                <div key={idx} className="reason-item">
                                    <span className="reason-bullet">•</span>
                                    <span className="reason-text">{reason}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Current Trade Controls */}
            {currentTrade && (
                <div className="card trade-controls-card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <span className="icon">⚡</span>
                            Operação Ativa
                        </h3>
                    </div>

                    <div className="trade-controls">
                        <button
                            className="btn btn-danger btn-close-trade"
                            onClick={onManualClose}
                        >
                            <span>🚨</span>
                            Fechar Manualmente
                        </button>

                        <div className="trade-duration">
                            Tempo: {formatTime(currentTrade.entryTime)}
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Trades */}
            <div className="card recent-trades-card">
                <div className="card-header">
                    <h3 className="card-title">
                        <span className="icon">📋</span>
                        Últimas Operações
                    </h3>
                    <span className="badge badge-info">{recentTrades?.length || 0}</span>
                </div>

                <div className="trades-list">
                    {recentTrades && recentTrades.length > 0 ? (
                        recentTrades.slice(-10).reverse().map((trade) => (
                            <div key={trade.id} className="trade-item">
                                <div className="trade-item-header">
                                    <span className={`trade-type ${trade.type.toLowerCase()}`}>
                                        {trade.type}
                                    </span>
                                    <span className="trade-time">{formatTime(trade.exitTime)}</span>
                                </div>

                                <div className="trade-item-body">
                                    <div className="trade-prices">
                                        <div className="price-item">
                                            <span className="price-label">IN:</span>
                                            <span className="price-value">{formatCurrency(trade.entry)}</span>
                                        </div>
                                        <div className="price-item">
                                            <span className="price-label">OUT:</span>
                                            <span className="price-value">{formatCurrency(trade.exitPrice)}</span>
                                        </div>
                                    </div>

                                    <div className="trade-result">
                                        <div className={`profit-amount ${trade.profit >= 0 ? 'positive' : 'negative'}`}>
                                            {trade.profit >= 0 ? '+' : ''}{formatCurrency(trade.profit)}
                                        </div>
                                        <div className={`profit-percent ${trade.profit >= 0 ? 'positive' : 'negative'}`}>
                                            {trade.profitPercent?.toFixed(2)}%
                                        </div>
                                    </div>
                                </div>

                                <div className="trade-reason">
                                    <span className="reason-badge">{trade.exitReason}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <span className="empty-icon">📊</span>
                            <p>Nenhuma operação ainda</p>
                        </div>
                    )}
                </div>

                {/* Relatórios de Aprendizado da IA */}
                {learningReports && learningReports.length > 0 && (
                    <div className="learning-reports-section">
                        <div className="reports-header">
                            <span className="reports-icon">🧠</span>
                            <span className="reports-title">Aprend. IA (Hora em Hora)</span>
                        </div>
                        <div className="reports-list">
                            {learningReports.slice(-5).reverse().map((report, idx) => (
                                <div key={idx} className="report-item">
                                    <div className="report-time">{report.time}</div>
                                    <div className="report-content">
                                        <span className="report-videos">📹 {report.newVideos} vídeos</span>
                                        <span className="report-concepts">💡 {report.newConcepts} conceitos</span>
                                        <span className="report-score">⭐ {report.score} pts</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
