const { ATR } = require('technicalindicators');

class SMCService {
    constructor() {
        // Default Inputs from the Pine Script
        this.pivotLen = 6;
        this.bodyLookback = 20;
        this.atrLen = 14;
        this.minOBatr = 0.80;
        this.minFVGatr = 0.35;
        this.ttlOBBars = 300;
        this.ttlFVGBars = 300;
        this.maxOBKeep = 12;
        this.maxFVGKeep = 8;
        this.extendOnlyUnmitigated = true;
        this.extendToLive = true;
        this.boxWidthBars = 80;
        this.showLP = true;
        this.useATRTol = true;
        this.tolATRmult = 0.05;
        this.tolTicks = 3;
        this.useTrendFilter = true;
        this.obInTrendOnly = true;
        this.fvgInTrendOnly = true;
    }

    analyze(candles) {
        if (!candles || candles.length < 100) return { obs: [], fvgs: [], structure: [], lps: [] };

        // Prepare data arrays
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const closes = candles.map(c => c.close);
        const opens = candles.map(c => c.open);

        // Calculate ATR
        const atrInput = { high: highs, low: lows, close: closes, period: this.atrLen };
        const atrValues = ATR.calculate(atrInput);
        // Pad ATR array to match candles length (ATR result is shorter by period)
        const atrPadded = new Array(candles.length - atrValues.length).fill(0).concat(atrValues);

        // State Variables (simulating 'var' in Pine)
        let lastHigh = null; // Price
        let lastLow = null; // Price
        let msTrend = "none";

        // Containers
        let obBox = []; // { id, type, top, bottom, birthIndex, mitigated, active }
        let fvgBox = []; // { id, type, top, bottom, birthIndex, mitigated, active }
        let structureEvents = []; // BOS/CHOCH events

        // Helper to get ATR at index
        const getAtr = (i) => atrPadded[i] || 0;

        // Helper: Pivot Detection
        const isPivotHigh = (i) => {
            if (i < this.pivotLen * 2) return false;
            const pivotIndex = i - this.pivotLen;
            const pivotPrice = highs[pivotIndex];

            // Check left
            for (let k = 1; k <= this.pivotLen; k++) {
                if (highs[pivotIndex - k] > pivotPrice) return false;
            }
            // Check right
            for (let k = 1; k <= this.pivotLen; k++) {
                if (highs[pivotIndex + k] >= pivotPrice) return false; // Strict check usually
            }
            return true;
        };

        const isPivotLow = (i) => {
            if (i < this.pivotLen * 2) return false;
            const pivotIndex = i - this.pivotLen;
            const pivotPrice = lows[pivotIndex];

            // Check left
            for (let k = 1; k <= this.pivotLen; k++) {
                if (lows[pivotIndex - k] < pivotPrice) return false;
            }
            // Check right
            for (let k = 1; k <= this.pivotLen; k++) {
                if (lows[pivotIndex + k] <= pivotPrice) return false;
            }
            return true;
        };

        // Helper: Find Last Body
        const fLastBearBody = (currentIndex) => {
            for (let k = 1; k <= this.bodyLookback; k++) {
                const idx = currentIndex - k;
                if (idx < 0) break;
                if (closes[idx] < opens[idx]) { // Bearish
                    return {
                        hi: Math.max(opens[idx], closes[idx]),
                        lo: Math.min(opens[idx], closes[idx])
                    };
                }
            }
            return null;
        };

        const fLastBullBody = (currentIndex) => {
            for (let k = 1; k <= this.bodyLookback; k++) {
                const idx = currentIndex - k;
                if (idx < 0) break;
                if (closes[idx] > opens[idx]) { // Bullish
                    return {
                        hi: Math.max(opens[idx], closes[idx]),
                        lo: Math.min(opens[idx], closes[idx])
                    };
                }
            }
            return null;
        };

        // Main Loop
        for (let i = this.pivotLen * 2; i < candles.length; i++) {
            const currentClose = closes[i];
            const currentHigh = highs[i];
            const currentLow = lows[i];
            const atrVal = getAtr(i);

            // 1. Pivot Detection & Trend Update
            if (isPivotHigh(i)) {
                // The pivot was at i - pivotLen
                lastHigh = highs[i - this.pivotLen];
            }
            if (isPivotLow(i)) {
                lastLow = lows[i - this.pivotLen];
            }

            // 2. BOS Detection
            let bosUp = false;
            let bosDown = false;

            if (lastHigh !== null && currentClose > lastHigh) {
                bosUp = true;
                // Update Trend
                msTrend = "up";
                structureEvents.push({ index: i, type: 'BOS_UP', price: currentClose, time: candles[i].time });
            }

            if (lastLow !== null && currentClose < lastLow) {
                bosDown = true;
                msTrend = "down";
                structureEvents.push({ index: i, type: 'BOS_DOWN', price: currentClose, time: candles[i].time });
            }

            // 3. OB Logic
            const allowBull = !this.useTrendFilter || msTrend === "up";
            const allowBear = !this.useTrendFilter || msTrend === "down";

            if (bosUp && allowBull && atrVal > 0) {
                const body = fLastBearBody(i);
                if (body && (body.hi - body.lo) >= atrVal * this.minOBatr) {
                    // Create Bullish OB
                    obBox.push({
                        type: 'BU',
                        top: body.hi,
                        bottom: body.lo,
                        birthIndex: i,
                        mitigated: false,
                        active: true,
                        color: 'lime'
                    });
                }
            }

            if (bosDown && allowBear && atrVal > 0) {
                const body = fLastBullBody(i);
                if (body && (body.hi - body.lo) >= atrVal * this.minOBatr) {
                    // Create Bearish OB
                    obBox.push({
                        type: 'B',
                        top: body.hi,
                        bottom: body.lo,
                        birthIndex: i,
                        mitigated: false,
                        active: true,
                        color: 'red'
                    });
                }
            }

            // Limit OBs
            if (obBox.length > this.maxOBKeep) {
                obBox.shift();
            }

            // 4. FVG Logic
            // Bullish FVG: low > high[i-2]
            if (i >= 2 && atrVal > 0) {
                const bullFVG = lows[i] > highs[i - 2];
                if (bullFVG && (!this.fvgInTrendOnly || allowBull)) {
                    const topFU = lows[i];
                    const botFU = highs[i - 2];
                    if ((topFU - botFU) >= atrVal * this.minFVGatr) {
                        fvgBox.push({
                            type: 'FU',
                            top: topFU,
                            bottom: botFU,
                            birthIndex: i,
                            mitigated: false,
                            active: true,
                            color: 'teal'
                        });
                    }
                }

                const bearFVG = highs[i] < lows[i - 2];
                if (bearFVG && (!this.fvgInTrendOnly || allowBear)) {
                    const topFD = lows[i - 2];
                    const botFD = highs[i];
                    if ((topFD - botFD) >= atrVal * this.minFVGatr) {
                        fvgBox.push({
                            type: 'FD',
                            top: topFD,
                            bottom: botFD,
                            birthIndex: i,
                            mitigated: false,
                            active: true,
                            color: 'orange'
                        });
                    }
                }
            }

            // Limit FVGs
            if (fvgBox.length > this.maxFVGKeep) {
                fvgBox.shift();
            }

            // 5. Maintain / Mitigate OBs & FVGs
            // Check if current candle mitigates any existing box
            obBox.forEach(ob => {
                if (!ob.active) return;
                // Check mitigation
                if (!ob.mitigated) {
                    if (currentHigh >= ob.bottom && currentLow <= ob.top) {
                        ob.mitigated = true;
                    }
                }
                // TTL Check
                if (this.ttlOBBars > 0 && (i - ob.birthIndex) > this.ttlOBBars) {
                    ob.active = false;
                }
            });

            fvgBox.forEach(fvg => {
                if (!fvg.active) return;
                if (!fvg.mitigated) {
                    if (currentHigh >= fvg.bottom && currentLow <= fvg.top) {
                        fvg.mitigated = true;
                    }
                }
                if (this.ttlFVGBars > 0 && (i - fvg.birthIndex) > this.ttlFVGBars) {
                    fvg.active = false;
                }
            });
        }

        // Filter active boxes for output
        const activeOBs = obBox.filter(b => b.active);
        const activeFVGs = fvgBox.filter(b => b.active);

        // Collect Pivots for visualization
        const pivots = [];
        const pivotHighs = [];
        const pivotLows = [];

        for (let i = this.pivotLen * 2; i < candles.length; i++) {
            if (isPivotHigh(i)) {
                const p = { index: i - this.pivotLen, type: 'HIGH', price: highs[i - this.pivotLen], time: candles[i - this.pivotLen].time };
                pivots.push(p);
                pivotHighs.push(p);
            }
            if (isPivotLow(i)) {
                const p = { index: i - this.pivotLen, type: 'LOW', price: lows[i - this.pivotLen], time: candles[i - this.pivotLen].time };
                pivots.push(p);
                pivotLows.push(p);
            }
        }

        // Liquidity Pools (EQH/EQL)
        const lps = [];
        const lastCandleIndex = candles.length - 1;
        const currentAtr = getAtr(lastCandleIndex);
        const tolerance = this.useATRTol && currentAtr > 0 ? currentAtr * this.tolATRmult : 0.0001 * this.tolTicks;

        // Check Highs
        for (let i = 1; i < pivotHighs.length; i++) {
            const curr = pivotHighs[i];
            const prev = pivotHighs[i - 1];
            if (Math.abs(curr.price - prev.price) <= tolerance) {
                if (curr.index > candles.length - 500) {
                    lps.push({ type: 'EQH', price: curr.price, index: curr.index, time: curr.time });
                }
            }
        }

        // Check Lows
        for (let i = 1; i < pivotLows.length; i++) {
            const curr = pivotLows[i];
            const prev = pivotLows[i - 1];
            if (Math.abs(curr.price - prev.price) <= tolerance) {
                if (curr.index > candles.length - 500) {
                    lps.push({ type: 'EQL', price: curr.price, index: curr.index, time: curr.time });
                }
            }
        }

        return {
            obs: activeOBs,
            fvgs: activeFVGs,
            structure: structureEvents,
            trend: msTrend,
            lastHigh,
            lastLow,
            pivots,
            lps
        };
    }
}

module.exports = new SMCService();
