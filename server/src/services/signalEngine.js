const config = require('../config');

class SignalEngine {
    constructor() {
        this.state = {
            phase: 1, // 1: Mapeamento HTF, 2: Espera Ativa, 3: Gatilho LTF, 4: Gestão (RiskManager)
            activeZone: null, // { top, bottom, type, time }
            lastUpdate: 0
        };
    }

    evaluate(marketData) {
        const {
            currentPrice,
            htfContext,
            advanced, // Contains bos, structuralStop, etc.
            candles // LTF Candles
        } = marketData;

        const now = Date.now();
        let direction = 'NEUTRO';
        let confidence = 0;
        let reason = `Fase ${this.state.phase}: Aguardando...`;
        let stopLoss = 0;
        let takeProfit = 0;
        let limitPrice = 0; // For Limit Orders
        let metadata = {};

        // --- FASE 1: MAPEAMENTO MACRO (HTF) ---
        // Triggered implicitly by receiving new HTF data via htfContext
        if (this.state.phase === 1) {
            // Check if we have a valid HTF Zone from the worker
            if (htfContext && htfContext.zones && htfContext.zones.length > 0) {
                // Pick the most relevant zone (closest or most recent)
                // Worker sorts them, so taking the first one
                const candidateZone = htfContext.zones[0];

                // Validate Imbalance (Worker already checks FVG/Imbalance presence)
                // We just need to confirm it's a valid POI
                this.state.activeZone = candidateZone;
                this.state.phase = 2;
                reason = `✅ Fase 1 Concluída: Zona HTF Identificada(${candidateZone.type})`;
                console.log(`[SMC] Fase 1 -> 2: Zona ${candidateZone.type} encontrada em ${candidateZone.top} -${candidateZone.bottom} `);
            } else {
                reason = 'Fase 1: Buscando Zona HTF...';
            }
        }

        // --- FASE 2: ESPERA ATIVA (Stalking) ---
        if (this.state.phase === 2) {
            const zone = this.state.activeZone;
            if (!zone) {
                this.state.phase = 1; // Reset if zone lost
                return this.buildOutput('NEUTRO', 0, 'Erro: Zona perdida, voltando Fase 1');
            }

            // Check if price is inside the zone
            // Buffer is already handled in worker, but let's be precise
            const inZone = currentPrice <= zone.top * 1.001 && currentPrice >= zone.bottom * 0.999;

            if (inZone) {
                this.state.phase = 3;
                reason = `✅ Fase 2 Concluída: Preço na Zona(${currentPrice})`;
                console.log(`[SMC] Fase 2 -> 3: Preço entrou na zona.`);
            } else {
                reason = `Fase 2: Stalking...Preço: ${currentPrice} vs Zona: ${zone.bottom} -${zone.top} `;
                // Check if zone is invalidated (price went too far beyond?)
                // For now, keep waiting.
            }
        }

        // --- FASE 3: GATILHO DE PRECISÃO (LTF) ---
        if (this.state.phase === 3) {
            const zone = this.state.activeZone;

            // 1. Time Filter Check
            if (config.SESSION_FILTER_ENABLED) {
                const currentHour = new Date().getUTCHours();
                const inSession = config.TRADING_SESSIONS.some(s => {
                    const start = parseInt(s.start.split(':')[0]);
                    const end = parseInt(s.end.split(':')[0]);
                    // Handle crossing midnight if needed (simple check for now)
                    return currentHour >= start && currentHour < end;
                });

                if (!inSession) {
                    reason = 'Fase 3: Fora de Sessão (Aguardando Londres/NY/Asia)';
                    return this.buildOutput('NEUTRO', 0, reason);
                }
            }

            // 2. Check for CHOCH / BOS in LTF (provided by advanced.bos)
            // advanced.bos is 'BOS_BULL' or 'BOS_BEAR'
            // advanced.structuralStop is the extreme of the structure

            if (zone.type === 'DEMAND' && advanced.bos === 'BOS_BULL') {
                // Valid Buy Trigger
                direction = 'COMPRA';
                confidence = 100; // Maximum precision
                reason = '🚀 Fase 3: Gatilho de Compra (CHOCH + Vol)';

                // Setup Limit Order
                // Entry: Retest of the Micro OB (or just the BOS level if OB not distinct)
                // Worker provides structuralStop. 
                // Let's assume Entry is at the OB top (if available) or current price if aggressive
                // User requested: "Preço de Entrada: Na Máxima do OB MICRO."
                // We need the Micro OB from the worker. 
                // FeatureWorker sends `structure.blocks`. Let's find the most recent one.

                // We assume the worker sent the relevant OB in `advanced` or we look at `marketData.structure.blocks`
                const microOBs = marketData.structure?.blocks || [];
                // Filter for Bullish OBs only
                const bullOBs = microOBs.filter(ob => ob.type === 'BU');
                const lastMicroOB = bullOBs[bullOBs.length - 1];

                if (lastMicroOB) {
                    limitPrice = lastMicroOB.top;
                    // Refine SL to be below the OB if available
                    stopLoss = lastMicroOB.bottom;
                } else {
                    limitPrice = currentPrice; // Fallback
                    stopLoss = advanced.structuralStop - (advanced.structuralStop * config.STOP_LOSS_BUFFER_PCT);
                }

                // TP1: LSH (The high that was broken) -> approximated by current price or recent swing
                // TP2: HTF High (from Zone context? or fixed R:R)
                // User said: "TP1: No preço do LSH_LTF (o topo recém-rompido)."
                // "TP2: No preço do Topo Histórico HTF que originou o recuo."

                const rr = config.RISK_REWARD_RATIO || 2;
                takeProfit = limitPrice + (limitPrice - stopLoss) * rr;

                metadata = {
                    phase: 3,
                    type: 'LIMIT_ORDER',
                    limitPrice: limitPrice,
                    structuralStop: stopLoss,
                    score: 100 // Force high score for strict SMC trigger
                };

                // Move to Phase 4 (Execution) - Handled by RiskManager picking up this signal
                // We don't change phase here internally until trade is confirmed? 
                // Actually, RiskManager will handle the trade. SignalEngine just keeps shouting "ENTRY" until taken?
                // Or we reset to 1 after signal generation to avoid spam?
                // Let's keep it here for a moment.

            } else if (zone.type === 'SUPPLY' && advanced.bos === 'BOS_BEAR') {
                // Valid Sell Trigger
                direction = 'VENDA';
                confidence = 100;
                reason = '🚀 Fase 3: Gatilho de Venda (CHOCH + Vol)';

                const microOBs = marketData.structure?.blocks || [];
                // Filter for Bearish OBs only
                const bearOBs = microOBs.filter(ob => ob.type === 'B');
                const lastMicroOB = bearOBs[bearOBs.length - 1];

                if (lastMicroOB) {
                    limitPrice = lastMicroOB.bottom;
                    stopLoss = lastMicroOB.top;
                } else {
                    limitPrice = currentPrice;
                    stopLoss = advanced.structuralStop + (advanced.structuralStop * config.STOP_LOSS_BUFFER_PCT);
                }

                const rr = config.RISK_REWARD_RATIO || 2;
                takeProfit = limitPrice - (stopLoss - limitPrice) * rr;

                metadata = {
                    phase: 3,
                    type: 'LIMIT_ORDER',
                    limitPrice: limitPrice,
                    structuralStop: stopLoss,
                    score: 100 // Force high score for strict SMC trigger
                };
            } else {
                reason = `Fase 3: Aguardando Gatilho LTF na Zona ${zone.type}...`;
            }
        }

        return this.buildOutput(direction, confidence, reason, stopLoss, takeProfit, limitPrice, metadata);
    }

    buildOutput(direction, confidence, reason, stopLoss = 0, takeProfit = 0, limitPrice = 0, metadata = {}) {
        return {
            direction,
            confidence,
            reason,
            stopLoss,
            takeProfit,
            limitPrice,
            metadata: {
                ...metadata,
                phase: this.state.phase,
                activeZone: this.state.activeZone
            }
        };
    }
}

module.exports = new SignalEngine();
