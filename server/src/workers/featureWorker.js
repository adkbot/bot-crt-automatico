const { parentPort } = require('worker_threads');
const { RSI, BollingerBands, EMA, ATR } = require('technicalindicators');
const config = require('../config');
const smcService = require('../services/smcService');

// --- MAIN WORKER HANDLER ---
parentPort.on('message', (data) => {
    try {
        const { candles, htfCandles } = data;
        const result = analyze(candles, htfCandles);
        parentPort.postMessage(result);
    } catch (error) {
        console.error('Worker Error:', error);
        parentPort.postMessage({ error: error.message });
    }
});

// --- ANALYSIS ORCHESTRATOR ---
function analyze(candles, htfCandles) {
    // 1. Basic Indicators
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const indicators = calculateIndicators(closes, highs, lows);

    // 2. HTF Context
    const htfContext = analyzeHTFContext(htfCandles, indicators.currentPrice);

    // 3. SMC Analysis (New Logic)
    const smcData = smcService.analyze(candles);

    // Map SMC data to expected format
    const structure = smcData.structure; // BOS events
    const orderBlocks = smcData.obs;
    const zones = smcData.fvgs; // FVGs are treated as zones too

    // Combine OBs and FVGs into a single 'zones' array for the frontend if needed, 
    // or keep them separate. The frontend expects 'zones' for FVG/OB display.
    // Let's map them to a unified 'zones' format for the frontend.
    const unifiedZones = [
        ...orderBlocks.map(ob => ({
            type: ob.type === 'BU' ? 'DEMAND' : 'SUPPLY',
            subtype: 'OB',
            top: ob.top,
            bottom: ob.bottom,
            ce: (ob.top + ob.bottom) / 2,
            mitigated: ob.mitigated,
            active: ob.active
        })),
        ...zones.map(fvg => ({
            type: fvg.type === 'FU' ? 'DEMAND' : 'SUPPLY',
            subtype: 'FVG',
            top: fvg.top,
            bottom: fvg.bottom,
            ce: (fvg.top + fvg.bottom) / 2,
            mitigated: fvg.mitigated,
            active: fvg.active
        }))
    ];

    const candleAnalysis = {
        seq3: analyzeCandleSequence(candles, 3),
        sequenceTracker: trackCandleSequence(candles)
    };

    // 4. Advanced Features Calculation
    const currentCandle = candles[candles.length - 1];
    const atr = indicators.atr;

    // Momentum
    const closeNow = currentCandle.close;
    const close3 = candles[candles.length - 4] ? candles[candles.length - 4].close : closeNow;
    const momentum = closeNow - close3;
    const momentumRate = atr > 0 ? momentum / atr : 0;

    // Volume Spike
    const volumes = candles.map(c => c.volume);
    const avgVolume = volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
    const volRel = avgVolume > 0 ? currentCandle.volume / avgVolume : 1;

    // Candle Quality
    const body = Math.abs(currentCandle.close - currentCandle.open);
    const range = currentCandle.high - currentCandle.low;
    const candleQuality = range > 0 ? body / range : 0;

    // Break of Structure (BOS) / CHOCH
    // Use SMC data
    let bos = null;
    let structuralStop = 0;

    if (structure.length > 0) {
        const lastStruct = structure[structure.length - 1];
        if (lastStruct.index >= candles.length - 5) { // Recent break
            bos = lastStruct.type === 'BOS_UP' ? 'BOS_BULL' : 'BOS_BEAR';

            // Set Stop based on recent Swing
            if (bos === 'BOS_BULL') {
                structuralStop = smcData.lastLow || (currentCandle.low - atr);
            } else {
                structuralStop = smcData.lastHigh || (currentCandle.high + atr);
            }
        }
    }

    // 5. Scoring
    let score = 0;
    if (Math.abs(momentumRate) > 1.5) score += 20;
    if (volRel > config.VOLUME_SPIKE_THRESHOLD) score += 20;
    if (candleQuality > 0.7) score += 10;
    if (bos) score += 15;
    if (htfContext.isInsideZone) score += 15;

    let signal = 'NEUTRO';
    if (score >= 60) {
        if (bos) {
            signal = bos.includes('BULL') ? 'COMPRA' : 'VENDA';
        } else if (momentumRate > 0) {
            signal = 'COMPRA';
        } else {
            signal = 'VENDA';
        }
    }

    return {
        price: currentCandle.close,
        indicators,
        zones: unifiedZones, // Send unified zones for display
        candleAnalysis,
        structure: {
            swings: smcData.pivots || [],
            lines: structure,
            blocks: orderBlocks,
            lps: smcData.lps || []
        },
        htfContext,
        advanced: {
            momentumRate,
            volRel,
            candleQuality,
            bos,
            score,
            signal,
            structuralStop
        }
    };
}

// --- HELPER FUNCTIONS ---

function calculateIndicators(closes, highs, lows) {
    const rsi = RSI.calculate({ values: closes, period: 14 });
    const bb = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 });
    const ema = EMA.calculate({ period: 9, values: closes });
    const atr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });

    return {
        rsi: rsi[rsi.length - 1] || 50,
        bb: bb[bb.length - 1] || { upper: 0, middle: 0, lower: 0 },
        ema: ema[ema.length - 1] || 0,
        atr: atr[atr.length - 1] || 0,
        currentPrice: closes[closes.length - 1]
    };
}

function analyzeHTFContext(htfCandles, currentPrice) {
    if (!htfCandles || htfCandles.length < 20) return { isInsideZone: false, zones: [] };

    // Use SMC Service for HTF as well? 
    // For now, keep simple HTF logic or reuse SMCService if possible.
    // Let's keep the existing simple logic for HTF to avoid overhead, 
    // or better: use SMCService on HTF candles too!

    const smcHTF = smcService.analyze(htfCandles);
    const activeZones = smcHTF.obs.concat(smcHTF.fvgs).map(z => ({
        type: (z.type === 'BU' || z.type === 'FU') ? 'DEMAND' : 'SUPPLY',
        top: z.top,
        bottom: z.bottom,
        price: (z.top + z.bottom) / 2
    }));

    let isInsideZone = false;
    let zoneType = null;

    activeZones.forEach(z => {
        if (currentPrice <= z.top && currentPrice >= z.bottom) {
            isInsideZone = true;
            zoneType = z.type;
        }
    });

    return { isInsideZone, zoneType, zones: activeZones };
}

function analyzeCandleSequence(candles, count) {
    return { direction: 'NEUTRO', strength: 0 };
}

function trackCandleSequence(candles) {
    return { streak: 0, type: 'NEUTRAL', probability: 50 };
}

