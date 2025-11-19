const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Binance = require('binance-api-node').default;
const { RSI, BollingerBands, EMA } = require('technicalindicators');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const client = Binance();

// --- ESTADO DO SISTEMA ADKBOT ---
let activePair = 'BTCUSDT';
let activeInterval = '1m';
const WATCH_LIST = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT'];

let botStatus = 'IDLE';
let performance = { wins: 0, losses: 0 };
let activeTrade = null;

let candles = [];
let marketOverview = [];
let activeStream = null;

// --- FUNÇÕES AUXILIARES ---
function calculateIndicators(closes) {
    const rsi = RSI.calculate({ values: closes, period: 14 });
    const bb = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 });
    const ema = EMA.calculate({ period: 9, values: closes });
    return {
        rsi: rsi[rsi.length - 1] || 50,
        bb: bb[bb.length - 1] || { upper: 0, middle: 0, lower: 0 },
        ema: ema[ema.length - 1] || 0,
        currentPrice: closes[closes.length - 1]
    };
}

function analyzeCandleSequence(candlesData, count) {
    if (candlesData.length < count) return { direction: 'NEUTRO', strength: 0 };

    const sequence = candlesData.slice(-count);

    let bullishScore = 0;
    let bearishScore = 0;

    sequence.forEach(c => {
        const close = parseFloat(c.close);
        const open = parseFloat(c.open);
        const body = Math.abs(close - open);
        const range = parseFloat(c.high) - parseFloat(c.low);

        // Quality of candle (Body vs Wick)
        const quality = range === 0 ? 0.5 : (body / range);

        if (close > open) {
            bullishScore += (1 + quality);
        } else if (close < open) {
            bearishScore += (1 + quality);
        }
    });

    // Trend Bonus (Price Displacement)
    const firstOpen = parseFloat(sequence[0].open);
    const lastClose = parseFloat(sequence[sequence.length - 1].close);

    if (lastClose > firstOpen) {
        bullishScore += 2; // Significant bonus for net upward movement
    } else if (lastClose < firstOpen) {
        bearishScore += 2; // Significant bonus for net downward movement
    }

    const total = bullishScore + bearishScore;
    if (total === 0) return { direction: 'LATERAL', strength: 50 };

    const bullStrength = (bullishScore / total) * 100;
    const bearStrength = (bearishScore / total) * 100;

    if (bullStrength >= 55) {
        return { direction: 'ALTA', strength: bullStrength.toFixed(0) };
    } else if (bearStrength >= 55) {
        return { direction: 'BAIXA', strength: bearStrength.toFixed(0) };
    } else {
        return { direction: 'LATERAL', strength: 50 };
    }
}

function isKillzone(timestamp) {
    const date = new Date(timestamp);
    const hour = date.getUTCHours();
    if (hour >= 7 && hour <= 10) return 'LONDON';
    if (hour >= 12 && hour <= 15) return 'NY';
    return null;
}

function findLiquiditySweeps(candlesData) {
    let sweeps = [];
    for (let i = 5; i < candlesData.length - 5; i++) {
        const c = candlesData[i];
        const prev = candlesData[i - 1];
        const next = candlesData[i + 1];

        if (parseFloat(c.high) > parseFloat(prev.high) && parseFloat(c.high) > parseFloat(next.high)) {
            for (let j = i + 2; j < candlesData.length; j++) {
                const curr = candlesData[j];
                if (parseFloat(curr.high) > parseFloat(c.high) && parseFloat(curr.close) < parseFloat(c.high)) {
                    sweeps.push({ type: 'SWEEP_BEAR', price: parseFloat(c.high), index: j, time: curr.closeTime });
                }
            }
        }

        if (parseFloat(c.low) < parseFloat(prev.low) && parseFloat(c.low) < parseFloat(next.low)) {
            for (let j = i + 2; j < candlesData.length; j++) {
                const curr = candlesData[j];
                if (parseFloat(curr.low) < parseFloat(c.low) && parseFloat(curr.close) > parseFloat(c.low)) {
                    sweeps.push({ type: 'SWEEP_BULL', price: parseFloat(c.low), index: j, time: curr.closeTime });
                }
            }
        }
    }
    return sweeps.filter(s => s.index >= candlesData.length - 10).pop();
}

