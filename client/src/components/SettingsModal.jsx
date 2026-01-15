import React, { useState } from 'react';
import './SettingsModal.css';

export default function SettingsModal({ isOpen, onClose, settings, onSave }) {
    const [formData, setFormData] = useState({
        // Binance
        binanceApiKey: settings?.binanceApiKey || '',
        binanceApiSecret: settings?.binanceApiSecret || '',

        // Bybit
        bybitApiKey: settings?.bybitApiKey || '',
        bybitApiSecret: settings?.bybitApiSecret || '',

        // Configurações de Trading
        exchange: settings?.exchange || 'binance', // binance ou bybit
        tradeAmount: settings?.tradeAmount || 100, // USDT
        leverage: settings?.leverage || 10, // 1x a 100x

        // Usuário
        userId: settings?.userId || ''
    });

    const [activeTab, setActiveTab] = useState('binance');
    const [showKeys, setShowKeys] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = () => {
        // Validação básica
        if (formData.exchange === 'binance') {
            if (!formData.binanceApiKey || !formData.binanceApiSecret) {
                alert('⚠️ Preencha a API Key e Secret da Binance!');
                return;
            }
        } else if (formData.exchange === 'bybit') {
            if (!formData.bybitApiKey || !formData.bybitApiSecret) {
                alert('⚠️ Preencha a API Key e Secret da Bybit!');
                return;
            }
        }

        if (formData.tradeAmount < 10) {
            alert('⚠️ Valor mínimo: 10 USDT');
            return;
        }

        if (formData.leverage < 1 || formData.leverage > 100) {
            alert('⚠️ Alavancagem deve ser entre 1x e 100x');
            return;
        }

        onSave(formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="settings-modal-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="settings-header">
                    <div className="settings-title">
                        <span className="icon">⚙️</span>
                        <h2>Configurações</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Tabs */}
                <div className="settings-tabs">
                    <button
                        className={`tab ${activeTab === 'binance' ? 'active' : ''}`}
                        onClick={() => setActiveTab('binance')}
                    >
                        <span className="tab-icon">🟡</span>
                        Binance
                    </button>
                    <button
                        className={`tab ${activeTab === 'bybit' ? 'active' : ''}`}
                        onClick={() => setActiveTab('bybit')}
                    >
                        <span className="tab-icon">🟠</span>
                        Bybit
                    </button>
                    <button
                        className={`tab ${activeTab === 'trading' ? 'active' : ''}`}
                        onClick={() => setActiveTab('trading')}
                    >
                        <span className="tab-icon">💰</span>
                        Trading
                    </button>
                    <button
                        className={`tab ${activeTab === 'user' ? 'active' : ''}`}
                        onClick={() => setActiveTab('user')}
                    >
                        <span className="tab-icon">👤</span>
                        Usuário
                    </button>
                </div>

                {/* Content */}
                <div className="settings-content">
                    {/* Binance Tab */}
                    {activeTab === 'binance' && (
                        <div className="settings-section">
                            <h3>🟡 Binance API</h3>
                            <p className="section-description">
                                Configure suas credenciais da Binance para operar automaticamente
                            </p>

                            <div className="form-group">
                                <label>API Key</label>
                                <div className="input-with-toggle">
                                    <input
                                        type={showKeys ? "text" : "password"}
                                        value={formData.binanceApiKey}
                                        onChange={(e) => handleChange('binanceApiKey', e.target.value)}
                                        placeholder="Digite sua Binance API Key"
                                    />
                                    <button
                                        className="toggle-visibility"
                                        onClick={() => setShowKeys(!showKeys)}
                                    >
                                        {showKeys ? '👁️' : '🔒'}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>API Secret</label>
                                <div className="input-with-toggle">
                                    <input
                                        type={showKeys ? "text" : "password"}
                                        value={formData.binanceApiSecret}
                                        onChange={(e) => handleChange('binanceApiSecret', e.target.value)}
                                        placeholder="Digite sua Binance API Secret"
                                    />
                                </div>
                            </div>

                            <div className="info-box">
                                <span className="icon">ℹ️</span>
                                <div>
                                    <strong>Como obter?</strong>
                                    <p>1. Acesse sua conta Binance</p>
                                    <p>2. Vá em API Management</p>
                                    <p>3. Crie uma nova API Key</p>
                                    <p>4. Habilite "Enable Spot & Margin Trading"</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bybit Tab */}
                    {activeTab === 'bybit' && (
                        <div className="settings-section">
                            <h3>🟠 Bybit API</h3>
                            <p className="section-description">
                                Configure suas credenciais da Bybit para operar automaticamente
                            </p>

                            <div className="form-group">
                                <label>API Key</label>
                                <div className="input-with-toggle">
                                    <input
                                        type={showKeys ? "text" : "password"}
                                        value={formData.bybitApiKey}
                                        onChange={(e) => handleChange('bybitApiKey', e.target.value)}
                                        placeholder="Digite sua Bybit API Key"
                                    />
                                    <button
                                        className="toggle-visibility"
                                        onClick={() => setShowKeys(!showKeys)}
                                    >
                                        {showKeys ? '👁️' : '🔒'}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>API Secret</label>
                                <div className="input-with-toggle">
                                    <input
                                        type={showKeys ? "text" : "password"}
                                        value={formData.bybitApiSecret}
                                        onChange={(e) => handleChange('bybitApiSecret', e.target.value)}
                                        placeholder="Digite sua Bybit API Secret"
                                    />
                                </div>
                            </div>

                            <div className="info-box">
                                <span className="icon">ℹ️</span>
                                <div>
                                    <strong>Como obter?</strong>
                                    <p>1. Acesse sua conta Bybit</p>
                                    <p>2. Vá em API > Create New Key</p>
                                    <p>3. Habilite "USDT Perpetual" e "Spot"</p>
                                    <p>4. Configure IP whitelist (recomendado)</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Trading Tab */}
                    {activeTab === 'trading' && (
                        <div className="settings-section">
                            <h3>💰 Configurações de Trading</h3>
                            <p className="section-description">
                                Defina suas preferências de operação
                            </p>

                            <div className="form-group">
                                <label>Exchange Ativa</label>
                                <select
                                    value={formData.exchange}
                                    onChange={(e) => handleChange('exchange', e.target.value)}
                                >
                                    <option value="binance">🟡 Binance</option>
                                    <option value="bybit">🟠 Bybit</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Valor por Trade (USDT)</label>
                                <input
                                    type="number"
                                    min="10"
                                    step="10"
                                    value={formData.tradeAmount}
                                    onChange={(e) => handleChange('tradeAmount', parseFloat(e.target.value))}
                                    placeholder="100"
                                />
                                <small>Mínimo: 10 USDT</small>
                            </div>

                            <div className="form-group">
                                <label>Alavancagem (Leverage)</label>
                                <div className="leverage-control">
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={formData.leverage}
                                        onChange={(e) => handleChange('leverage', parseInt(e.target.value))}
                                    />
                                    <div className="leverage-display">
                                        <span className="leverage-value">{formData.leverage}x</span>
                                    </div>
                                </div>
                                <small>1x (sem alavancagem) até 100x (risco extremo)</small>
                            </div>

                            <div className="calculation-box">
                                <h4>📊 Resumo da Operação:</h4>
                                <div className="calc-row">
                                    <span>Valor Investido:</span>
                                    <span className="value">${formData.tradeAmount.toFixed(2)}</span>
                                </div>
                                <div className="calc-row">
                                    <span>Alavancagem:</span>
                                    <span className="value">{formData.leverage}x</span>
                                </div>
                                <div className="calc-row highlight">
                                    <span>Exposição Total:</span>
                                    <span className="value">${(formData.tradeAmount * formData.leverage).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* User Tab */}
                    {activeTab === 'user' && (
                        <div className="settings-section">
                            <h3>👤 Identificação do Usuário</h3>
                            <p className="section-description">
                                Cada usuário tem suas próprias configurações isoladas
                            </p>

                            <div className="form-group">
                                <label>ID do Usuário</label>
                                <input
                                    type="text"
                                    value={formData.userId}
                                    onChange={(e) => handleChange('userId', e.target.value)}
                                    placeholder="Ex: usuario123"
                                />
                                <small>Identificador único para suas configurações</small>
                            </div>

                            <div className="info-box success">
                                <span className="icon">✅</span>
                                <div>
                                    <strong>Sistema Multi-Usuário</strong>
                                    <p>• Cada usuário tem suas próprias API keys</p>
                                    <p>• Configurações isoladas por ID</p>
                                    <p>• Sem interferência entre usuários</p>
                                    <p>• Dados salvos localmente</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="settings-footer">
                    <button className="btn-cancel" onClick={onClose}>
                        Cancelar
                    </button>
                    <button className="btn-save" onClick={handleSave}>
                        💾 Salvar Configurações
                    </button>
                </div>
            </div>
        </div>
    );
}
