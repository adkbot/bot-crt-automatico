/**
 * 🤖 SISTEMA INTELIGENTE DE VALIDAÇÃO CRT
 * Verifica e corrige automaticamente as marcações das linhas
 * Garante que tudo esteja no ponto certo da vela certa
 */

class CRTValidator {
    constructor() {
        this.errors = [];
        this.corrections = [];
    }

    /**
     * Valida todas as marcações CRT
     */
    validateCRTMarkers(crt, candles4h) {
        this.errors = [];
        this.corrections = [];

        if (!crt || !candles4h || candles4h.length < 2) {
            this.errors.push('Dados insuficientes para validação');
            return { valid: false, errors: this.errors };
        }

        // 1. Validar PCC (Previous Candle Close)
        this.validatePCC(crt, candles4h);

        // 2. Validar vela de 4H atual (Open, Close, High, Low)
        this.validate4HCandle(crt, candles4h);

        // 3. Validar manipulações
        this.validateManipulations(crt);

        // 4. Validar Turtle Soup
        this.validateTurtleSoup(crt);

        // 5. Validar zonas de entrada
        this.validateEntryZones(crt);

        const isValid = this.errors.length === 0;

        return {
            valid: isValid,
            errors: this.errors,
            corrections: this.corrections,
            summary: `${isValid ? '✅' : '❌'} Validação: ${this.errors.length} erros, ${this.corrections.length} correções`
        };
    }

    /**
     * Valida e corrige PCC
     */
    validatePCC(crt, candles4h) {
        const previousCandle = candles4h[candles4h.length - 2];

        if (!previousCandle) {
            this.errors.push('❌ Vela anterior não encontrada');
            return;
        }

        const correctPCC = parseFloat(previousCandle.close);
        const currentPCC = crt.pcc;

        // Validar tipo
        if (typeof currentPCC !== 'number' || isNaN(currentPCC)) {
            this.errors.push('❌ PCC inválido (não é número)');
            crt.pcc = correctPCC;
            this.corrections.push(`🔧 PCC corrigido: ${correctPCC}`);
            return;
        }

        // Validar valor (tolerância de 0.01%)
        const tolerance = correctPCC * 0.0001;
        const difference = Math.abs(currentPCC - correctPCC);

        if (difference > tolerance) {
            this.errors.push(`❌ PCC incorreto: ${currentPCC} (esperado: ${correctPCC})`);
            crt.pcc = correctPCC;
            this.corrections.push(`🔧 PCC corrigido: ${currentPCC} → ${correctPCC}`);
        }
    }

    /**
     * Valida vela de 4H atual
     */
    validate4HCandle(crt, candles4h) {
        const currentCandle = candles4h[candles4h.length - 1];

        if (!currentCandle) {
            this.errors.push('❌ Vela 4H atual não encontrada');
            return;
        }

        if (!crt.currentH4) {
            this.errors.push('❌ Dados currentH4 ausentes');
            crt.currentH4 = {
                open: parseFloat(currentCandle.open),
                close: parseFloat(currentCandle.close),
                high: parseFloat(currentCandle.high),
                low: parseFloat(currentCandle.low)
            };
            this.corrections.push('🔧 currentH4 criado automaticamente');
            return;
        }

        // Validar Open
        const correctOpen = parseFloat(currentCandle.open);
        if (!this.isValidPrice(crt.currentH4.open, correctOpen)) {
            this.errors.push(`❌ 4H Open incorreto: ${crt.currentH4.open}`);
            crt.currentH4.open = correctOpen;
            this.corrections.push(`🔧 4H Open corrigido: ${correctOpen}`);
        }

        // Validar Close
        const correctClose = parseFloat(currentCandle.close);
        if (!this.isValidPrice(crt.currentH4.close, correctClose)) {
            this.errors.push(`❌ 4H Close incorreto: ${crt.currentH4.close}`);
            crt.currentH4.close = correctClose;
            this.corrections.push(`🔧 4H Close corrigido: ${correctClose}`);
        }

        // Validar High
        const correctHigh = parseFloat(currentCandle.high);
        if (!this.isValidPrice(crt.currentH4.high, correctHigh)) {
            this.errors.push(`❌ 4H High incorreto: ${crt.currentH4.high}`);
            crt.currentH4.high = correctHigh;
            this.corrections.push(`🔧 4H High corrigido: ${correctHigh}`);
        }

        // Validar Low
        const correctLow = parseFloat(currentCandle.low);
        if (!this.isValidPrice(crt.currentH4.low, correctLow)) {
            this.errors.push(`❌ 4H Low incorreto: ${crt.currentH4.low}`);
            crt.currentH4.low = correctLow;
            this.corrections.push(`🔧 4H Low corrigido: ${correctLow}`);
        }

        // Validar lógica: High >= Open/Close e Low <= Open/Close
        if (crt.currentH4.high < Math.max(crt.currentH4.open, crt.currentH4.close)) {
            this.errors.push('❌ High menor que Open/Close (impossível)');
        }

        if (crt.currentH4.low > Math.min(crt.currentH4.open, crt.currentH4.close)) {
            this.errors.push('❌ Low maior que Open/Close (impossível)');
        }
    }

