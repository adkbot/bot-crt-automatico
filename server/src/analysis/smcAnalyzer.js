/**
 * 📊 SMC ANALYZER - Análise Smart Money Concepts
 * Detecta padrões de Smart Money: BOS, CHOCH, Order Blocks, FVG, etc.
 */

class SMCAnalyzer {
    constructor() {
        this.swings = [];
        this.orderBlocks = [];
        this.fvgs = [];
        this.liquiditySweeps = [];
    }

    /**
     * Analisa velas e detecta todos os padrões SMC
     */
    analyze(candles, currentCandle) {
        if (candles.length < 50) return this.getEmptyAnalysis();

        return {
            structure: this.detectStructure(candles),
            orderBlocks: this.detectOrderBlocks(candles),
            fvg: this.detectFVG(candles),
            sweep: this.detectLiquiditySweep(candles, currentCandle),
            premiumDiscount: this.calculatePremiumDiscount(candles),
            marketBias: this.getMarketBias(candles)
        };
    }

    /**
     * Detecta Break of Structure (BOS) e Change of Character (CHOCH)
     */
    detectStructure(candles) {
        const swings = this.findSwingPoints(candles);

        if (swings.length < 3) {
            return { type: null, confirmed: false };
        }

        const lastSwing = swings[swings.length - 1];
        const prevSwing = swings[swings.length - 2];
        const currentPrice = candles[candles.length - 1].close;

        // BOS Bullish: Preço quebra acima do último high
        if (lastSwing.type === 'high' && currentPrice > lastSwing.price) {
            return {
                type: 'BOS',
                direction: 'BULLISH',
                confirmed: true,
                price: lastSwing.price,
                candle: lastSwing.index
            };
        }

        // BOS Bearish: Preço quebra abaixo do último low
        if (lastSwing.type === 'low' && currentPrice < lastSwing.price) {
            return {
                type: 'BOS',
                direction: 'BEARISH',
                confirmed: true,
                price: lastSwing.price,
                candle: lastSwing.index
            };
        }

        // CHOCH: Mudança de caráter (quebra do padrão anterior)
        if (prevSwing.type === 'high' && lastSwing.type === 'low' && currentPrice > prevSwing.price) {
            return {
                type: 'CHOCH',
                direction: 'BULLISH',
                confirmed: true,
                price: prevSwing.price,
                candle: prevSwing.index
            };
        }

        return { type: null, confirmed: false };
    }

    /**
     * Detecta Order Blocks (blocos de ordens institucionais)
     */
    detectOrderBlocks(candles) {
        const blocks = [];

        for (let i = candles.length - 20; i < candles.length - 1; i++) {
            if (i < 2) continue;

            const candle = candles[i];
            const nextCandle = candles[i + 1];
            const bodySize = Math.abs(candle.close - candle.open);
            const avgBody = this.getAverageBodySize(candles.slice(i - 10, i));

            // OB Bullish: Vela de baixa seguida de forte alta
            if (candle.close < candle.open &&
                nextCandle.close > nextCandle.open &&
                nextCandle.close > candle.high &&
                bodySize > avgBody * 0.5) {

                blocks.push({
                    type: 'BULLISH',
                    high: candle.high,
                    low: candle.low,
                    index: i,
                    strength: this.calculateOBStrength(candle, nextCandle)
                });
            }

            // OB Bearish: Vela de alta seguida de forte queda
            if (candle.close > candle.open &&
                nextCandle.close < nextCandle.open &&
                nextCandle.close < candle.low &&
                bodySize > avgBody * 0.5) {

                blocks.push({
                    type: 'BEARISH',
                    high: candle.high,
                    low: candle.low,
                    index: i,
                    strength: this.calculateOBStrength(candle, nextCandle)
                });
            }
        }

        // Retorna apenas os OBs mais recentes e fortes
        return blocks
            .sort((a, b) => b.strength - a.strength)
            .slice(0, 3);
    }

