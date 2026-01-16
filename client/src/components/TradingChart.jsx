import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import './TradingChart.css';

export default function TradingChart({ candles, candles4h, analysis, currentTrade }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const candleSeriesRef = useRef(null);
    const pccLineRef = useRef(null);
    const quadrantLinesRef = useRef([]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Criar gráfico
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: '#0a0e27' },
                textColor: '#a0aec0',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    color: '#00d4ff',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#00d4ff',
                },
                horzLine: {
                    color: '#00d4ff',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#00d4ff',
                },
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.2,
                },
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                timeVisible: true,
                secondsVisible: false,
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
        });

        // Série de velas
        const candleSeries = chart.addCandlestickSeries({
            upColor: '#00ff88',
            downColor: '#ff3366',
            borderUpColor: '#00ff88',
            borderDownColor: '#ff3366',
            wickUpColor: '#00ff88',
            wickDownColor: '#ff3366',
        });

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;

        // Resize observer com verificação de null
        const resizeObserver = new ResizeObserver(() => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        });

        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, []);

    // 🔥 Dedupe: não redesenhar se já desenhou a mesma coisa
    const lastDrawKeyRef = useRef("");
    const drawTimerRef = useRef(null);

    useEffect(() => {
        if (!candleSeriesRef.current || !candles || candles.length === 0) return;

        // Remover velas duplicadas e ordenar por tempo
        const uniqueCandles = [];
        const seenTimes = new Set();

        candles.forEach(candle => {
            const time = Math.floor(candle.time / 1000);
            if (!seenTimes.has(time)) {
                seenTimes.add(time);
                uniqueCandles.push({
                    time,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                });
            }
        });

        // Ordenar por tempo (ascendente)
        const formattedData = uniqueCandles.sort((a, b) => a.time - b.time);

        try {
            candleSeriesRef.current.setData(formattedData);

            // 🔥 Debounce: esperar 200ms antes de redesenhar
            clearTimeout(drawTimerRef.current);

            drawTimerRef.current = setTimeout(() => {
                // 🔥 Criar chave única baseada nos dados CRT
                const drawKey = crt ? `${crt.pcc}-${crt.bias?.direction}-${candles.length}` : '';

                // ✅ Só redesenhar se a chave mudou
                if (lastDrawKeyRef.current !== drawKey) {
                    console.log('🎨 Desenhando CRT (nova chave):', drawKey);
                    lastDrawKeyRef.current = drawKey;

                    // Adicionar marcações CRT
                    addCRTMarkers();
                    addCRTLines();
                } else {
                    console.log('⏭️ Pulando redesenho (mesma chave)');
                }
            }, 200);

        } catch (error) {
            console.error('Erro ao atualizar gráfico:', error);
        }

        // Cleanup do timer
        return () => clearTimeout(drawTimerRef.current);

    }, [candles, candles4h, analysis, currentTrade]);

    const addCRTMarkers = () => {
        if (!analysis?.crt || !candleSeriesRef.current) return;

        const markers = [];
        const crt = analysis.crt;

        // 🎯 Marcador de MANIPULAÇÃO (Mais importante!)
        if (crt.manipulation?.isValid) {
            const lastCandle = candles[candles.length - 1];
            const isBullish = crt.manipulation.type === 'BULLISH_MANIPULATION';

            markers.push({
                time: Math.floor(lastCandle.time / 1000),
                position: isBullish ? 'belowBar' : 'aboveBar',
                color: isBullish ? '#00ff88' : '#ff3366',
                shape: 'arrowUp',
                text: isBullish ? '📈 COMPRA!' : '📉 VENDA!',
                size: 2,
            });
        }

        // 🐢 Turtle Soup
        if (crt.turtleSoup) {
            const lastCandle = candles[candles.length - 1];
            const isBullish = crt.turtleSoup.type === 'BULLISH_TURTLE_SOUP';

            markers.push({
                time: Math.floor(lastCandle.time / 1000),
                position: isBullish ? 'belowBar' : 'aboveBar',
                color: '#ffaa00',
                shape: 'circle',
                text: '🐢 Turtle Soup',
                size: 1.5,
            });
        }

        // 🎯 Sinal de Entrada
        if (analysis.signals?.length > 0 && !currentTrade) {
            const signal = analysis.signals[0];
            const lastCandle = candles[candles.length - 1];

            markers.push({
                time: Math.floor(lastCandle.time / 1000),
                position: signal.type === 'LONG' ? 'belowBar' : 'aboveBar',
                color: signal.type === 'LONG' ? '#00ff88' : '#ff3366',
                shape: 'arrowUp',
                text: `🎯 ${signal.type} (${(signal.confidence * 100).toFixed(0)}%)`,
                size: 2.5,
            });
        }

        candleSeriesRef.current.setMarkers(markers);
    };

    const addCRTLines = () => {
        if (!analysis?.crt || !chartRef.current || !candleSeriesRef.current) return;
        if (!candles || candles.length === 0) return;

        const crt = analysis.crt;

        try {
            // Remover linhas antigas com validação completa
            if (pccLineRef.current && chartRef.current) {
                try {
                    // Verificar se a série ainda existe antes de remover
                    if (typeof pccLineRef.current.setData === 'function') {
                        chartRef.current.removeSeries(pccLineRef.current);
                    }
                } catch (e) {
                    // Silenciar erro - linha já foi removida
                } finally {
                    pccLineRef.current = null;
                }
            }

            // Remover linhas de quadrantes com validação
            const validLines = quadrantLinesRef.current.filter(line => line && typeof line.setData === 'function');
            validLines.forEach(line => {
                try {
                    if (chartRef.current) {
                        chartRef.current.removeSeries(line);
                    }
                } catch (e) {
                    // Silenciar erro - linha já foi removida
                }
            });
            quadrantLinesRef.current = [];

            // 🔥 CALCULAR TIMESTAMPS DA ÚLTIMA VELA FECHADA!
            // Pegar a penúltima vela (última fechada)
            const lastClosedCandle = candles[candles.length - 2];
            const startTime = Math.floor(lastClosedCandle.time / 1000);
            // Estender linha até MUITO à frente (240 minutos = 4 horas)
            const endTime = startTime + (240 * 60); // 240 velas de 1m à frente

            // 🎯 LINHA PCC (Previous Candle Close) - MAIS IMPORTANTE!
            if (crt.pcc && typeof crt.pcc === 'number' && !isNaN(crt.pcc)) {
                const biasColor = crt.bias?.direction === 'BULLISH' ? '#00ff88' : '#ff3366';

                const pccLine = chartRef.current.addLineSeries({
                    color: biasColor,
                    lineWidth: 3,
                    lineStyle: 2, // Dashed
                    title: 'PCC',
                    priceLineVisible: true,
                    lastValueVisible: true,
                });

                // Criar linha: da vela fechada até muito à frente
                let pccData = [
                    { time: startTime, value: crt.pcc },
                    { time: endTime, value: crt.pcc }
                ];

                if (pccData.length > 0) {
                    pccLine.setData(pccData);
                    pccLineRef.current = pccLine;
                }
            }


            // 📊 OVERLAY DA VELA 4H - MOSTRAR ÁREA COMPLETA
            if (crt.currentH4 &&
                typeof crt.currentH4.open === 'number' &&
                typeof crt.currentH4.close === 'number' &&
                typeof crt.currentH4.high === 'number' &&
                typeof crt.currentH4.low === 'number') {

                // Linha de ABERTURA da 4H (Open)
                const openLine = chartRef.current.addLineSeries({
                    color: '#00d4ff',
                    lineWidth: 2,
                    lineStyle: 0, // Solid
                    priceLineVisible: false,
                    lastValueVisible: false,
                });

                // Linha de FECHAMENTO da 4H (Close)
                const closeLine = chartRef.current.addLineSeries({
                    color: crt.currentH4.close > crt.currentH4.open ? '#00ff88' : '#ff3366',
                    lineWidth: 2,
                    lineStyle: 0, // Solid
                    priceLineVisible: false,
                    lastValueVisible: false,
                });

                // Linha de HIGH da 4H (Topo)
                const highLine = chartRef.current.addLineSeries({
                    color: '#9d4edd',
                    lineWidth: 1,
                    lineStyle: 1, // Dotted
                    priceLineVisible: false,
                    lastValueVisible: false,
                });

                // Linha de LOW da 4H (Fundo)
                const lowLine = chartRef.current.addLineSeries({
                    color: '#9d4edd',
                    lineWidth: 1,
                    lineStyle: 1, // Dotted
                    priceLineVisible: false,
                    lastValueVisible: false,
                });

                // Criar apenas 2 pontos: início e fim da vela fechada
                let openData = [
                    { time: startTime, value: crt.currentH4.open },
                    { time: endTime, value: crt.currentH4.open }
                ];

                let closeData = [
                    { time: startTime, value: crt.currentH4.close },
                    { time: endTime, value: crt.currentH4.close }
                ];

                let highData = [
                    { time: startTime, value: crt.currentH4.high },
                    { time: endTime, value: crt.currentH4.high }
                ];

                let lowData = [
                    { time: startTime, value: crt.currentH4.low },
                    { time: endTime, value: crt.currentH4.low }
                ];

                openLine.setData(openData);
                closeLine.setData(closeData);
                highLine.setData(highData);
                lowLine.setData(lowData);

                quadrantLinesRef.current.push(openLine, closeLine, highLine, lowLine);
            }

            // 📊 QUADRANTES FIBONACCI (25%, 50%, 75%)
            if (crt.quadrants) {
                const quadrants = [
                    { value: crt.quadrants.q75, color: '#f72585', label: '75% Premium' },
                    { value: crt.quadrants.q50, color: '#ffaa00', label: '50% Equilíbrio' },
                    { value: crt.quadrants.q25, color: '#4361ee', label: '25% Discount' },
                ];

                quadrants.forEach(({ value, color }) => {
                    const line = chartRef.current.addLineSeries({
                        color: color,
                        lineWidth: 1,
                        lineStyle: 2, // Dashed
                        priceLineVisible: false,
                        lastValueVisible: false,
                    });

                    // Criar apenas 2 pontos: início e fim da vela fechada
                    const lineData = [
                        { time: startTime, value: value },
                        { time: endTime, value: value }
                    ];

                    line.setData(lineData);
                    quadrantLinesRef.current.push(line);
                });
            }
        } catch (error) {
            console.error('Erro ao adicionar linhas CRT:', error);
        }
    };

    // Calcular estatísticas da vela atual
    const getCurrentCandleInfo = () => {
        if (!candles || candles.length === 0) return null;

        const current = candles[candles.length - 1];
        const change = current.close - current.open;
        const changePercent = (change / current.open) * 100;

        return {
            ...current,
            change,
            changePercent,
            isBullish: current.close > current.open
        };
    };

    const candleInfo = getCurrentCandleInfo();
    const crt = analysis?.crt || {};

    return (
        <div className="trading-chart-container">
            <div className="chart-header">
                <div className="chart-title">
                    <span className="icon">📊</span>
                    <h3>Gráfico CRT - Tempo Real</h3>
                </div>

                {candleInfo && (
                    <div className="candle-info">
                        <div className="info-item">
                            <span className="label">O:</span>
                            <span className="value">{candleInfo.open.toFixed(2)}</span>
                        </div>
                        <div className="info-item">
                            <span className="label">H:</span>
                            <span className="value">{candleInfo.high.toFixed(2)}</span>
                        </div>
                        <div className="info-item">
                            <span className="label">L:</span>
                            <span className="value">{candleInfo.low.toFixed(2)}</span>
                        </div>
                        <div className="info-item">
                            <span className="label">C:</span>
                            <span className="value">{candleInfo.close.toFixed(2)}</span>
                        </div>
                        <div className={`info-item change ${candleInfo.isBullish ? 'positive' : 'negative'}`}>
                            <span className="label">Var:</span>
                            <span className="value">
                                {candleInfo.isBullish ? '▲' : '▼'} {Math.abs(candleInfo.changePercent).toFixed(2)}%
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="chart-wrapper" ref={chartContainerRef} />

            {/* CRT Indicators Legend */}
            {crt.pcc && (
                <div className="chart-legend crt-legend">
                    <div className="legend-title">🎯 CRT - Candle Range Theory:</div>

                    {/* PCC Info */}
                    <div className="crt-info">
                        <div className="crt-item pcc-info">
                            <span className="label">📍 PCC:</span>
                            <span className="value">${crt.pcc?.toFixed(2)}</span>
                        </div>

                        {crt.phase && (
                            <div className={`crt-item phase-${crt.phase.phase.toLowerCase()}`}>
                                <span className="label">⏱️ Fase:</span>
                                <span className="value">{crt.phase.phase}</span>
                            </div>
                        )}

                        {crt.quadrants && (
                            <div className="crt-item">
                                <span className="label">📊 Quadrante:</span>
                                <span className="value">{crt.quadrants.currentQuadrant}</span>
                            </div>
                        )}

                        {crt.bias && (
                            <div className={`crt-item bias-${crt.bias.direction.toLowerCase()}`}>
                                <span className="label">🎯 Viés 4H:</span>
                                <span className="value">{crt.bias.direction}</span>
                            </div>
                        )}
                    </div>

                    {/* Status de Manipulação */}
                    {crt.manipulation?.isValid && (
                        <div className="manipulation-alert">
                            <span className="icon">⚡</span>
                            <span>{crt.manipulation.description}</span>
                        </div>
                    )}

                    {/* Turtle Soup */}
                    {crt.turtleSoup && (
                        <div className="turtle-soup-alert">
                            <span className="icon">🐢</span>
                            <span>{crt.turtleSoup.description}</span>
                        </div>
                    )}

                    {/* Marcadores */}
                    <div className="legend-items">
                        <div className="legend-item">
                            <span className="legend-marker pcc"></span>
                            <span className="legend-text">PCC Line</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-marker h4-open"></span>
                            <span className="legend-text">4H Open</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-marker h4-close"></span>
                            <span className="legend-text">4H Close</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-marker h4-high-low"></span>
                            <span className="legend-text">4H High/Low</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-marker manipulation"></span>
                            <span className="legend-text">Manipulação</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-marker turtle"></span>
                            <span className="legend-text">Turtle Soup</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
