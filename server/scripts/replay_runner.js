// ## replay_runner.js
// Inputs: candles.json (array of candle objects {t,o,h,l,c,v})
// This runner simulates the detector & trailing decisions simplifying execution (fill at next candle open).

const fs = require('fs');
const Binance = require('binance-api-node').default;

const client = Binance();

const CONFIG = {
    momentumN: 3,
    momentumThreshold: 1.5,
    volWindow: 20,
    volRelThreshold: 2.3,
    candleQualityThreshold: 0.7,
    scoreThreshold: 85,     // Updated to 85 (Strict)
    predictedATRMultiplier: 3
};

// --- HELPER FUNCTIONS (Mirrored from featureWorker.js) ---
function calculateIndicators(closes, highs, lows) {
    // Simplified for runner (no library dependency if possible, or use simple math)
    // We need ATR for momentum calculation
    // Using simple ATR implementation
    return {
        atr: calcATR({
            length: closes.length, map: (fn) => {
                // Mocking map for calcATR helper below which expects objects
                return closes.map((c, i) => ({ high: highs[i], low: lows[i], close: c }));
            }
        }, 14)
    };
}

function calcATR(candles, period = 14) {
    if (candles.length <= period) return 0;
    let trs = [];
    // Handle both array of objects and the mock object passed above
    const len = candles.length || candles.map(() => { }).length;
    // If candles is array of objects
    const getCandle = (i) => candles[i] || candles.map(x => x)[i]; // simplified

    for (let i = 1; i < len; i++) {
        const high = parseFloat(candles[i].high);
        const low = parseFloat(candles[i].low);
        const prevClose = parseFloat(candles[i - 1].close);
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        trs.push(tr);
    }
    const slice = trs.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function sma(arr, n) {
    const slice = arr.slice(-n);
    if (slice.length === 0) return 0;
    return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function findLiquiditySweeps(candlesData) {
    let sweeps = [];
    for (let i = 5; i < candlesData.length - 5; i++) {
        const c = candlesData[i];
        const prev = candlesData[i - 1];
        const next = candlesData[i + 1];

        if (c.high > prev.high && c.high > next.high) {
            for (let j = i + 2; j < candlesData.length; j++) {
                const curr = candlesData[j];
                if (curr.high > c.high && curr.close < c.high) {
                    sweeps.push({ type: 'SWEEP_BEAR', price: c.high, index: j });
                }
            }
        }
        if (c.low < prev.low && c.low < next.low) {
            for (let j = i + 2; j < candlesData.length; j++) {
                const curr = candlesData[j];
                if (curr.low < c.low && curr.close > c.low) {
                    sweeps.push({ type: 'SWEEP_BULL', price: c.low, index: j });
                }
            }
        }
    }
    return sweeps.filter(s => s.index >= candlesData.length - 10).pop();
}

function findZones(candlesData) {
    let zones = [];
    const currentClose = candlesData[candlesData.length - 1].close;

    for (let i = candlesData.length - 50; i < candlesData.length - 2; i++) {
        const c1 = candlesData[i];
        const c3 = candlesData[i + 2];

        let zone = null;
        if (c1.high < c3.low) {
            zone = { type: 'BISI', top: c3.low, bottom: c1.high, ce: (c3.low + c1.high) / 2, status: 'ACTIVE' };
        } else if (c1.low > c3.high) {
            zone = { type: 'CIBI', top: c1.low, bottom: c3.high, ce: (c1.low + c3.high) / 2, status: 'ACTIVE' };
        }

        if (zone) {
            let violated = false;
            for (let j = i + 3; j < candlesData.length; j++) {
                const c = candlesData[j];
                if (zone.type === 'BISI' && c.close < zone.bottom) violated = true;
                if (zone.type === 'CIBI' && c.close > zone.top) violated = true;
            }
            if (!violated) {
                const dist = Math.abs(currentClose - zone.ce);
                if (dist < (currentClose * 0.05)) zones.push(zone);
            }
        }
    }
    return zones;
}

function bodyRatio(candle) {
    const body = Math.abs(candle.close - candle.open);
    const full = candle.high - candle.low || 1;
    return body / full;
}

const detector = {
    syncDetect: (candles) => {
        const len = candles.length;
        if (len < 50) return { signal: 'NO_ACTION' };

        const currentCandle = candles[len - 1];
        const atr = calcATR(candles, 14) || 1;

        // 1. Momentum
        const closeNow = currentCandle.close;
        const closeN = candles[len - 1 - CONFIG.momentumN] ? candles[len - 1 - CONFIG.momentumN].close : closeNow;
        const momentumRate = atr > 0 ? (closeNow - closeN) / atr : 0;

        // 2. Volume
        const volumes = candles.map(c => c.volume);
        const avgVol = sma(volumes.slice(0, -1), CONFIG.volWindow) || 1;
        const volRel = currentCandle.volume / avgVol;

        // 3. Quality
        const body = Math.abs(currentCandle.close - currentCandle.open);
        const range = currentCandle.high - currentCandle.low || 1;
        const candleQuality = body / range;

        // 4. BOS
        let bos = null;
        const lookback = 10;
        const recentHigh = Math.max(...candles.slice(-lookback - 1, -1).map(c => c.high));
        const recentLow = Math.min(...candles.slice(-lookback - 1, -1).map(c => c.low));
        if (currentCandle.close > recentHigh) bos = 'BOS_BULL';
        else if (currentCandle.close < recentLow) bos = 'BOS_BEAR';

        // 5. Sweeps & Zones
        const sweep = findLiquiditySweeps(candles);
        const zones = findZones(candles);
        const primaryZone = zones[0];

        let score = 0;
        if (Math.abs(momentumRate) > CONFIG.momentumThreshold) score += 20;
        if (volRel > CONFIG.volRelThreshold) score += 20;
        if (candleQuality > CONFIG.candleQualityThreshold) score += 10;
        if (bos) score += 15;
        if (sweep) score += 20;
        if (primaryZone && primaryZone.status === 'ACTIVE') score += 15;

        const predictedATR = atr * CONFIG.predictedATRMultiplier;
        const predictedTPPoints = Math.max(Math.round(predictedATR), 1);
        let direction = momentumRate > 0 ? 'LONG' : 'SHORT';

        if (score >= CONFIG.scoreThreshold) {
            return { signal: 'PERNADA_CONFIRMED', confidence: score, direction, predictedTPPoints };
        }
        return { signal: 'NO_ACTION' };
    }
};

async function runBacktest() {
    console.log("🔄 Iniciando Backtest com dados reais da Binance...");

    let candles = [];
    try {
        if (fs.existsSync('./candles.json')) {
            candles = JSON.parse(fs.readFileSync('./candles.json', 'utf8'));
            console.log(`📂 Carregado ${candles.length} candles do arquivo local.`);
        } else {
            console.log("🌐 Baixando dados históricos (BTCUSDT 1m)...");
            const rawCandles = await client.candles({ symbol: 'BTCUSDT', interval: '1m', limit: 1000 });
            candles = rawCandles.map(c => ({
                open: parseFloat(c.open),
                high: parseFloat(c.high),
                low: parseFloat(c.low),
                close: parseFloat(c.close),
                volume: parseFloat(c.volume),
                time: c.closeTime
            }));
            console.log(`✅ Baixado ${candles.length} candles.`);
        }
    } catch (e) {
        console.error("❌ Erro ao obter dados:", e.message);
        return;
    }

    let trades = [];
    let active = null;

    console.log("🚀 Executando simulação...");

    for (let i = 60; i < candles.length; i++) { // wait warm-up
        const window = candles.slice(0, i + 1);
        const sig = detector.syncDetect(window);

        // Next candle for execution
        if (i + 1 >= candles.length) break;
        const nextCandle = candles[i + 1];
        const price = nextCandle.open;

        // if no active trade and detector signals
        if (!active && sig.signal === 'PERNADA_CONFIRMED') {
            const entry = price;
            const tp = (sig.direction === 'LONG') ? entry + sig.predictedTPPoints : entry - sig.predictedTPPoints;
            const sl = (sig.direction === 'LONG') ? entry - Math.max(10, Math.round(sig.predictedTPPoints / 3)) : entry + Math.max(10, Math.round(sig.predictedTPPoints / 3));

            active = {
                entry,
                tp,
                sl,
                size: 1,
                openIndex: i + 1,
                direction: sig.direction,
                openTime: new Date(nextCandle.time).toLocaleString()
            };
        }

        if (active) {
            // Initialize TrailingManager for this trade if not already done
            // Update Trailing Manager with current candle (simulating real-time updates)
            // We need to pass the full list including the current forming candle (nextCandle)
            // so that TrailingManager logic (len-2) works correctly as "previous closed candle".
            const currentCandles = candles.slice(0, i + 1);
            currentCandles.push(nextCandle);

            if (!active.trailingManager) {
                const mockApi = {
                    modifyOrderSL: (id, newSL) => {
                        active.sl = newSL;
                        // console.log(`[MOCK] SL Updated to ${newSL}`);
                    },
                    closePortion: (id, pct) => {
                        // console.log(`[MOCK] Closed portion ${pct}`);
                    },
                    closeTrade: (id, reason) => {
                        active.forceExit = true;
                        active.exitReason = reason;
                    }
                };
                // Import TrailingManager dynamically or assume it's available if I add require at top
                const TrailingManager = require('../src/services/trailing_manager');
                active.trailingManager = new TrailingManager(mockApi, {
                    usePrevOpenTrailing: true,
                    slSlippageBuffer: 0,
                    VOLREL_THRESHOLD_FOR_REVERSAL: 2.5
                });
                active.trailingManager.register({
                    orderId: 'sim_trade',
                    side: active.direction,
                    entryPrice: active.entry,
                    slPrice: active.sl,
                    riskPts: Math.abs(active.entry - active.sl),
                    size: active.size
                });

                // Set Initial Stop (Prev Open)
                active.trailingManager.setInitialStop('sim_trade', currentCandles);
            }

            // evaluate expects (orderId, currentPrice, recentCandles)
            active.trailingManager.evaluate('sim_trade', nextCandle.open, currentCandles);

            // check if next candle hits TP or SL
            const future = candles[i + 1];

            let result = null;
            let pl = 0;

            // Check for forced exit from TrailingManager (e.g. SL_CROSSED)
            if (active.forceExit) {
                result = 'loss'; // Assume loss if forced exit by SL/Trailing usually
                // Calculate PL based on exit price (approximate as current open or SL)
                // If reason is SL_CROSSED, we exited at SL (or slightly worse)
                // For simulation, use the SL price that triggered it
                const exitPrice = active.sl;
                pl = (active.direction === 'LONG') ? (exitPrice - active.entry) : (active.entry - exitPrice);
                // If PL is positive, it's a win
                if (pl > 0) result = 'win';
            }
            else if (active.direction === 'LONG') {
                if (future.high >= active.tp) {
                    result = 'win';
                    pl = active.tp - active.entry;
                } else if (future.low <= active.sl) {
                    result = 'loss';
                    pl = active.sl - active.entry;
                }
            } else {
                if (future.low <= active.tp) {
                    result = 'win';
                    pl = active.entry - active.tp;
                } else if (future.high >= active.sl) {
                    result = 'loss';
                    pl = active.entry - active.sl;
                }
            }

            if (result) {
                trades.push({
                    result,
                    pl,
                    direction: active.direction,
                    entry: active.entry,
                    exit: result === 'win' ? active.tp : active.sl,
                    time: active.openTime,
                    exitReason: active.exitReason || 'TP/SL'
                });
                active = null;
            }
        }
    }

    // produce report
    const wins = trades.filter(t => t.result === 'win').length;
    const losses = trades.filter(t => t.result === 'loss').length;
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades * 100).toFixed(2) : 0;
    const avgPL = totalTrades > 0 ? (trades.reduce((a, b) => a + b.pl, 0) / totalTrades).toFixed(2) : 0;

    console.log("\n📊 === RESULTADO DO BACKTEST (Últimos 1000 candles) ===");
    console.log(`Total Trades: ${totalTrades}`);
    console.log(`Wins: ${wins} ✅`);
    console.log(`Losses: ${losses} ❌`);
    console.log(`Win Rate: ${winRate}%`);
    console.log(`Avg PnL: $${avgPL}`);
    console.log("=====================================================\n");

    if (totalTrades > 0) {
        console.log("Últimos 5 trades:");
        console.table(trades.slice(-5));
    }
}

runBacktest();