function findZones(candlesData) {
    let zones = [];
    const currentClose = parseFloat(candlesData[candlesData.length - 1].close);

    for (let i = candlesData.length - 50; i < candlesData.length - 2; i++) {
        const c1 = candlesData[i];
        const c3 = candlesData[i + 2];
        const kz = isKillzone(c1.closeTime);

        let zone = null;

        if (parseFloat(c1.high) < parseFloat(c3.low)) {
            zone = {
                id: `BISI-${i}`, type: 'BISI',
                top: parseFloat(c3.low), bottom: parseFloat(c1.high),
                ce: (parseFloat(c3.low) + parseFloat(c1.high)) / 2,
                index: i + 1, killzone: kz, status: 'ACTIVE'
            };
        }
        else if (parseFloat(c1.low) > parseFloat(c3.high)) {
            zone = {
                id: `CIBI-${i}`, type: 'CIBI',
                top: parseFloat(c1.low), bottom: parseFloat(c3.high),
                ce: (parseFloat(c1.low) + parseFloat(c3.high)) / 2,
                index: i + 1, killzone: kz, status: 'ACTIVE'
            };
        }

        if (zone) {
            let violated = false;
            for (let j = i + 3; j < candlesData.length; j++) {
                const c = candlesData[j];
                const close = parseFloat(c.close);
                if (zone.type === 'BISI' && close < zone.bottom) violated = true;
                if (zone.type === 'CIBI' && close > zone.top) violated = true;
            }

            if (violated) {
                zone.status = 'INVERSED';
                zone.type = zone.type === 'BISI' ? 'IFVG_BEAR' : 'IFVG_BULL';
            }

            const dist = Math.abs(currentClose - zone.ce);
            if (dist < (currentClose * 0.05)) zones.push(zone);
        }
    }
    return zones.sort((a, b) => b.index - a.index).slice(0, 5);
}

async function scanMarket() {
    try {
        const promises = WATCH_LIST.map(async (pair) => {
            const klines = await client.candles({ symbol: pair, interval: activeInterval, limit: 60 });
            const closes = klines.map(c => parseFloat(c.close));
            const indicators = calculateIndicators(closes);
            const zones = findZones(klines);
            const sweep = findLiquiditySweeps(klines);
            const activeZone = zones.find(z => z.status === 'ACTIVE' || z.status === 'INVERSED');

            let score = 0;
            if (activeZone) {
                score += 40;
                if (activeZone.killzone) score += 10;
            }
            if (sweep) score += 30;
            if (indicators.rsi < 30 || indicators.rsi > 70) score += 20;

            return {
                symbol: pair,
                price: closes[closes.length - 1],
                rsi: indicators.rsi.toFixed(2),
                fvg: activeZone ? activeZone.type : null,
                sweep: sweep ? sweep.type : null,
                score
            };
        });

        marketOverview = await Promise.all(promises);
        marketOverview.sort((a, b) => b.score - a.score);
    } catch (e) {
        console.error("Erro no Scanner:", e);
    }
}

// --- MOTOR DE EXECUÇÃO AUTOMÁTICA COM TRAVA DE SEGURANÇA ---
function checkAutoExecution(currentPrice, prediction) {
    if (activeTrade) {
        const entry = activeTrade.entry;
        const sl = activeTrade.sl;
        const tp = activeTrade.tp;

        // Calcula lucro atual
        let currentProfit = 0;
        if (activeTrade.type === 'COMPRA') {
            currentProfit = currentPrice - entry;
        } else {
            currentProfit = entry - currentPrice;
        }

        const targetProfit = Math.abs(tp - entry);
        const rr = currentProfit / Math.abs(entry - sl);

        // TRAVA DE SEGURANÇA: Se atingiu 1:1, protege o lucro
        if (rr >= 1) {
            console.log(`TRAVA ATIVADA: R:R ${rr.toFixed(2)} - Movendo SL para breakeven`);
            activeTrade.sl = entry; // Move SL para entrada (breakeven)
        }

        // Verifica TP
        if (activeTrade.type === 'COMPRA') {
            if (currentPrice >= tp) {
                performance.wins++;
                console.log(`✅ WIN (Compra) - Lucro: ${currentProfit.toFixed(2)}`);
                activeTrade = null;
                return;
            } else if (currentPrice <= sl) {
                performance.losses++;
                console.log(`❌ LOSS (Compra)`);
                activeTrade = null;
                return;
            }

            // SAÍDA POR REVERSÃO DE TENDÊNCIA
            if (prediction.direction === 'VENDA' && prediction.confidence >= 80) {
                console.log(`⚠️ SAÍDA ANTECIPADA (Reversão Detectada)`);
                activeTrade = null; // Sai do trade
                return;
            }

        } else {
            if (currentPrice <= tp) {
                performance.wins++;
                console.log(`✅ WIN (Venda) - Lucro: ${currentProfit.toFixed(2)}`);
                activeTrade = null;
                return;
            } else if (currentPrice >= sl) {
                performance.losses++;
                console.log(`❌ LOSS (Venda)`);
                activeTrade = null;
                return;
            }

            // SAÍDA POR REVERSÃO DE TENDÊNCIA
            if (prediction.direction === 'COMPRA' && prediction.confidence >= 80) {
                console.log(`⚠️ SAÍDA ANTECIPADA (Reversão Detectada)`);
                activeTrade = null; // Sai do trade
                return;
            }
        }
        return;
    }

    // Abre novo trade apenas se bot estiver RUNNING e não houver trade ativo
    // Reduzido threshold para 80 para pegar tendências fortes também
    if (botStatus === 'RUNNING' && prediction.confidence >= 80 && !activeTrade) {
        activeTrade = {
            type: prediction.direction,
            entry: currentPrice,
            sl: prediction.stopLoss,
            tp: prediction.takeProfit,
            startTime: Date.now()
        };
        console.log(`🎯 TRADE INICIADO: ${prediction.direction} @ ${currentPrice} | TP: ${prediction.takeProfit.toFixed(2)} | SL: ${prediction.stopLoss.toFixed(2)}`);
    }
}