    /**
     * Valida manipulações
     */
    validateManipulations(crt) {
        if (!crt.manipulation) {
            return; // Sem manipulação é válido
        }

        // Validar tipo
        if (!['BULLISH', 'BEARISH', 'NONE'].includes(crt.manipulation.type)) {
            this.errors.push(`❌ Tipo de manipulação inválido: ${crt.manipulation.type}`);
            crt.manipulation.type = 'NONE';
            this.corrections.push('🔧 Tipo de manipulação resetado para NONE');
        }

        // Validar price
        if (crt.manipulation.price && !this.isValidNumber(crt.manipulation.price)) {
            this.errors.push('❌ Preço de manipulação inválido');
            delete crt.manipulation.price;
            this.corrections.push('🔧 Preço de manipulação removido');
        }
    }

    /**
     * Valida Turtle Soup
     */
    validateTurtleSoup(crt) {
        if (!crt.turtleSoup) {
            return; // Sem turtle soup é válido
        }

        // Validar tipo
        if (!['LONG', 'SHORT', 'NONE'].includes(crt.turtleSoup.type)) {
            this.errors.push(`❌ Tipo de Turtle Soup inválido: ${crt.turtleSoup.type}`);
            crt.turtleSoup.type = 'NONE';
            this.corrections.push('🔧 Tipo de Turtle Soup resetado');
        }

        // Validar price
        if (crt.turtleSoup.price && !this.isValidNumber(crt.turtleSoup.price)) {
            this.errors.push('❌ Preço de Turtle Soup inválido');
            delete crt.turtleSoup.price;
            this.corrections.push('🔧 Preço de Turtle Soup removido');
        }
    }

    /**
     * Valida zonas de entrada
     */
    validateEntryZones(crt) {
        if (!crt.entryZone || !crt.entryZone.hasEntry) {
            return; // Sem zona de entrada é válido
        }

        const zone = crt.entryZone;

        // Validar entry
        if (!this.isValidNumber(zone.entry)) {
            this.errors.push('❌ Preço de entrada inválido');
        }

        // Validar stopLoss
        if (!this.isValidNumber(zone.stopLoss)) {
            this.errors.push('❌ Stop Loss inválido');
        }

        // Validar takeProfit
        if (!this.isValidNumber(zone.takeProfit)) {
            this.errors.push('❌ Take Profit inválido');
        }

        // Validar lógica LONG
        if (zone.type === 'LONG') {
            if (zone.stopLoss >= zone.entry) {
                this.errors.push('❌ LONG: SL deve ser menor que entry');
            }
            if (zone.takeProfit <= zone.entry) {
                this.errors.push('❌ LONG: TP deve ser maior que entry');
            }
        }

        // Validar lógica SHORT
        if (zone.type === 'SHORT') {
            if (zone.stopLoss <= zone.entry) {
                this.errors.push('❌ SHORT: SL deve ser maior que entry');
            }
            if (zone.takeProfit >= zone.entry) {
                this.errors.push('❌ SHORT: TP deve ser menor que entry');
            }
        }

        // Validar Risk/Reward mínimo (1:2)
        if (zone.riskReward && zone.riskReward < 2) {
            this.errors.push(`⚠️ Risk/Reward baixo: ${zone.riskReward.toFixed(2)} (mínimo recomendado: 2)`);
        }
    }

    /**
     * Valida se um preço está correto
     */
    isValidPrice(current, expected) {
        if (typeof current !== 'number' || isNaN(current)) return false;
        if (typeof expected !== 'number' || isNaN(expected)) return false;

        const tolerance = expected * 0.0001; // 0.01%
        return Math.abs(current - expected) <= tolerance;
    }

    /**
     * Valida se é um número válido
     */
    isValidNumber(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }

    /**
     * Gera relatório de validação
     */
    getReport() {
        return {
            totalErrors: this.errors.length,
            totalCorrections: this.corrections.length,
            errors: this.errors,
            corrections: this.corrections,
            status: this.errors.length === 0 ? 'VALID' : 'CORRECTED'
        };
    }
}

module.exports = CRTValidator;
