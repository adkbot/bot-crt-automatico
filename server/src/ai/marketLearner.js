/**
 * 🧠 MARKET LEARNER - Sistema de Aprendizado de Mercado
 * Aprende padrões do mercado e melhora as entradas ao longo do tempo
 */

class MarketLearner {
    constructor() {
        // Sistema de aprendizado baseado em score e pesos adaptativos
        this.weights = {
            rsi: 1.0,
            macd: 1.0,
            volume: 1.0,
            bos: 1.5,
            orderBlock: 1.5,
            fvg: 1.2,
            sweep: 1.3
        };

        this.trainingData = [];
        this.performance = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            avgProfit: 0,
            totalProfit: 0
        };

        this.isTrained = false;
        this.minTrainingSize = 50;
    }

    /**
     * Adiciona um trade ao histórico de aprendizado
     */
    addTrade(setup, result) {
        this.trainingData.push({
            indicators: setup.indicators,
            profit: result.profit
        });

        // Atualizar performance
        this.performance.totalTrades++;
        if (result.profit > 0) {
            this.performance.winningTrades++;
        } else {
            this.performance.losingTrades++;
        }

        this.performance.winRate = (this.performance.winningTrades / this.performance.totalTrades) * 100;
        this.performance.totalProfit += result.profit;
        this.performance.avgProfit = this.performance.totalProfit / this.performance.totalTrades;

        // Retreinar se tiver dados suficientes
        if (this.trainingData.length >= this.minTrainingSize && this.trainingData.length % 10 === 0) {
            this.train();
        }
    }

    /**
     * Treina o sistema ajustando os pesos com base no histórico
     */
    train() {
        if (this.trainingData.length < this.minTrainingSize) {
            console.log(`⚠️ Dados insuficientes para treinamento (${this.trainingData.length}/${this.minTrainingSize})`);
            return;
        }

        console.log(`🧠 Iniciando treinamento com ${this.trainingData.length} trades...`);

        try {
            // Análise de padrões vencedores
            const winningTrades = this.trainingData.filter(t => t.profit > 0);
            const losingTrades = this.trainingData.filter(t => t.profit <= 0);

            // Ajustar pesos baseado em padrões de sucesso
            if (winningTrades.length > 0) {
                const winningPatterns = this.analyzePatterns(winningTrades);
                const losingPatterns = this.analyzePatterns(losingTrades);

                // Aumentar peso de indicadores que aparecem mais em wins
                for (const [key, value] of Object.entries(winningPatterns)) {
                    const losingValue = losingPatterns[key] || 0;
                    if (value > losingValue) {
                        this.weights[key] = Math.min(this.weights[key] * 1.1, 3.0);
                    } else {
                        this.weights[key] = Math.max(this.weights[key] * 0.9, 0.5);
                    }
                }
            }

            this.isTrained = true;
            console.log(`✅ Treinamento concluído!`);
            console.log(`📊 Win Rate: ${this.performance.winRate.toFixed(2)}%`);
            console.log(`💰 Lucro Médio: ${this.performance.avgProfit.toFixed(2)}%`);
            console.log(`⚙️ Pesos ajustados:`, this.weights);
        } catch (error) {
            console.error('❌ Erro no treinamento:', error.message);
        }
    }

    /**
     * Analisa padrões em um conjunto de trades
     */
    analyzePatterns(trades) {
        const patterns = {
            rsi: 0,
            macd: 0,
            volume: 0,
            bos: 0,
            orderBlock: 0,
            fvg: 0,
            sweep: 0
        };

        trades.forEach(trade => {
            const ind = trade.indicators;
            if (ind.rsi < 30 || ind.rsi > 70) patterns.rsi++;
            if (ind.macd > 0) patterns.macd++;
            if (ind.volumeRatio > 1.5) patterns.volume++;
            if (ind.bos) patterns.bos++;
            if (ind.orderBlock) patterns.orderBlock++;
            if (ind.fvg) patterns.fvg++;
            if (ind.sweep) patterns.sweep++;
        });

        return patterns;
    }

    /**
     * Prevê se deve entrar em um trade usando pesos adaptativos
     */
    predict(candle, indicators) {
        let score = 0;
        let reasons = [];

        // RSI com peso
        if (indicators.rsi < 30) {
            score += 0.2 * this.weights.rsi;
            reasons.push('RSI Sobrevenda');
        } else if (indicators.rsi > 70) {
            score += 0.2 * this.weights.rsi;
            reasons.push('RSI Sobrecompra');
        }

        // MACD com peso
        if (indicators.macd > 0) {
            score += 0.15 * this.weights.macd;
            reasons.push('MACD Positivo');
        }

        // Estrutura de mercado (SMC) com pesos
        if (indicators.bos) {
            score += 0.25 * this.weights.bos;
            reasons.push('Break of Structure');
        }

        if (indicators.orderBlock) {
            score += 0.2 * this.weights.orderBlock;
            reasons.push('Order Block');
        }

        if (indicators.fvg) {
            score += 0.15 * this.weights.fvg;
            reasons.push('FVG');
        }

        if (indicators.sweep) {
            score += 0.2 * this.weights.sweep;
            reasons.push('Liquidity Sweep');
        }

        // Volume com peso
        if (indicators.volumeRatio > 1.5) {
            score += 0.1 * this.weights.volume;
            reasons.push('Volume Alto');
        }

        // Normalizar score
        const maxPossibleScore = this.calculateMaxScore();
        const normalizedScore = Math.min(score / maxPossibleScore, 1);

        return {
            shouldEnter: normalizedScore >= 0.6,
            confidence: normalizedScore,
            expectedProfit: normalizedScore * 5,
            method: this.isTrained ? 'AI-Adaptive' : 'SMC',
            reasons
        };
    }

    /**
     * Calcula o score máximo possível
     */
    calculateMaxScore() {
        return (0.2 * this.weights.rsi) +
            (0.15 * this.weights.macd) +
            (0.25 * this.weights.bos) +
            (0.2 * this.weights.orderBlock) +
            (0.15 * this.weights.fvg) +
            (0.2 * this.weights.sweep) +
            (0.1 * this.weights.volume);
    }

    /**
     * Retorna estatísticas do aprendizado
     */
    getStats() {
        return {
            ...this.performance,
            trainingSize: this.trainingData.length,
            isTrained: this.isTrained,
            readyToLearn: this.trainingData.length >= this.minTrainingSize,
            weights: this.weights
        };
    }

    /**
     * Salva o modelo treinado
     */
    exportModel() {
        if (!this.isTrained) return null;

        return {
            weights: this.weights,
            performance: this.performance,
            trainingSize: this.trainingData.length
        };
    }

    /**
     * Carrega um modelo salvo
     */
    importModel(modelData) {
        try {
            this.weights = modelData.weights;
            this.performance = modelData.performance;
            this.isTrained = true;
            console.log('✅ Modelo carregado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao carregar modelo:', error.message);
        }
    }
}

module.exports = MarketLearner;