    /**
     * Detecta Fair Value Gaps (gaps de valor justo)
     */
    detectFVG(candles) {
        const gaps = [];

        for (let i = candles.length - 20; i < candles.length - 2; i++) {
            if (i < 1) continue;

            const c1 = candles[i - 1];
            const c2 = candles[i];
            const c3 = candles[i + 1];

            // FVG Bullish: Gap entre low da c3 e high da c1
            if (c3.low > c1.high && c2.close > c2.open) {
                gaps.push({
                    type: 'BULLISH',
                    top: c3.low,
                    bottom: c1.high,
                    index: i,
                    size: c3.low - c1.high
                });
            }

            // FVG Bearish: Gap entre high da c3 e low da c1
            if (c3.high < c1.low && c2.close < c2.open) {
                gaps.push({
                    type: 'BEARISH',
                    top: c1.low,
                    bottom: c3.high,
                    index: i,
                    size: c1.low - c3.high
                });
            }
        }

        return gaps.slice(-3); // Últimos 3 FVGs
    }

    /**
     * Detecta Liquidity Sweep (varredura de liquidez)
     */
    detectLiquiditySweep(candles, currentCandle) {
        if (candles.length < 20) return null;

        const recent = candles.slice(-20);
        const lows = recent.map(c => c.low);
        const highs = recent.map(c => c.high);

        const supportLevel = Math.min(...lows);
        const resistanceLevel = Math.max(...highs);

        // Sweep Bullish: Toca suporte e fecha acima
        if (currentCandle.low <= supportLevel &&
            currentCandle.close > supportLevel &&
            currentCandle.close > currentCandle.open) {
            return {
                type: 'BULLISH',
                level: supportLevel,
                confirmed: true
            };
        }

        // Sweep Bearish: Toca resistência e fecha abaixo
        if (currentCandle.high >= resistanceLevel &&
            currentCandle.close < resistanceLevel &&
            currentCandle.close < currentCandle.open) {
            return {
                type: 'BEARISH',
                level: resistanceLevel,
                confirmed: true
            };
        }

        return null;
    }

    /**
     * Calcula zonas Premium/Discount (Fibonacci)
     */
    calculatePremiumDiscount(candles) {
        const recent = candles.slice(-50);
        const high = Math.max(...recent.map(c => c.high));
        const low = Math.min(...recent.map(c => c.low));
        const range = high - low;

        return {
            high,
            low,
            premium: high - (range * 0.382), // 61.8% - 100%
            equilibrium: low + (range * 0.5), // 50%
            discount: low + (range * 0.382), // 0% - 38.2%
            current: candles[candles.length - 1].close
        };
    }

    /**
     * Determina o viés do mercado
     */
    getMarketBias(candles) {
        const ema20 = this.calculateEMA(candles, 20);
        const ema50 = this.calculateEMA(candles, 50);
        const currentPrice = candles[candles.length - 1].close;

        if (ema20 > ema50 && currentPrice > ema20) {
            return 'BULLISH';
        } else if (ema20 < ema50 && currentPrice < ema20) {
            return 'BEARISH';
        }

        return 'NEUTRAL';
    }

    // ===== HELPER FUNCTIONS =====

    findSwingPoints(candles) {
        const swings = [];
        const lookback = 5;

        for (let i = lookback; i < candles.length - lookback; i++) {
            const slice = candles.slice(i - lookback, i + lookback + 1);
            const current = candles[i];

            // Swing High
            if (current.high === Math.max(...slice.map(c => c.high))) {
                swings.push({ type: 'high', price: current.high, index: i });
            }

            // Swing Low
            if (current.low === Math.min(...slice.map(c => c.low))) {
                swings.push({ type: 'low', price: current.low, index: i });
            }
        }

        return swings;
    }

    getAverageBodySize(candles) {
        const bodies = candles.map(c => Math.abs(c.close - c.open));
        return bodies.reduce((a, b) => a + b, 0) / bodies.length;
    }

    calculateOBStrength(candle, nextCandle) {
        const bodySize = Math.abs(candle.close - candle.open);
        const nextBodySize = Math.abs(nextCandle.close - nextCandle.open);
        return (bodySize + nextBodySize) / 2;
    }

    calculateEMA(candles, period) {
        const k = 2 / (period + 1);
        let ema = candles[0].close;

        for (let i = 1; i < candles.length; i++) {
            ema = (candles[i].close * k) + (ema * (1 - k));
        }

        return ema;
    }

    getEmptyAnalysis() {
        return {
            structure: { type: null, confirmed: false },
            orderBlocks: [],
            fvg: [],
            sweep: null,
            premiumDiscount: null,
            marketBias: 'NEUTRAL'
        };
    }
}

module.exports = SMCAnalyzer;
