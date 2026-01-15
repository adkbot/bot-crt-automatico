// ## trailing_manager.js
const configGlobal = require('../config');
// Simple class to manage trailing + partial take + breakeven buffer
// Integrate with Execution Layer (API wrappers): api.modifyOrderSL(orderId, newSL), api.closePortion(orderId, percent)

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

// Helper functions for Reversal Detection
function computeVolRel(currentCandle, allCandles) {
    const len = allCandles.length;
    if (len < 21) return 1;
    // SMA 20 of volume (excluding current if possible, or just last 20)
    // We use last 20 candles for average
    let sum = 0;
    const start = Math.max(0, len - 21);
    const end = len - 1;
    let count = 0;
    for (let i = start; i < end; i++) {
        sum += parseFloat(allCandles[i].volume);
        count++;
    }
    const avg = count > 0 ? sum / count : 1;
    return avg > 0 ? parseFloat(currentCandle.volume) / avg : 1;
}

function detectBOS_CHoCH(candles, direction) {
    // Lookback 10 candles
    const len = candles.length;
    if (len < 12) return false;
    const current = candles[len - 1];

    // For LONG trade, reversal is break of LOW (Bearish CHoCH)
    if (direction === 'LONG') {
        let minLow = Infinity;
        // Check last 10 candles (excluding current)
        for (let i = len - 11; i < len - 1; i++) {
            if (parseFloat(candles[i].low) < minLow) minLow = parseFloat(candles[i].low);
        }
        return parseFloat(current.close) < minLow;
    }
    // For SHORT trade, reversal is break of HIGH (Bullish CHoCH)
    else {
        let maxHigh = -Infinity;
        for (let i = len - 11; i < len - 1; i++) {
            if (parseFloat(candles[i].high) > maxHigh) maxHigh = parseFloat(candles[i].high);
        }
        return parseFloat(current.close) > maxHigh;
    }
}



class TrailingManager {
    constructor(api, config = {}) {
        this.api = api;
        this.orders = new Map(); // orderId -> meta
        this.config = Object.assign({
            atrMultiplier: configGlobal.ATR_TRAIL_MULTIPLIER || 2.0,
            atrPeriod: configGlobal.ATR_PERIOD || 14,
            partialTakePct: configGlobal.PARTIAL_TAKE_PCT || 0.5,      // Close 50% size (Fixed)
            partialTakeTriggerR: configGlobal.PARTIAL_TRIGGER_R,
            breakevenTriggerR: configGlobal.BREAKEVEN_TRIGGER_R,
            breakevenBufferPct: 0.0005, // 0.05% buffer
            profitProtectionTriggerR: 0.8, // New: Trigger at 0.8R
            profitProtectionPct: 0.5,      // New: Protect 50% of profit
            minTrailDistancePts: 1,
            usePrevOpenTrailing: configGlobal.USE_PREV_OPEN_TRAILING || false,
            trailingStrategy: configGlobal.TRAILING_STRATEGY || 'ATR',
            slSlippageBuffer: configGlobal.SL_SLIPPAGE_BUFFER_PTS || 0,
            VOLREL_THRESHOLD_FOR_REVERSAL: configGlobal.VOLREL_THRESHOLD_FOR_REVERSAL || 2.5
        }, config);
    }

    register(orderMeta) {
        // orderMeta: { orderId, side, entryPrice, slPrice, riskPts, size }
        this.orders.set(orderMeta.orderId, Object.assign({
            active: true,
            partialTaken: false,
            breakevenTaken: false,
            currentSL: orderMeta.slPrice,
            meta: {}
        }, orderMeta));
    }

    // Called explicitly when trade is confirmed to set initial SL
    setInitialStop(orderId, candles) {
        const trade = this.orders.get(orderId);
        if (!trade || !trade.active) return;

        // prevCandle = candles[candles.length - 2] (assuming last is current/forming or just closed)
        // If candles includes the just-closed candle as last element, then prev is len-2.
        // If candles includes forming candle, then prev is len-2.
        // We assume standard: candles list ends with latest known candle.
        const prev = candles[candles.length - 2];
        if (prev) {
            const newSL = parseFloat(prev.open);
            trade.currentSL = newSL;
            console.log(`STOP_SET initial (prevOpen) -> ${newSL}`);
            if (this.api && this.api.modifyOrderSL) this.api.modifyOrderSL(orderId, newSL);
        }
    }