async function startStream(pair, interval) {
    if (activeStream) activeStream();

    console.log(`Iniciando stream para ${pair} no tempo ${interval}`);
    candles = [];

    let history = [];
    try {
        history = await client.candles({ symbol: pair, interval: interval, limit: 200 });
        console.log(`Fetched ${history.length} candles for ${pair}`);
    } catch (e) {
        console.error("Error fetching candles:", e);
    }

    if (!history || history.length === 0) {
        console.log("No history found, generating dummy data...");
        // Generate dummy data if API fails
        let time = Date.now();
        for (let i = 0; i < 100; i++) {
            history.push({
                open: 50000 + Math.random() * 100,
                high: 50100 + Math.random() * 100,
                low: 49900 + Math.random() * 100,
                close: 50050 + Math.random() * 100,
                volume: 100,
                closeTime: time - (100 - i) * 60000
            });
        }
    }

    candles = history.map(c => ({
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        close: parseFloat(c.close),
        volume: parseFloat(c.volume),
        closeTime: c.closeTime
    }));

    // ENVIAR HISTÓRICO ATUALIZADO PARA TODOS OS CLIENTES
    const historyData = JSON.stringify({ type: 'HISTORY', data: candles });
    wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) c.send(historyData);
    });

    activeStream = client.ws.candles(pair, interval, candle => {
        const { open, high, low, close, volume, closeTime } = candle;
        const candleData = {
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close),
            volume: parseFloat(volume),
            closeTime: closeTime
        };

        const lastCandle = candles[candles.length - 1];
        if (lastCandle && lastCandle.closeTime === candleData.closeTime) {
            candles[candles.length - 1] = candleData;
        } else {
            candles.push(candleData);
            if (candles.length > 300) candles.shift();
        }

        broadcastData();
    });
}

