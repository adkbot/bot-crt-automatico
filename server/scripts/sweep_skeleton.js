// ## sweep_skeleton.js
// Grid Search for ADKBOT parameters
// Run with: node server/scripts/sweep_skeleton.js

const fs = require('fs');
const Binance = require('binance-api-node').default;
const client = Binance();

// --- CONFIG RANGES ---
const PARAM_GRID = {
    SCORE_THRESHOLD: [75, 80, 85],
    MOMENTUM_THRESHOLD: [1.2, 1.3, 1.4],
    VOLREL_THRESHOLD: [1.5, 1.7, 2.0]
};

// --- HELPER FUNCTIONS ---
function calcATR(candles, period = 14) {
    if (candles.length <= period) return 0;
    let trs = [];
    const len = candles.length || candles.map(() => { }).length;
    const getCandle = (i) => candles[i] || candles.map(x => x)[i];

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

// Full Detector Logic
const detector = {
    detect: (candles, config) => {
        const len = candles.length;
        if (len < 50) return { signal: 'NO_ACTION' };

        const currentCandle = candles[len - 1];
        const atr = calcATR(candles, 14) || 1;

        // 1. Momentum
        const closeNow = currentCandle.close;
        const closeN = candles[len - 1 - 3] ? candles[len - 1 - 3].close : closeNow;
        const momentumRate = atr > 0 ? (closeNow - closeN) / atr : 0;

        // 2. Volume
        const volumes = candles.map(c => c.volume);
        const avgVol = sma(volumes.slice(0, -1), 20) || 1;
        const volRel = currentCandle.volume / avgVol;

        // 3. Quality
        const candleQuality = bodyRatio(candles[len - 1]);

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
        if (Math.abs(momentumRate) > config.MOMENTUM_THRESHOLD) score += 20;
        if (volRel > config.VOLREL_THRESHOLD) score += 20;
        if (candleQuality > 0.7) score += 10;
        if (bos) score += 15;
        if (sweep) score += 20;
        if (primaryZone && primaryZone.status === 'ACTIVE') score += 15;

        const predictedATR = atr * 3;
        const predictedTPPoints = Math.max(Math.round(predictedATR), 1);
        let direction = momentumRate > 0 ? 'LONG' : 'SHORT';

        if (score >= config.SCORE_THRESHOLD) {
            return { signal: 'PERNADA_CONFIRMED', confidence: score, direction, predictedTPPoints };
        }
        return { signal: 'NO_ACTION' };
    }
};

async function runSweep() {
    console.log("🔄 Loading Data...");
    let candles = [];
    try {
        if (fs.existsSync('./candles.json')) {
            candles = JSON.parse(fs.readFileSync('./candles.json', 'utf8'));
        } else {
            console.log("Downloading data...");
            const rawCandles = await client.candles({ symbol: 'BTCUSDT', interval: '1m', limit: 1000 });
            candles = rawCandles.map(c => ({
                open: parseFloat(c.open),
                high: parseFloat(c.high),
                low: parseFloat(c.low),
                close: parseFloat(c.close),
                volume: parseFloat(c.volume),
                time: c.closeTime
            }));
            fs.writeFileSync('./candles.json', JSON.stringify(candles));
        }
    } catch (e) {
        console.error(e);
        return;
    }

    console.log(`Loaded ${candles.length} candles. Starting Sweep...`);
    console.log("SCORE | MOMENTUM | VOLREL | TRADES | WINRATE | AVG PNL");
    console.log("-------------------------------------------------------");

    const results = [];

    for (const scoreThresh of PARAM_GRID.SCORE_THRESHOLD) {
        for (const momThresh of PARAM_GRID.MOMENTUM_THRESHOLD) {
            for (const volThresh of PARAM_GRID.VOLREL_THRESHOLD) {

                const config = {
                    SCORE_THRESHOLD: scoreThresh,
                    MOMENTUM_THRESHOLD: momThresh,
                    VOLREL_THRESHOLD: volThresh
                };

                let trades = [];
                let active = null;

                for (let i = 60; i < candles.length; i++) {
                    const window = candles.slice(0, i + 1);
                    const sig = detector.detect(window, config);

                    if (i + 1 >= candles.length) break;
                    const nextCandle = candles[i + 1];
                    const price = nextCandle.open;

                    if (!active && sig.signal === 'PERNADA_CONFIRMED') {
                        const entry = price;
                        const tp = (sig.direction === 'LONG') ? entry + sig.predictedTPPoints : entry - sig.predictedTPPoints;
                        const sl = (sig.direction === 'LONG') ? entry - Math.max(10, Math.round(sig.predictedTPPoints / 3)) : entry + Math.max(10, Math.round(sig.predictedTPPoints / 3));

                        active = { entry, tp, sl, direction: sig.direction };
                    }

                    if (active) {
                        const future = candles[i + 1];
                        let result = null;
                        let pl = 0;

                        if (active.direction === 'LONG') {
                            if (future.high >= active.tp) { result = 'win'; pl = active.tp - active.entry; }
                            else if (future.low <= active.sl) { result = 'loss'; pl = active.sl - active.entry; }
                        } else {
                            if (future.low <= active.tp) { result = 'win'; pl = active.entry - active.tp; }
                            else if (future.high >= active.sl) { result = 'loss'; pl = active.entry - active.sl; }
                        }

                        if (result) {
                            trades.push({ result, pl });
                            active = null;
                        }
                    }
                }

                const wins = trades.filter(t => t.result === 'win').length;
                const total = trades.length;
                const winRate = total > 0 ? (wins / total * 100).toFixed(1) : 0;
                const avgPl = total > 0 ? (trades.reduce((a, b) => a + b.pl, 0) / total).toFixed(1) : 0;

                console.log(`${scoreThresh}    | ${momThresh}      | ${volThresh}    | ${total}     | ${winRate}%   | ${avgPl}`);
                results.push({ config, total, winRate, avgPl });
            }
        }
    }

    // Find best
    const best = results.sort((a, b) => parseFloat(b.avgPl) - parseFloat(a.avgPl))[0];
    console.log("\n🏆 BEST CONFIG:");
    console.log(best);
}

runSweep();
