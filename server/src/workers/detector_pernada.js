const { parentPort } = require('worker_threads');

// Config (ajustar depois via arquivo de config)
const CONFIG = {
    momentumN: 3,
    momentumThreshold: 1.3, // Aumentado para 1.3 (menos falsos)
    volWindow: 20,
    volRelThreshold: 1.7, // Aumentado para 1.7 (volume mais forte)
    candleQualityThreshold: 0.7,
    scoreThreshold: 80, // Aumentado para 80 (gate mais forte)
    predictedATRMultiplier: 3 // predicted extension = ATR * multiplier
};

// util functions
function sma(arr, n) {
    const slice = arr.slice(-n);
    if (slice.length === 0) return 0;
    return slice.reduce((a, b) => a + b, 0) / slice.length;
}
function calcATR(candles, period = 14) {
    if (candles.length <= period) return 0;
    let trs = [];
    for (let i = 1; i < candles.length; i++) {
        const high = candles[i].high;
        const low = candles[i].low;
        const prevClose = candles[i - 1].close;
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        trs.push(tr);
    }
    const slice = trs.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
}
function bodyRatio(candle) {
    const body = Math.abs(candle.close - candle.open);
    const full = candle.high - candle.low || 1;
    return body / full;
}

// main detector
function calcMomentumRate(candles, n) {
    const len = candles.length;
    if (len < n + 1) return 0;
    const closeNow = candles[len - 1].close;
    const closeN = candles[len - 1 - n].close;
    const momentum = closeNow - closeN;
    const atr = calcATR(candles, 14) || 1;
    return momentum / atr;
}
function calcVolRel(candles, volWindow) {
    const len = candles.length;
    if (len < 1) return 0;
    const volNow = candles[len - 1].volume || 1;
    const avg = sma(candles.map(c => c.volume || 0), volWindow) || 1;
    return volNow / avg;
}

parentPort.on('message', (msg) => {
    // msg = { pair, candles, extras: { bos, fvg_respected, sweep_with_retest } }
    const { pair, candles, extras = {} } = msg;
    const momentumRate = calcMomentumRate(candles, CONFIG.momentumN);
    const volRel = calcVolRel(candles, CONFIG.volWindow);
    const candleQuality = bodyRatio(candles[candles.length - 1]);

    let score = 0;
    if (momentumRate > CONFIG.momentumThreshold) score += 20;
    if (volRel > CONFIG.volRelThreshold) score += 20;
    if (extras.bos) score += 15;
    if (extras.fvg_respected || extras.sweep_with_retest) score += 15;
    if (candleQuality > CONFIG.candleQualityThreshold) score += 10;

    const predictedATR = calcATR(candles, 14) * CONFIG.predictedATRMultiplier;
    const predictedTPPoints = Math.max(Math.round(predictedATR), 1); // points

    const out = {
        pair,
        timestamp: Date.now(),
        score,
        momentumRate,
        volRel,
        candleQuality,
        extras,
        predictedTPPoints
    };

    if (score >= CONFIG.scoreThreshold) {
        out.signal = 'PERNADA_CONFIRMED';
        out.confidence = score;
    } else {
        out.signal = 'NO_ACTION';
    }

    parentPort.postMessage(out);
});