function broadcastData() {
    if (candles.length < 20) return;
    console.log(`Broadcasting update. Candles: ${candles.length}`);

    const closes = candles.map(c => c.close);
    const currentPrice = closes[closes.length - 1];
    const indicators = calculateIndicators(closes);
    const zones = findZones(candles);
    const sweep = findLiquiditySweeps(candles);

    // Análise de Sequência de Velas
    const candleAnalysis = {
        seq3: analyzeCandleSequence(candles, 3),
        seq5: analyzeCandleSequence(candles, 5),
        seq8: analyzeCandleSequence(candles, 8)
    };

    const primaryZone = zones[0];

    let direction = 'NEUTRO';
    let confidence = 0;
    let reason = 'Aguardando Setup...';
    let stopLoss = 0;
    let takeProfit = 0;
    let riskReward = '1:3';

    // PRIORIDADE 1: Setup Sniper (Sweep + FVG)
    if (sweep && primaryZone && primaryZone.status === 'ACTIVE') {
        if (sweep.type === 'SWEEP_BULL' && primaryZone.type === 'BISI') {
            direction = 'COMPRA';
            confidence = 98;
            reason = '🎯 SNIPER: Varredura + FVG Alta';
            stopLoss = sweep.price * 0.9995;
            takeProfit = currentPrice + (currentPrice - stopLoss) * 3;
            riskReward = '1:3';
        } else if (sweep.type === 'SWEEP_BEAR' && primaryZone.type === 'CIBI') {
            direction = 'VENDA';
            confidence = 98;
            reason = '🎯 SNIPER: Varredura + FVG Baixa';
            stopLoss = sweep.price * 1.0005;
            takeProfit = currentPrice - (stopLoss - currentPrice) * 3;
            riskReward = '1:3';
        }
    }

    // PRIORIDADE 2: FVG + Sequência de Velas
    if (direction === 'NEUTRO' && primaryZone) {
        const dist = Math.abs(currentPrice - primaryZone.ce);
        const isClose = dist < (currentPrice * 0.003);

        // Confirma com sequência de velas
        const seq3Confirm = candleAnalysis.seq3.direction;
        const seq5Confirm = candleAnalysis.seq5.direction;

        if (isClose) {
            if (primaryZone.status === 'ACTIVE') {
                if (primaryZone.type === 'BISI' && (seq3Confirm === 'ALTA' || seq5Confirm === 'ALTA')) {
                    direction = 'COMPRA';
                    confidence = 92;
                    reason = `📊 FVG Alta + Sequência Bullish ${primaryZone.killzone || ''}`;
                    stopLoss = primaryZone.bottom * 0.9995;
                    takeProfit = currentPrice + (currentPrice - stopLoss) * 3;
                    riskReward = '1:3';
                } else if (primaryZone.type === 'CIBI' && (seq3Confirm === 'BAIXA' || seq5Confirm === 'BAIXA')) {
                    direction = 'VENDA';
                    confidence = 92;
                    reason = `📊 FVG Baixa + Sequência Bearish ${primaryZone.killzone || ''}`;
                    stopLoss = primaryZone.top * 1.0005;
                    takeProfit = currentPrice - (stopLoss - currentPrice) * 3;
                    riskReward = '1:3';
                }
            }
            else if (primaryZone.status === 'INVERSED') {
                if (primaryZone.type === 'IFVG_BULL' && seq3Confirm === 'ALTA') {
                    direction = 'COMPRA';
                    confidence = 88;
                    reason = '🔄 IFVG Flip (Suporte)';
                    stopLoss = primaryZone.bottom * 0.9995;
                    takeProfit = currentPrice + (currentPrice - stopLoss) * 2.5;
                    riskReward = '1:2.5';
                } else if (primaryZone.type === 'IFVG_BEAR' && seq3Confirm === 'BAIXA') {
                    direction = 'VENDA';
                    confidence = 88;
                    reason = '🔄 IFVG Flip (Resistência)';
                    stopLoss = primaryZone.top * 1.0005;
                    takeProfit = currentPrice - (stopLoss - currentPrice) * 2.5;
                    riskReward = '1:2.5';
                }
            }
        }
    }

    // PRIORIDADE 3: Seguimento de Tendência (Fluxo de Mercado)
    if (direction === 'NEUTRO') {
        const seq8 = candleAnalysis.seq8;
        const seq5 = candleAnalysis.seq5;

        // Só entra a favor da tendência se não estiver esticado demais (RSI)
        if (seq8.direction === 'ALTA' && seq5.direction !== 'BAIXA' && indicators.rsi < 70) {
            direction = 'COMPRA';
            confidence = 85;
            reason = '🌊 Fluxo de Alta (Tendência Dominante)';
            // SL no fundo mais recente das últimas 5 velas
            stopLoss = Math.min(...candles.slice(-5).map(c => c.low));
            takeProfit = currentPrice + (currentPrice - stopLoss) * 2;
            riskReward = '1:2';
        } else if (seq8.direction === 'BAIXA' && seq5.direction !== 'ALTA' && indicators.rsi > 30) {
            direction = 'VENDA';
            confidence = 85;
            reason = '🌊 Fluxo de Baixa (Tendência Dominante)';
            // SL no topo mais recente das últimas 5 velas
            stopLoss = Math.max(...candles.slice(-5).map(c => c.high));
            takeProfit = currentPrice - (stopLoss - currentPrice) * 2;
            riskReward = '1:2';
        }
    }

    const prediction = {
        direction,
        confidence,
        reason,
        zones,
        sweep,
        stopLoss,
        takeProfit,
        riskReward,
        indicators
    };

    checkAutoExecution(currentPrice, prediction);

    const data = JSON.stringify({
        type: 'UPDATE',
        pair: activePair,
        interval: activeInterval,
        candle: candles[candles.length - 1],
        prediction,
        candleAnalysis,
        scanner: marketOverview,
        bot: {
            status: botStatus,
            performance: performance,
            activeTrade: activeTrade
        }
    });

    wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) c.send(data);
    });
}

wss.on('connection', (ws) => {
    console.log('Cliente conectado');
    ws.send(JSON.stringify({ type: 'HISTORY', data: candles }));

    ws.on('message', (message) => {
        const parsed = JSON.parse(message);

        if (parsed.type === 'CHANGE_PAIR') {
            activePair = parsed.pair;
            activeTrade = null;
            startStream(activePair, activeInterval);
        }

        if (parsed.type === 'CHANGE_INTERVAL') {
            activeInterval = parsed.interval;
            activeTrade = null;
            startStream(activePair, activeInterval);
        }

        if (parsed.type === 'SET_BOT_STATUS') {
            botStatus = parsed.status;
            if (botStatus === 'IDLE') {
                activeTrade = null;
                performance = { wins: 0, losses: 0 };
            }
            console.log(`Bot status alterado para: ${botStatus}`);
        }
    });
});

setInterval(scanMarket, 5000);

server.listen(3001, () => {
    console.log('🚀 ADKBOT Server rodando na porta 3001');
    startStream(activePair, activeInterval);
    scanMarket();
});
