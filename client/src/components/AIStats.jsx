import React from 'react';
import './AIStats.css';
import './OpportunitiesStyles.css';

export default function AIStats({ aiStats }) {
    if (!aiStats) return null;

    return (
        <div className="card ai-stats-card">
            <div className="card-header">
                <h3 className="card-title">
                    <span className="icon">🧠</span>
                    Status da IA
                </h3>
                {aiStats.isTrained && (
                    <span className="badge badge-success ai-trained-badge">
                        ✓ Treinada
                    </span>
                )}
            </div>

            <div className="ai-stats-content">
                {/* Training Progress */}
                <div className="training-section">
                    <div className="training-header">
                        <span className="training-label">
                            {aiStats.isTrained ? 'Modelo Treinado' : 'Aprendendo...'}
                        </span>
                        <span className="training-value">
                            {aiStats.trainingSize} / {50} trades
                        </span>
                    </div>

                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${Math.min((aiStats.trainingSize / 50) * 100, 100)}%` }}
                        ></div>
                    </div>

                    {!aiStats.isTrained && aiStats.trainingSize < 50 && (
                        <div className="training-info">
                            <span className="info-icon">ℹ️</span>
                            <span className="info-text">
                                Precisa de {50 - aiStats.trainingSize} trades para treinar
                            </span>
                        </div>
                    )}
                </div>

                {/* AI Performance */}
                <div className="ai-performance">
                    <div className="performance-item">
                        <div className="perf-icon">🎯</div>
                        <div className="perf-content">
                            <span className="perf-label">Win Rate IA</span>
                            <span className={`perf-value ${aiStats.winRate >= 60 ? 'success' : 'warning'}`}>
                                {aiStats.winRate?.toFixed(1) || 0}%
                            </span>
                        </div>
                    </div>

                    <div className="performance-item">
                        <div className="perf-icon">📈</div>
                        <div className="perf-content">
                            <span className="perf-label">Lucro Médio</span>
                            <span className={`perf-value ${aiStats.avgProfit >= 0 ? 'success' : 'danger'}`}>
                                {aiStats.avgProfit >= 0 ? '+' : ''}{aiStats.avgProfit?.toFixed(2) || 0}%
                            </span>
                        </div>
                    </div>

                    <div className="performance-item">
                        <div className="perf-icon">✅</div>
                        <div className="perf-content">
                            <span className="perf-label">Wins</span>
                            <span className="perf-value success">{aiStats.winningTrades || 0}</span>
                        </div>
                    </div>

                    <div className="performance-item">
                        <div className="perf-icon">❌</div>
                        <div className="perf-content">
                            <span className="perf-label">Losses</span>
                            <span className="perf-value danger">{aiStats.losingTrades || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Oportunidades Detectadas CRT */}
                <div className="opportunities-section">
                    <div className="section-header">
                        <span className="section-icon">🎯</span>
                        <span className="section-title">Oportunidades CRT (4H)</span>
                    </div>

                    <div className="opportunities-grid">
                        <div className="opp-item">
                            <div className="opp-label">Últimas 4H</div>
                            <div className="opp-value highlight">
                                {aiStats.opportunitiesLast4H || 0}
                            </div>
                        </div>
                        <div className="opp-item">
                            <div className="opp-label">Hoje</div>
                            <div className="opp-value">
                                {aiStats.opportunitiesToday || 0}
                            </div>
                        </div>
                        <div className="opp-item">
                            <div className="opp-label">Total</div>
                            <div className="opp-value">
                                {aiStats.totalOpportunities || 0}
                            </div>
                        </div>
                    </div>

                    {aiStats.lastOpportunity && (
                        <div className="last-opportunity">
                            <div className="last-opp-header">📍 Última Oportunidade:</div>
                            <div className="last-opp-details">
                                <span className="opp-type">{aiStats.lastOpportunity.type}</span>
                                <span className="opp-time">{aiStats.lastOpportunity.time}</span>
                            </div>
                            <div className="opp-confidence">
                                Confiança: <span className="confidence-value">{aiStats.lastOpportunity.confidence}%</span>
                            </div>
                        </div>
                    )}

                    <div className="crt-reminder">
                        <span className="reminder-icon">⏰</span>
                        <span className="reminder-text">
                            Novo ciclo CRT a cada 4 horas
                        </span>
                    </div>
                </div>

                {/* Learning Status */}
                <div className="learning-status">
                    {aiStats.isTrained ? (
                        <div className="status-message success">
                            <span className="status-icon">✓</span>
                            <span className="status-text">
                                IA está otimizada e aprendendo com cada trade
                            </span>
                        </div>
                    ) : aiStats.readyToLearn ? (
                        <div className="status-message info">
                            <span className="status-icon">🚀</span>
                            <span className="status-text">
                                Pronta para treinar! Aguardando próximo ciclo...
                            </span>
                        </div>
                    ) : (
                        <div className="status-message warning">
                            <span className="status-icon">📚</span>
                            <span className="status-text">
                                Coletando dados para aprendizado inicial
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
