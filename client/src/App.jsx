import { useState, useEffect, useRef } from 'react';
import './App.css';
import TradingChart from './components/TradingChart';
import Dashboard from './components/Dashboard';
import TradePanel from './components/TradePanel';
import ControlPanel from './components/ControlPanel';
import AIStats from './components/AIStats';
import SettingsModal from './components/SettingsModal';

const WS_URL = 'ws://localhost:3001';

function App() {
    const [connected, setConnected] = useState(false);
    const [data, setData] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [userSettings, setUserSettings] = useState(() => {
        // Carregar configurações do localStorage
        const saved = localStorage.getItem('trading_settings');
        return saved ? JSON.parse(saved) : {
            userId: '',
            exchange: 'binance',
            binanceApiKey: '',
            binanceApiSecret: '',
            bybitApiKey: '',
            bybitApiSecret: '',
            tradeAmount: 100,
            leverage: 10
        };
    });
    const wsRef = useRef(null);

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const connectWebSocket = () => {
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log('✅ Conectado ao servidor');
            setConnected(true);
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            setData(message);
        };

        ws.onerror = (error) => {
            console.error('❌ Erro WebSocket:', error);
        };

        ws.onclose = () => {
            console.log('🔌 Desconectado do servidor');
            setConnected(false);

            // Reconectar após 3 segundos
            setTimeout(connectWebSocket, 3000);
        };

        wsRef.current = ws;
    };

    const sendMessage = (type, payload = {}) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type, ...payload }));
        }
    };

    const handleChangePair = (pair) => {
        sendMessage('CHANGE_PAIR', { pair });
    };

    const handleChangeInterval = (interval) => {
        sendMessage('CHANGE_INTERVAL', { interval });
    };

    const handleToggleAutoTrading = (enabled) => {
        sendMessage('TOGGLE_AUTO_TRADING', { enabled });
    };

    const handleManualClose = () => {
        sendMessage('MANUAL_CLOSE');
    };

    // Função para salvar configurações
    const handleSaveSettings = (newSettings) => {
        // Salvar no localStorage
        localStorage.setItem('trading_settings', JSON.stringify(newSettings));
        setUserSettings(newSettings);

        // Enviar para o servidor
        sendMessage('UPDATE_SETTINGS', { settings: newSettings });

        console.log('✅ Configurações salvas:', newSettings);
    };

    if (!data) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <h2>Conectando ao sistema...</h2>
                <p>{connected ? 'Carregando dados...' : 'Aguardando conexão...'}</p>
            </div>
        );
    }

    return (
        <div className="app">
            {/* Header */}
            <header className="app-header">
                <div className="header-left">
                    <h1>
                        <span className="icon">🤖</span>
                        AI TRADING SYSTEM
                    </h1>
                    <div className={`status-badge ${connected ? 'connected' : 'disconnected'}`}>
                        <span className="status-dot"></span>
                        {connected ? 'Conectado' : 'Desconectado'}
                    </div>
                </div>

                {/* Botão de Configurações ⚙️ */}
                <button
                    className="settings-button"
                    onClick={() => setShowSettings(true)}
                    title="Configurações"
                >
                    <span className="settings-icon">⚙️</span>
                </button>

                <ControlPanel
                    activePair={data.pair}
                    activeInterval={data.interval}
                    autoTrading={data.config?.autoTrading}
                    onChangePair={handleChangePair}
                    onChangeInterval={handleChangeInterval}
                    onToggleAutoTrading={handleToggleAutoTrading}
                />
            </header>

            {/* Main Content */}
            <div className="app-content">
                {/* Left Sidebar - Dashboard */}
                <aside className="sidebar sidebar-left">
                    <Dashboard
                        balance={data.balance}
                        stats={data.stats}
                        currentTrade={data.currentTrade}
                    />
                </aside>

                {/* Center - Trading Chart */}
                <main className="main-content">
                    <TradingChart
                        candles={data.candles}
                        candles4h={data.candles4h}
                        analysis={data.analysis}
                        currentTrade={data.currentTrade}
                    />
                </main>

                {/* Right Sidebar - Trade Info */}
                <aside className="sidebar sidebar-right">
                    <TradePanel
                        analysis={data.analysis}
                        currentTrade={data.currentTrade}
                        recentTrades={data.trades}
                        learningReports={data.learningReports || []}
                        onManualClose={handleManualClose}
                    />

                    <AIStats aiStats={data.aiStats} />
                </aside>
            </div>

            {/* Modal de Configurações */}
            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                settings={userSettings}
                onSave={handleSaveSettings}
            />
        </div>
    );
}

export default App;
