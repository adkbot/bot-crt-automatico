/**
 * 📊 CRT ANALYZER - Candle Range Theory
 * Análise baseada na anatomia da vela de 4H
 * 
 * Fases da Vela:
 * 1. Consolidação - Preço abre e rangeia
 * 2. Manipulação - Movimento contra tendência (cria pavio)
 * 3. Distribuição - Movimento impulsivo real
 * 4. Exaustão - Vela se prepara para fechar
 * 
 * Ponto Chave: PCC (Previous Candle Close)
 */

class CRTAnalyzer {
    constructor() {
        this.h4Candles = [];
        this.currentH4Candle = null;
        this.pcc = null; // Previous Candle Close (CRÍTICO!)
    }

    /**
     * Análise principal CRT
     */
    analyze(candles1m, candles4h) {
        if (!candles4h || candles4h.length < 2) {
            return this.getEmptyAnalysis();
        }

        // Atualizar velas de 4H
        this.h4Candles = candles4h;
        this.currentH4Candle = candles4h[candles4h.length - 1];

        // PCC = Fechamento da vela anterior (PONTO MAIS IMPORTANTE!)
        const previousH4Candle = candles4h[candles4h.length - 2];
        this.pcc = previousH4Candle.close;

        return {
            pcc: this.pcc,
            currentH4: this.currentH4Candle,
            quadrants: this.calculateQuadrants(this.currentH4Candle),
            phase: this.detectPhase(this.currentH4Candle, candles1m),
            manipulation: this.detectManipulation(this.currentH4Candle, candles1m),
            turtleSoup: this.detectTurtleSoup(candles1m),
            fvg: this.detectFVG(candles1m),
            bias: this.determineBias(this.currentH4Candle),
            entryZone: this.identifyEntryZone(this.currentH4Candle, candles1m)
        };
    }

    /**
     * Calcular Quadrantes Fibonacci (25%, 50%, 75%)
     * Usado para medir força da tendência
     */
    calculateQuadrants(h4Candle) {
        const high = h4Candle.high;
        const low = h4Candle.low;
        const range = high - low;

        return {
            high: high,
            q75: high - (range * 0.25),      // 75% (Premium)
            q50: low + (range * 0.5),        // 50% (Equilíbrio)
            q25: low + (range * 0.25),       // 25% (Discount)
            low: low,
            currentPrice: h4Candle.close,

            // Determinar em qual quadrante está
            currentQuadrant: this.getCurrentQuadrant(h4Candle.close, high, low, range)
        };
    }

    /**
     * Determinar em qual quadrante o preço está
     */
    getCurrentQuadrant(price, high, low, range) {
        const position = (price - low) / range;

        if (position > 0.75) return 'Q4_PREMIUM';      // Acima de 75%
        if (position > 0.50) return 'Q3_UPPER';        // 50-75%
        if (position > 0.25) return 'Q2_LOWER';        // 25-50%
        return 'Q1_DISCOUNT';                          // Abaixo de 25%
    }

    /**
     * Detectar fase atual da vela
     */
    detectPhase(h4Candle, candles1m) {
        if (!candles1m || candles1m.length < 20) {
            return { phase: 'UNKNOWN', confidence: 0 };
        }

        const recent1m = candles1m.slice(-20);
        const volatility = this.calculateVolatility(recent1m);
        const direction = this.getDirection(recent1m);

        // 1. CONSOLIDAÇÃO: Baixa volatilidade, preço rangeia
        if (volatility < 0.5) {
            return {
                phase: 'CONSOLIDATION',
                confidence: 0.8,
                description: 'Preço rangeando, aguardando movimento'
            };
        }

        // 2. MANIPULAÇÃO: Movimento contra tendência (criando pavio)
        const isManipulation = this.isAgainstH4Trend(h4Candle, direction);
        if (isManipulation && volatility > 0.7) {
            return {
                phase: 'MANIPULATION',
                confidence: 0.85,
                description: 'Criando pavio - zona de entrada!'
            };
        }

        // 3. DISTRIBUIÇÃO: Movimento impulsivo na direção da vela 4H
        const isDistribution = !isManipulation && volatility > 1.0;
        if (isDistribution) {
            return {
                phase: 'DISTRIBUTION',
                confidence: 0.9,
                description: 'Movimento impulsivo - ride the wave!'
            };
        }

        // 4. EXAUSTÃO: Vela de 4H perto de fechar
        const timeProgress = this.getH4TimeProgress();
        if (timeProgress > 0.90) {
            return {
                phase: 'EXHAUSTION',
                confidence: 0.75,
                description: 'Vela 4H fechando - aguardar próxima'
            };
        }

        return { phase: 'TRANSITION', confidence: 0.5 };
    }

