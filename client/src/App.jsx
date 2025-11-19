import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { ArrowUp, ArrowDown, Activity, Zap, Settings, DollarSign, Shield, Target, Play, Pause, Square, Trophy, Clock, TrendingUp, Lock, Wallet, Layers } from 'lucide-react';

function App() {
    const chartContainerRef = useRef();
    const chartRef = useRef();
    const seriesRef = useRef();
    const volumeSeriesRef = useRef();
    const fvgLinesRef = useRef([]);
    const wsRef = useRef(null);

    const [data, setData] = useState({
        direction: 'NEUTRO',
        confidence: 0,
        reason: 'Aguardando dados...',
        zones: [],
        stopLoss: 0,
        takeProfit: 0,
        riskReward: '0:0'
    });
    const [scannerData, setScannerData] = useState([]);
    const [activePair, setActivePair] = useState('BTCUSDT');
    const [activeInterval, setActiveInterval] = useState('1m');
    const [connectionStatus, setConnectionStatus] = useState('Desconectado');
    const [showConfig, setShowConfig] = useState(false);

    // Estado do Bot
    const [botStatus, setBotStatus] = useState('IDLE');
    const [performance, setPerformance] = useState({ wins: 0, losses: 0 });
    const [activeTrade, setActiveTrade] = useState(null);
    const [candleAnalysis, setCandleAnalysis] = useState(null);

    const [config, setConfig] = useState({
        apiKey: '',
        apiSecret: '',
        riskPerTrade: 1,
        leverage: 10,
        balance: 1000,
        maxPositions: 1 // Padrão 1 conforme solicitado
    });

    // Inicialização do Gráfico
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: { background: { type: ColorType.Solid, color: '#161831' }, textColor: '#d1d5db' },
            grid: { vertLines: { color: 'rgba(42, 46, 57, 0.2)' }, horzLines: { color: 'rgba(42, 46, 57, 0.2)' } },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            timeScale: { timeVisible: true, secondsVisible: false },
        });

        const newSeries = chart.addCandlestickSeries({
            upColor: '#00ff9d',
            downColor: '#ff0055',
            borderVisible: false,
            wickUpColor: '#00ff9d',
            wickDownColor: '#ff0055'
        });

        const volumeSeries = chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
        });
        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        chartRef.current = chart;
        seriesRef.current = newSeries;
        volumeSeriesRef.current = volumeSeries;

        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0 || entries[0].target !== chartContainerRef.current) { return; }
            const newRect = entries[0].contentRect;
            chart.applyOptions({ height: newRect.height, width: newRect.width });
        });

        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
        };
    }, []);

    // WebSocket
    useEffect(() => {
        let ws = null;
        let reconnectTimeout = null;

        const connect = () => {
            ws = new WebSocket('ws://localhost:3001');
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('WebSocket Connected');
                setConnectionStatus('Conectado');
                ws.send(JSON.stringify({ type: 'CHANGE_PAIR', pair: activePair }));
                ws.send(JSON.stringify({ type: 'CHANGE_INTERVAL', interval: activeInterval }));
            };

            ws.onclose = () => {
                console.log('WebSocket Disconnected. Reconnecting...');
                setConnectionStatus('Desconectado');
                reconnectTimeout = setTimeout(connect, 3000);
            };

            ws.onerror = (err) => {
                console.error('WebSocket Error:', err);
                ws.close();
            };

            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);

                if (message.type === 'HISTORY') {
                    console.log('Received HISTORY:', message.data);
                    if (seriesRef.current && volumeSeriesRef.current) {
                        const formattedHistory = message.data.map(c => ({
                            time: c.closeTime / 1000,
                            open: c.open,
                            high: c.high,
                            low: c.low,
                            close: c.close
                        }));

                        const volumeData = message.data.map(c => ({
                            time: c.closeTime / 1000,
                            value: c.volume,
                            color: c.close >= c.open ? 'rgba(0, 255, 157, 0.5)' : 'rgba(255, 0, 85, 0.5)'
                        }));

                        formattedHistory.sort((a, b) => a.time - b.time);
                        volumeData.sort((a, b) => a.time - b.time);

                        console.log('Formatted History:', formattedHistory);
                        seriesRef.current.setData(formattedHistory);
                        volumeSeriesRef.current.setData(volumeData);

                        chartRef.current.timeScale().fitContent();
                        window.debugChart = {
                            series: seriesRef.current,
                            chart: chartRef.current,
                            data: formattedHistory,
                            ws: ws
                        };
                    }
                }

                if (message.type === 'UPDATE') {
                    if (message.pair !== activePair) return;

                    const candle = {
                        time: message.candle.closeTime / 1000,
                        open: message.candle.open,
                        high: message.candle.high,
                        low: message.candle.low,
                        close: message.candle.close
                    };

                    const volumeUpdate = {
                        time: message.candle.closeTime / 1000,
                        value: message.candle.volume,
                        color: message.candle.close >= message.candle.open ? 'rgba(0, 255, 157, 0.5)' : 'rgba(255, 0, 85, 0.5)'
                    };

                    if (seriesRef.current) seriesRef.current.update(candle);
                    if (volumeSeriesRef.current) volumeSeriesRef.current.update(volumeUpdate);

                    setData(prev => ({
                        ...message.prediction,
                        lastUpdate: Date.now()
                    }));
                    setScannerData(message.scanner || []);
                    setCandleAnalysis(message.candleAnalysis);

                    if (message.bot) {
                        setBotStatus(message.bot.status);
                        setPerformance(message.bot.performance);
                        setActiveTrade(message.bot.activeTrade);
                    }

                    updateChartLines(message.prediction);
                }
            };
        };

        connect();

        return () => {
            if (ws) ws.close();
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, [activePair, activeInterval]);

    const updateChartLines = (prediction) => {
        if (!seriesRef.current || !chartRef.current) return;

        // Remove linhas antigas
        fvgLinesRef.current.forEach(line => {
            try {
                seriesRef.current.removePriceLine(line);
            } catch (e) { /* Ignora erro se linha já não existe */ }
        });
        fvgLinesRef.current = [];

        if (prediction.sweep) {
            const color = prediction.sweep.type === 'SWEEP_BULL' ? '#00ff9d' : '#ff0055';
            const sweepLine = seriesRef.current.createPriceLine({
                price: prediction.sweep.price,
                color: color,
                lineWidth: 1,
                lineStyle: 3,
                axisLabelVisible: true,
                title: 'LIQUIDITY SWEEP',
            });
            fvgLinesRef.current.push(sweepLine);
        }

        if (prediction.zones && prediction.zones.length > 0) {
            prediction.zones.forEach(zone => {
                let colorTop, colorBottom, colorCE, title;

                if (zone.status === 'ACTIVE') {
                    if (zone.type === 'BISI') {
                        colorTop = '#00ff9d'; colorBottom = '#00ff9d'; colorCE = '#00ff9d';
                        title = 'FVG ALTA';
                    } else {
                        colorTop = '#ff0055'; colorBottom = '#ff0055'; colorCE = '#ff0055';
                        title = 'FVG BAIXA';
                    }
                } else {
                    if (zone.type === 'IFVG_BULL') {
                        colorTop = '#8b5cf6'; colorBottom = '#8b5cf6'; colorCE = '#8b5cf6';
                        title = 'IFVG (SUPORTE)';
                    } else {
                        colorTop = '#f97316'; colorBottom = '#f97316'; colorCE = '#f97316';
                        title = 'IFVG (RESISTÊNCIA)';
                    }
                }

                if (zone.killzone) title += ` [${zone.killzone}]`;

                const l1 = seriesRef.current.createPriceLine({ price: zone.top, color: colorTop, lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });
                const l2 = seriesRef.current.createPriceLine({ price: zone.bottom, color: colorBottom, lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });
                const l3 = seriesRef.current.createPriceLine({ price: zone.ce, color: colorCE, lineWidth: 2, lineStyle: zone.status === 'INVERSED' ? 1 : 0, axisLabelVisible: true, title: `${title} CE` });

                fvgLinesRef.current.push(l1, l2, l3);
            });
        }

        if (prediction.stopLoss > 0) {
            const slLine = seriesRef.current.createPriceLine({ price: prediction.stopLoss, color: '#ef4444', lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: 'STOP LOSS' });
            fvgLinesRef.current.push(slLine);
        }

        if (prediction.takeProfit > 0) {
            const tpLine = seriesRef.current.createPriceLine({ price: prediction.takeProfit, color: '#22c55e', lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: 'TAKE PROFIT' });
            fvgLinesRef.current.push(tpLine);
        }
    };

    const handleBotControl = (action) => {
        let status = 'IDLE';
        if (action === 'START') status = 'RUNNING';
        if (action === 'PAUSE') status = 'PAUSED';
        if (action === 'STOP') status = 'IDLE';

        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ type: 'SET_BOT_STATUS', status }));
        }
    };

    const handleIntervalChange = (interval) => {
        setActiveInterval(interval);
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ type: 'CHANGE_INTERVAL', interval }));
        }
    };

    const calculateProfitPercent = () => {
        if (!activeTrade || !data) return 0;
        const currentPrice = data.indicators?.currentPrice || 0;
        if (activeTrade.type === 'COMPRA') {
            return (((currentPrice - activeTrade.entry) / activeTrade.entry) * 100).toFixed(2);
        } else {
            return (((activeTrade.entry - currentPrice) / activeTrade.entry) * 100).toFixed(2);
        }
    };

    // if (!data) return <div className="flex items-center justify-center h-screen bg-[#0a0b1e] text-white animate-pulse">Carregando ADKBOT System...</div>;

    const isUp = data.direction === 'COMPRA';
    const isDown = data.direction === 'VENDA';
    const winRate = performance.wins + performance.losses > 0 ? ((performance.wins / (performance.wins + performance.losses)) * 100).toFixed(1) : 0;

    return (
        <div className="flex h-screen bg-[#0a0b1e] text-white overflow-hidden font-sans">

            {/* Sidebar Scanner */}
            <div className="w-64 bg-[#161831] border-r border-gray-800 flex flex-col">
                <div className="p-4 border-b border-gray-800 font-bold text-[#00ff9d] flex items-center gap-2">
                    <Activity size={18} /> SCANNER PRO
                </div>
                <div className="flex-1 overflow-y-auto">
                    {scannerData.map((item) => (
                        <div
                            key={item.symbol}
                            onClick={() => setActivePair(item.symbol)}
                            className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors ${activePair === item.symbol ? 'bg-gray-800 border-l-4 border-[#00ff9d]' : ''}`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold">{item.symbol.replace('USDT', '')}</span>
                                <span className="text-xs text-gray-400">${item.price.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className={`${item.rsi < 30 ? 'text-[#00ff9d]' : item.rsi > 70 ? 'text-[#ff0055]' : 'text-gray-500'}`}>
                                    RSI: {item.rsi}
                                </span>
                                {item.fvg && (
                                    <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-[10px]">
                                        {item.fvg.includes('IFVG') ? 'IFVG' : 'FVG'}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Header */}
                <header className="h-16 border-b border-gray-800 flex justify-between items-center px-6 bg-[#161831]">
                    <div className="flex items-center gap-6">
                        <h1 className="font-bold text-xl tracking-wider">ADKBOT <span className="text-[#00ff9d] text-xs align-top">v2.0</span></h1>

                        {/* Timeframe Selector */}
                        <div className="flex bg-[#0a0b1e] rounded-lg p-1 gap-1">
                            {['1m', '5m', '15m'].map(int => (
                                <button
                                    key={int}
                                    onClick={() => handleIntervalChange(int)}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${activeInterval === int ? 'bg-[#00ff9d] text-black' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {int.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        <div className={`px-2 py-0.5 rounded text-xs font-bold ${connectionStatus === 'Conectado' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                            {connectionStatus}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                            {data.lastUpdate ? `Última att: ${new Date(data.lastUpdate).toLocaleTimeString()}` : ''}
                        </div>
                    </div>

                    {/* Bot Controls & Wallet */}
                    <div className="flex items-center gap-4">

                        {/* Wallet Balance */}
                        <div className="flex items-center gap-2 bg-[#0a0b1e] px-4 py-2 rounded-lg border border-gray-700">
                            <Wallet size={16} className="text-[#00ff9d]" />
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] text-gray-400 uppercase tracking-wider">Carteira</span>
                                <span className="text-white font-bold font-mono leading-none">${config.balance.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Settings Button */}
                        <button
                            onClick={() => setShowConfig(true)}
                            className="p-2 bg-[#0a0b1e] border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
                        >
                            <Settings size={20} />
                        </button>

                        <div className="h-8 w-px bg-gray-700 mx-2"></div>

                        {/* Scoreboard */}
                        <div className="flex items-center gap-2 bg-[#0a0b1e] px-4 py-2 rounded-lg border border-gray-700">
                            <div className="flex flex-col items-center mr-4 border-r border-gray-700 pr-4">
                                <span className="text-[8px] text-gray-400 uppercase">Wins</span>
                                <span className="text-[#00ff9d] font-bold text-lg leading-none">{performance.wins}</span>
                            </div>
                            <div className="flex flex-col items-center mr-4 border-r border-gray-700 pr-4">
                                <span className="text-[8px] text-gray-400 uppercase">Losses</span>
                                <span className="text-[#ff0055] font-bold text-lg leading-none">{performance.losses}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[8px] text-gray-400 uppercase">Win Rate</span>
                                <span className="text-yellow-400 font-bold text-lg leading-none">{winRate}%</span>
                            </div>
                        </div>

                        {/* Play/Pause/Stop */}
                        <div className="flex gap-2">
                            {botStatus === 'IDLE' || botStatus === 'PAUSED' ? (
                                <button onClick={() => handleBotControl('START')} className="flex items-center gap-2 bg-[#00ff9d] text-black px-4 py-2 rounded font-bold hover:bg-[#00cc7d] transition-colors">
                                    <Play size={16} /> INICIAR
                                </button>
                            ) : (
                                <button onClick={() => handleBotControl('PAUSE')} className="flex items-center gap-2 bg-yellow-500 text-black px-4 py-2 rounded font-bold hover:bg-yellow-600 transition-colors">
                                    <Pause size={16} /> PAUSAR
                                </button>
                            )}
                            <button onClick={() => handleBotControl('STOP')} className="flex items-center gap-2 bg-[#ff0055] text-white px-4 py-2 rounded font-bold hover:bg-[#cc0044] transition-colors">
                                <Square size={16} /> PARAR
                            </button>
                        </div>
                    </div>
                </header>

                {/* Grid Layout */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 min-h-0">

                    {/* Chart Area */}
                    <div className="lg:col-span-2 relative border-r border-gray-800 flex flex-col h-full">
                        <div ref={chartContainerRef} id="tv-chart-container" className="flex-1 w-full" />

                        {/* Floating Info */}
                        <div className="absolute top-4 left-4 bg-[#161831]/90 backdrop-blur p-3 rounded border border-gray-700 text-xs">
                            <div className="font-bold mb-2 text-gray-400">LEGENDA</div>
                            <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full bg-[#00ff9d]"></span> FVG Alta</div>
                            <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full bg-[#ff0055]"></span> FVG Baixa</div>
                            <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full bg-[#8b5cf6]"></span> IFVG Suporte</div>
                            <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full bg-[#f97316]"></span> IFVG Resistência</div>
                            <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 border border-dotted border-white"></span> Liquidity Sweep</div>
                        </div>

                        {/* Active Trade Overlay */}
                        {activeTrade && (
                            <div className="absolute bottom-4 right-4 bg-[#161831]/95 backdrop-blur p-4 rounded-xl border-2 border-[#00ff9d] shadow-lg shadow-[#00ff9d]/20">
                                <div className="text-[#00ff9d] font-bold text-sm mb-1 flex items-center gap-2">
                                    <Activity size={16} className="animate-pulse" /> TRADE ATIVO
                                </div>
                                <div className="text-2xl font-black text-white mb-2">
                                    {activeTrade.type}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                    <div>
                                        <div className="text-gray-400">Entrada</div>
                                        <div className="text-white font-mono">${activeTrade.entry.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-400">Lucro</div>
                                        <div className={`font-mono font-bold ${parseFloat(calculateProfitPercent()) >= 0 ? 'text-[#00ff9d]' : 'text-[#ff0055]'}`}>
                                            {calculateProfitPercent()}%
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                    <Target size={12} /> Alvo: <span className="text-[#00ff9d]">${activeTrade.tp.toFixed(2)}</span>
                                </div>
                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                    <Shield size={12} /> SL: <span className="text-[#ff0055]">${activeTrade.sl.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel */}
                    <div className="bg-[#0a0b1e] p-6 flex flex-col gap-4 overflow-y-auto">

                        {/* Signal Box */}
                        <div className={`p-6 rounded-2xl border-2 text-center ${isUp ? 'border-[#00ff9d] bg-[#00ff9d]/10' : isDown ? 'border-[#ff0055] bg-[#ff0055]/10' : 'border-gray-700 bg-gray-800/30'}`}>
                            <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-2">ANÁLISE IA</h3>
                            <div className={`text-3xl font-black mb-2 ${isUp ? 'text-[#00ff9d]' : isDown ? 'text-[#ff0055]' : 'text-gray-400'}`}>
                                {data.direction}
                            </div>
                            <div className="text-sm text-gray-300 mb-3">{data.reason}</div>
                            <div className="flex justify-center gap-4 text-xs">
                                <div className="bg-[#161831] px-3 py-1 rounded">
                                    <span className="text-gray-400">Confiança: </span>
                                    <span className="text-white font-bold">{data.confidence}%</span>
                                </div>
                                <div className="bg-[#161831] px-3 py-1 rounded">
                                    <span className="text-gray-400">R:R: </span>
                                    <span className="text-yellow-400 font-bold">{data.riskReward || '1:3'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Candle Analysis */}
                        {candleAnalysis && (
                            <div className="bg-[#161831] p-4 rounded-xl border border-gray-800">
                                <div className="flex items-center gap-2 text-[#00ff9d] text-xs font-bold mb-3">
                                    <TrendingUp size={14} /> ANÁLISE DE SEQUÊNCIA
                                </div>
                                <div className="space-y-2">
                                    {['seq3', 'seq5', 'seq8'].map((key, idx) => {
                                        const seq = candleAnalysis[key];
                                        const label = key === 'seq3' ? '3 Velas' : key === 'seq5' ? '5 Velas' : '8 Velas';

                                        let colorClass = 'bg-yellow-500';
                                        let textClass = 'text-yellow-500';

                                        if (seq?.direction === 'ALTA') {
                                            colorClass = 'bg-[#00ff9d]';
                                            textClass = 'text-[#00ff9d]';
                                        } else if (seq?.direction === 'BAIXA') {
                                            colorClass = 'bg-[#ff0055]';
                                            textClass = 'text-[#ff0055]';
                                        }

                                        return (
                                            <div key={key} className="bg-[#0a0b1e] p-2 rounded">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs text-gray-400">{label}</span>
                                                    <span className={`text-xs font-bold ${textClass}`}>
                                                        {seq?.direction || 'NEUTRO'}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-1.5">
                                                    <div
                                                        className={`h-1.5 rounded-full ${colorClass}`}
                                                        style={{ width: `${seq?.strength || 0}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Bot Status Panel */}
                        <div className="bg-[#161831] p-4 rounded-xl border border-gray-800">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-bold text-gray-400 flex items-center gap-2">
                                    <Zap size={14} /> STATUS DO BOT
                                </span>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${botStatus === 'RUNNING' ? 'bg-[#00ff9d] text-black' : botStatus === 'PAUSED' ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'}`}>
                                    {botStatus}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 text-center">
                                {botStatus === 'RUNNING' ? '🎯 Operando com precisão cirúrgica' : '⏸️ Aguardando comando para iniciar'}
                            </div>
                        </div>

                        {/* FVG Details */}
                        {data.zones && data.zones.length > 0 && (
                            <div className="bg-[#161831] p-4 rounded-xl border border-gray-800">
                                <div className="flex items-center gap-2 text-yellow-500 text-xs font-bold mb-2">
                                    <Target size={14} /> ZONAS MONITORADAS
                                </div>
                                {data.zones.slice(0, 2).map((zone, idx) => (
                                    <div key={idx} className="grid grid-cols-2 gap-2 text-xs mb-2 last:mb-0">
                                        <div className="bg-gray-800 p-2 rounded">
                                            <div className="text-gray-500">Tipo</div>
                                            <div className="font-bold">{zone.type} {zone.killzone ? `(${zone.killzone})` : ''}</div>
                                        </div>
                                        <div className="bg-gray-800 p-2 rounded">
                                            <div className="text-gray-500">CE (Entrada)</div>
                                            <div className="font-bold text-yellow-400">${zone.ce.toFixed(2)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Configuration Modal */}
            {showConfig && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#161831] p-6 rounded-2xl border border-gray-700 w-96 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                                <Settings size={20} className="text-[#00ff9d]" /> Configurações
                            </h2>
                            <button onClick={() => setShowConfig(false)} className="text-gray-500 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">API Key (Binance)</label>
                                <input
                                    type="password"
                                    className="w-full bg-[#0a0b1e] border border-gray-700 rounded p-2 text-sm text-white focus:border-[#00ff9d] outline-none"
                                    placeholder="Cole sua API Key aqui..."
                                    value={config.apiKey}
                                    onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">API Secret</label>
                                <input
                                    type="password"
                                    className="w-full bg-[#0a0b1e] border border-gray-700 rounded p-2 text-sm text-white focus:border-[#00ff9d] outline-none"
                                    placeholder="Cole seu Secret aqui..."
                                    value={config.apiSecret}
                                    onChange={e => setConfig({ ...config, apiSecret: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Banca Inicial ($)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-[#0a0b1e] border border-gray-700 rounded p-2 text-sm text-white focus:border-[#00ff9d] outline-none"
                                        value={config.balance}
                                        onChange={e => setConfig({ ...config, balance: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Risco por Trade (%)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-[#0a0b1e] border border-gray-700 rounded p-2 text-sm text-white focus:border-[#00ff9d] outline-none"
                                        value={config.riskPerTrade}
                                        onChange={e => setConfig({ ...config, riskPerTrade: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Máximo de Posições Simultâneas</label>
                                <div className="flex items-center gap-2">
                                    <Layers size={16} className="text-gray-400" />
                                    <input
                                        type="number"
                                        min="1" max="5"
                                        className="w-full bg-[#0a0b1e] border border-gray-700 rounded p-2 text-sm text-white focus:border-[#00ff9d] outline-none"
                                        value={config.maxPositions}
                                        onChange={e => setConfig({ ...config, maxPositions: parseInt(e.target.value) })}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">Recomendado: 1 (Foco Total)</p>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Alavancagem (x)</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="1" max="125"
                                        className="w-full accent-[#00ff9d] h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        value={config.leverage}
                                        onChange={e => setConfig({ ...config, leverage: parseInt(e.target.value) })}
                                    />
                                    <div className="text-right text-sm font-bold text-[#00ff9d] w-12">{config.leverage}x</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfig(false)}
                                className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => setShowConfig(false)}
                                className="px-4 py-2 rounded bg-[#00ff9d] text-black font-bold hover:bg-[#00cc7d] text-sm transition-colors shadow-lg shadow-[#00ff9d]/20"
                            >
                                Salvar Configurações
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default App;