    // Called on every tick/candle update
    async evaluate(orderId, marketPrice, candles) {
        const meta = this.orders.get(orderId);
        if (!meta || !meta.active) return;

        // 1. Check Price Cross Stop (Immediate Exit)
        this.checkPriceCrossStopAndExit(meta, marketPrice);
        if (!meta.active) return; // Exit triggered

        // 2. Update Stop based on Strategy
        if (this.config.trailingStrategy === 'ATR') {
            this.updateStopATR(meta, candles, marketPrice);
        } else if (this.config.usePrevOpenTrailing && candles && candles.length >= 2) {
            this.evaluateTrailingLogic(meta, candles);
        }

        // 3. Standard Partial/Breakeven Logic
        const currentProfitPts = Math.abs(marketPrice - meta.entryPrice);
        const rMultiple = currentProfitPts / meta.riskPts;

        if (meta.side === 'LONG') {
            // Partial Take Profit (0.6R)
            if (!meta.partialTaken && rMultiple >= this.config.partialTakeTriggerR) {
                if (this.api && this.api.closePortion) await this.api.closePortion(orderId, this.config.partialTakePct);
                meta.partialTaken = true;
                console.log(`🛡️ Partial Taken (Long) @ ${marketPrice.toFixed(2)}`);

                // Move to BE if current SL is worse than BE
                const bePrice = meta.entryPrice * (1 + this.config.breakevenBufferPct);
                if (bePrice > meta.currentSL) {
                    meta.currentSL = bePrice;
                    meta.breakevenTaken = true;
                    if (this.api && this.api.modifyOrderSL) await this.api.modifyOrderSL(orderId, bePrice);
                }
            }
        } else {
            // SHORT Partial
            if (!meta.partialTaken && rMultiple >= this.config.partialTakeTriggerR) {
                if (this.api && this.api.closePortion) await this.api.closePortion(orderId, this.config.partialTakePct);
                meta.partialTaken = true;
                console.log(`🛡️ Partial Taken (Short) @ ${marketPrice.toFixed(2)}`);

                const bePrice = meta.entryPrice * (1 - this.config.breakevenBufferPct);
                if (bePrice < meta.currentSL) {
                    meta.currentSL = bePrice;
                    meta.breakevenTaken = true;
                    if (this.api && this.api.modifyOrderSL) await this.api.modifyOrderSL(orderId, bePrice);
                }
            }
        }

        // 4. Profit Protection (0.8R -> 50% Guard)
        if (rMultiple >= this.config.profitProtectionTriggerR) {
            let protectedSL;
            if (meta.side === 'LONG') {
                const profit = marketPrice - meta.entryPrice;
                protectedSL = meta.entryPrice + (profit * this.config.profitProtectionPct);
                if (protectedSL > meta.currentSL) {
                    meta.currentSL = protectedSL;
                    console.log(`🛡️ Profit Protection (Long) -> SL Moved to ${protectedSL.toFixed(2)} (50% of ${profit.toFixed(2)})`);
                    if (this.api && this.api.modifyOrderSL) await this.api.modifyOrderSL(orderId, protectedSL);
                }
            } else {
                const profit = meta.entryPrice - marketPrice;
                protectedSL = meta.entryPrice - (profit * this.config.profitProtectionPct);
                if (protectedSL < meta.currentSL) {
                    meta.currentSL = protectedSL;
                    console.log(`🛡️ Profit Protection (Short) -> SL Moved to ${protectedSL.toFixed(2)} (50% of ${profit.toFixed(2)})`);
                    if (this.api && this.api.modifyOrderSL) await this.api.modifyOrderSL(orderId, protectedSL);
                }
            }
        }
    }