    /**
     * Detectar MANIPULAÇÃO (momento chave para entrada!)
     * Manipulação = Preço vai ABAIXO do PCC (bullish) ou ACIMA do PCC (bearish)
     */
    detectManipulation(h4Candle, candles1m) {
        if (!candles1m || candles1m.length === 0) return null;

        const currentPrice = candles1m[candles1m.length - 1].close;
        const h4Direction = h4Candle.close > h4Candle.open ? 'BULLISH' : 'BEARISH';

        // BULLISH: Preço foi ABAIXO do PCC (criando pavio inferior)
        if (h4Direction === 'BULLISH' && currentPrice < this.pcc) {
            const wickSize = this.pcc - currentPrice;
            const wickPercent = (wickSize / this.pcc) * 100;

            return {
                type: 'BULLISH_MANIPULATION',
                pcc: this.pcc,
                currentPrice: currentPrice,
                wickSize: wickSize,
                wickPercent: wickPercent,
                isValid: wickPercent > 0.1 && wickPercent < 2.0, // 0.1% - 2% é ideal
                description: `Preço ${wickPercent.toFixed(2)}% abaixo do PCC - ZONA DE COMPRA!`,
                entryRecommended: true
            };
        }

        // BEARISH: Preço foi ACIMA do PCC (criando pavio superior)
        if (h4Direction === 'BEARISH' && currentPrice > this.pcc) {
            const wickSize = currentPrice - this.pcc;
            const wickPercent = (wickSize / this.pcc) * 100;

            return {
                type: 'BEARISH_MANIPULATION',
                pcc: this.pcc,
                currentPrice: currentPrice,
                wickSize: wickSize,
                wickPercent: wickPercent,
                isValid: wickPercent > 0.1 && wickPercent < 2.0,
                description: `Preço ${wickPercent.toFixed(2)}% acima do PCC - ZONA DE VENDA!`,
                entryRecommended: true
            };
        }

        return null;
    }

    /**
     * Detectar padrão TURTLE SOUP
     * = Captura de liquidez seguida de reversão rápida
     */
    detectTurtleSoup(candles1m) {
        if (!candles1m || candles1m.length < 30) return null;

        const recent = candles1m.slice(-30);

        // Encontrar swing high/low recentes
        const swingHigh = Math.max(...recent.slice(0, -5).map(c => c.high));
        const swingLow = Math.min(...recent.slice(0, -5).map(c => c.low));

        const last5 = recent.slice(-5);
        const currentPrice = last5[last5.length - 1].close;

        // Turtle Soup BULLISH: Quebrou swing low e reverteu
        const brokeSwingLow = last5.some(c => c.low < swingLow);
        const reversedUp = currentPrice > swingLow && brokeSwingLow;

        if (reversedUp) {
            return {
                type: 'BULLISH_TURTLE_SOUP',
                swingLevel: swingLow,
                breakPrice: Math.min(...last5.map(c => c.low)),
                currentPrice: currentPrice,
                confirmed: true,
                description: 'Liquidez capturada abaixo, reversão bullish!'
            };
        }

        // Turtle Soup BEARISH: Quebrou swing high e reverteu
        const brokeSwingHigh = last5.some(c => c.high > swingHigh);
        const reversedDown = currentPrice < swingHigh && brokeSwingHigh;

        if (reversedDown) {
            return {
                type: 'BEARISH_TURTLE_SOUP',
                swingLevel: swingHigh,
                breakPrice: Math.max(...last5.map(c => c.high)),
                currentPrice: currentPrice,
                confirmed: true,
                description: 'Liquidez capturada acima, reversão bearish!'
            };
        }

        return null;
    }

    /**
     * Detectar Fair Value Gap (FVG) no timeframe de 1m
     */
    detectFVG(candles1m) {
        if (!candles1m || candles1m.length < 20) return [];

        const gaps = [];
        const recent = candles1m.slice(-20);

        for (let i = 1; i < recent.length - 1; i++) {
            const c1 = recent[i - 1];
            const c2 = recent[i];
            const c3 = recent[i + 1];

            // FVG Bullish: Gap entre high de c1 e low de c3
            if (c3.low > c1.high && c2.close > c2.open) {
                gaps.push({
                    type: 'BULLISH_FVG',
                    top: c3.low,
                    bottom: c1.high,
                    size: c3.low - c1.high,
                    index: i,
                    timestamp: c2.time
                });
            }

            // FVG Bearish: Gap entre low de c1 e high de c3
            if (c3.high < c1.low && c2.close < c2.open) {
                gaps.push({
                    type: 'BEARISH_FVG',
                    top: c1.low,
                    bottom: c3.high,
                    size: c1.low - c3.high,
                    index: i,
                    timestamp: c2.time
                });
            }
        }

        return gaps.slice(-3); // Últimos 3 FVGs
    }

    /**
     * Determinar viés da vela de 4H
     */
    determineBias(h4Candle) {
        const isBullish = h4Candle.close > h4Candle.open;
        const bodySize = Math.abs(h4Candle.close - h4Candle.open);
        const range = h4Candle.high - h4Candle.low;
        const bodyPercent = (bodySize / range) * 100;

        return {
            direction: isBullish ? 'BULLISH' : 'BEARISH',
            strength: bodyPercent > 60 ? 'STRONG' : bodyPercent > 40 ? 'MEDIUM' : 'WEAK',
            bodyPercent: bodyPercent
        };
    }

    /**
     * Identificar zona de entrada ideal
     */
    identifyEntryZone(h4Candle, candles1m) {
        const manipulation = this.detectManipulation(h4Candle, candles1m);
        const quadrants = this.calculateQuadrants(h4Candle);

        if (!manipulation || !manipulation.isValid) {
            return { hasEntry: false, reason: 'Aguardando manipulação no PCC' };
        }

        const currentPrice = candles1m[candles1m.length - 1].close;

        // COMPRA: Preço abaixo do PCC + quadrante correto
        if (manipulation.type === 'BULLISH_MANIPULATION') {
            const inGoodQuadrant = quadrants.currentQuadrant === 'Q1_DISCOUNT' ||
                quadrants.currentQuadrant === 'Q2_LOWER';

            return {
                hasEntry: true,
                type: 'LONG',
                entry: currentPrice,
                reason: `Manipulação bullish + ${quadrants.currentQuadrant}`,
                stopLoss: currentPrice - (manipulation.wickSize * 0.5),
                takeProfit: quadrants.q75, // Alvo no quadrante 75%
                riskReward: this.calculateRR(currentPrice, currentPrice - (manipulation.wickSize * 0.5), quadrants.q75)
            };
        }

        // VENDA: Preço acima do PCC + quadrante correto
        if (manipulation.type === 'BEARISH_MANIPULATION') {
            const inGoodQuadrant = quadrants.currentQuadrant === 'Q4_PREMIUM' ||
                quadrants.currentQuadrant === 'Q3_UPPER';

            return {
                hasEntry: true,
                type: 'SHORT',
                entry: currentPrice,
                reason: `Manipulação bearish + ${quadrants.currentQuadrant}`,
                stopLoss: currentPrice + (manipulation.wickSize * 0.5),
                takeProfit: quadrants.q25, // Alvo no quadrante 25%
                riskReward: this.calculateRR(currentPrice, currentPrice + (manipulation.wickSize * 0.5), quadrants.q25)
            };
        }

        return { hasEntry: false };
    }

    // ===== HELPER FUNCTIONS =====

    calculateVolatility(candles) {
        const ranges = candles.map(c => c.high - c.low);
        const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
        const currentRange = candles[candles.length - 1].high - candles[candles.length - 1].low;
        return currentRange / avgRange;
    }

    getDirection(candles) {
        const closes = candles.map(c => c.close);
        return closes[closes.length - 1] > closes[0] ? 'UP' : 'DOWN';
    }

    isAgainstH4Trend(h4Candle, direction1m) {
        const h4Direction = h4Candle.close > h4Candle.open ? 'UP' : 'DOWN';
        return h4Direction !== direction1m;
    }

    getH4TimeProgress() {
        // Calcular quanto % da vela 4H já passou
        const now = Date.now();
        const h4Start = Math.floor(now / (4 * 60 * 60 * 1000)) * (4 * 60 * 60 * 1000);
        const elapsed = now - h4Start;
        const total = 4 * 60 * 60 * 1000;
        return elapsed / total;
    }

    calculateRR(entry, sl, tp) {
        const risk = Math.abs(entry - sl);
        const reward = Math.abs(tp - entry);
        return reward / risk;
    }

    getEmptyAnalysis() {
        return {
            pcc: null,
            currentH4: null,
            quadrants: null,
            phase: { phase: 'UNKNOWN', confidence: 0 },
            manipulation: null,
            turtleSoup: null,
            fvg: [],
            bias: null,
            entryZone: { hasEntry: false }
        };
    }
}

module.exports = CRTAnalyzer;