    evaluateTrailingLogic(trade, candles) {
        // Rule: never move SL unless reversal confirmed
        if (this.isReversalConfirmed(trade, candles)) {
            const prevCandle = candles[candles.length - 2];
            if (!prevCandle) return;
            const newSL = parseFloat(prevCandle.open);

            if (trade.side === 'LONG') {
                // Only move UP
                if (newSL > trade.currentSL) {
                    trade.currentSL = newSL;
                    console.log(`STOP_MOVED (reversal) Trade ${trade.orderId} -> ${newSL}`);
                    if (this.api && this.api.modifyOrderSL) this.api.modifyOrderSL(trade.orderId, newSL);
                }
            } else {
                // Only move DOWN
                if (newSL < trade.currentSL) {
                    trade.currentSL = newSL;
                    console.log(`STOP_MOVED (reversal) Trade ${trade.orderId} -> ${newSL}`);
                    if (this.api && this.api.modifyOrderSL) this.api.modifyOrderSL(trade.orderId, newSL);
                }
            }
        }
    }

    updateStopATR(trade, candles, currentPrice) {
        const atr = calcATR(candles, this.config.atrPeriod);
        if (!atr || atr === 0) return;

        const distance = atr * this.config.atrMultiplier;
        let newSL;

        if (trade.side === 'LONG') {
            // Chandelier Exit Long: Highest High - ATR*Mult OR Current Price - ATR*Mult
            // User requested: "preço atual menos (ATR * Multiplicador)"
            newSL = currentPrice - distance;

            // Only move UP
            if (newSL > trade.currentSL) {
                trade.currentSL = newSL;
                console.log(`STOP_MOVED (ATR) Trade ${trade.orderId} -> ${newSL.toFixed(2)} (Price: ${currentPrice}, ATR: ${atr.toFixed(2)})`);
                if (this.api && this.api.modifyOrderSL) this.api.modifyOrderSL(trade.orderId, newSL);
            }
        } else {
            // Short
            newSL = currentPrice + distance;

            // Only move DOWN
            if (newSL < trade.currentSL) {
                trade.currentSL = newSL;
                console.log(`STOP_MOVED (ATR) Trade ${trade.orderId} -> ${newSL.toFixed(2)} (Price: ${currentPrice}, ATR: ${atr.toFixed(2)})`);
                if (this.api && this.api.modifyOrderSL) this.api.modifyOrderSL(trade.orderId, newSL);
            }
        }
    }

    isReversalConfirmed(trade, candles) {
        // 1) check BOS/CHoCH
        if (detectBOS_CHoCH(candles, trade.side)) return true;

        // 2) check 2 consecutive contra candles with volume
        const len = candles.length;
        const c1 = candles[len - 1];
        const c2 = candles[len - 2];
        if (!c1 || !c2) return false;

        const contraCandle = (dir, c) => dir === 'LONG' ? parseFloat(c.close) < parseFloat(c.open) : parseFloat(c.close) > parseFloat(c.open);
        const volRel = computeVolRel(c1, candles);

        if (contraCandle(trade.side, c1) && contraCandle(trade.side, c2) && volRel > this.config.VOLREL_THRESHOLD_FOR_REVERSAL) {
            return true;
        }

        return false;
    }

    checkPriceCrossStopAndExit(trade, currentPrice) {
        const buffer = this.config.slSlippageBuffer;

        if (trade.side === 'LONG') {
            if (currentPrice <= (trade.currentSL - buffer)) {
                console.log(`SL_CROSSED - EXITING LONG | Price: ${currentPrice} | Stop: ${trade.currentSL}`);
                this.triggerExit(trade, 'SL_CROSSED');
            }
        } else { // SHORT
            if (currentPrice >= (trade.currentSL + buffer)) {
                console.log(`SL_CROSSED - EXITING SHORT | Price: ${currentPrice} | Stop: ${trade.currentSL}`);
                this.triggerExit(trade, 'SL_CROSSED');
            }
        }
    }

    triggerExit(trade, reason) {
        trade.active = false;
        if (this.api && this.api.closeTrade) {
            this.api.closeTrade(trade.orderId, reason);
        }
    }

    unregister(orderId) {
        this.orders.delete(orderId);
    }
}

module.exports = TrailingManager;
