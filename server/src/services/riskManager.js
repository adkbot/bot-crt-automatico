const TrailingManager = require('./trailing_manager');
const fs = require('fs');
const path = require('path');
const config = require('../config');

class RiskManager {
    constructor() {
        this.activeTrade = null;
        this.performance = { wins: 0, losses: 0 };
        this.config = {
            balance: 10000,
            leverage: 10,
            riskPerTrade: 1 // 1%
        };
        this.lastTradeTime = 0;
        this.lastLossTime = 0;

        // Use Config Constants
        this.MIN_TIME_BETWEEN_TRADES = config.MIN_TIME_BETWEEN_TRADES_MS;
        this.COOLDOWN_AFTER_LOSS_MS = config.COOLDOWN_AFTER_LOSS_MS;
        this.MAX_CONCURRENT_TRADES = config.MAX_CONCURRENT_TRADES;
        this.ATR_MIN_THRESHOLD = config.ATR_MIN_THRESHOLD;

        // Daily Stats & Persistence
        this.dailyStats = {
            date: new Date().toLocaleDateString('pt-BR'),
            trades: 0,
            wins: 0,
            losses: 0
        };
        this.loadState();
        this.checkDailyReset();

        // Circuit Breaker Stats
        this.consecutiveLosses = 0;
        this.initialBalance = 10000; // Should be set on init
        this.isCircuitBreakerActive = false;

        // Mock API for TrailingManager
        this.mockApi = {
            modifyOrderSL: async (orderId, newSL) => {
                if (this.activeTrade && this.activeTrade.id === orderId) {
                    this.activeTrade.sl = newSL;
                    console.log(`🔄 API: SL Modificado para ${newSL.toFixed(2)}`);
                }
            },
            closePortion: async (orderId, percent) => {
                if (this.activeTrade && this.activeTrade.id === orderId) {
                    const partialSize = this.activeTrade.size * percent;
                    const currentPrice = this.activeTrade.currentPrice;
                    const entry = this.activeTrade.entry;
                    let profit = 0;

                    if (this.activeTrade.type === 'COMPRA') {
                        profit = (currentPrice - entry) * partialSize;
                    } else {
                        profit = (entry - currentPrice) * partialSize;
                    }

                    this.activeTrade.size -= partialSize;
                    this.activeTrade.margin -= (partialSize * entry) / this.activeTrade.leverage;
                    this.config.balance += profit;
                    this.performance.wins++;
                    this.activeTrade.partialTaken = true;
                    console.log(`💰 API: Fechamento Parcial (${percent * 100}%). Lucro: ${profit.toFixed(2)}`);
                }
            },
            closeOrder: async (orderId, reason) => {
                // Handled in main loop, but logging here
            }
        };

        this.trailingManager = new TrailingManager(this.mockApi);
        this.binanceClient = null; // Store real client
    }

    setBinanceClient(client) {
        this.binanceClient = client;
        console.log('🔗 RiskManager: Binance Client Connected');
    }

    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        // Update initial balance if it looks like a fresh start
        if (newConfig.balance && this.performance.wins === 0 && this.performance.losses === 0) {
            this.initialBalance = newConfig.balance;
        }
        console.log('⚙️ Risk Manager Config Updated:', this.config);
    }

    // --- PERSISTENCE & DAILY LIMITS ---
    getStateFilePath() {
        return path.resolve(__dirname, '../../', config.STATE_FILE_PATH);
    }

    loadState() {
        try {
            const filePath = this.getStateFilePath();
            if (fs.existsSync(filePath)) {
                const raw = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(raw);
                this.dailyStats = data;
                console.log('📂 Estado carregado:', this.dailyStats);
            }
        } catch (e) {
            console.error('Erro ao carregar estado:', e);
        }
    }

    saveState() {
        try {
            const filePath = this.getStateFilePath();
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(this.dailyStats, null, 2));
        } catch (e) {
            console.error('Erro ao salvar estado:', e);
        }
    }

    checkDailyReset() {
        const today = new Date().toLocaleDateString('pt-BR');
        if (this.dailyStats.date !== today) {
            console.log(`📅 Novo dia detectado. Resetando stats (Antigo: ${this.dailyStats.date})`);
            this.dailyStats = {
                date: today,
                trades: 0,
                wins: 0,
                losses: 0
            };
            this.saveState();
        }
    }

    checkDailyLimits() {
        this.checkDailyReset();
        if (this.dailyStats.trades >= config.MAX_TRADES_PER_DAY) return 'MAX_TRADES_REACHED';
        if (this.dailyStats.wins >= config.TARGET_WINS) return 'TARGET_WINS_REACHED';
        if (this.dailyStats.losses >= config.TARGET_LOSSES) return 'TARGET_LOSSES_REACHED';
        return null;
    }

    // Helper to calc ATR locally if needed, though usually provided
    calcATR(candles, period = 14) {
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

    update(marketData, prediction, botStatus) {
        let currentPrice = marketData;
        let candles = [];
        let advanced = {};
        let symbol = 'BTCUSDT';

        if (typeof marketData === 'object') {
            currentPrice = marketData.price;
            candles = marketData.candles || [];
            advanced = marketData.advanced || {};
            symbol = marketData.symbol || 'BTCUSDT';
        }

        if (this.activeTrade) {
            return this.manageActiveTrade(currentPrice, candles, advanced, prediction);
        } else {
            return this.checkForNewEntry(currentPrice, candles, prediction, botStatus, symbol);
        }
    }

    checkForNewEntry(currentPrice, candles, prediction, botStatus, symbol) {
        const now = Date.now();

        // 0. Daily Limits Check
        const limitStatus = this.checkDailyLimits();
        if (limitStatus) {
            if (Math.random() < 0.05) console.log(`⛔ Limite Diário Atingido: ${limitStatus}`);
            return null;
        }

        // 0. Circuit Breaker Check
        if (this.isCircuitBreakerActive) {
            console.log('⛔ Circuit Breaker Ativo. Trading Pausado.');
            return null;
        }

        if (this.consecutiveLosses >= 4) {
            console.log('⛔ Circuit Breaker: 4 perdas seguidas. Pausando.');
            this.isCircuitBreakerActive = true;
            return null;
        }

        const drawdown = (this.initialBalance - this.config.balance) / this.initialBalance;
        if (drawdown >= 0.03) { // 3% drawdown
            console.log(`⛔ Circuit Breaker: Drawdown de ${(drawdown * 100).toFixed(2)}%. Pausando.`);
            this.isCircuitBreakerActive = true;
            return null;
        }

        // 1. Rate Limiting & Cooldowns
        if (now - this.lastTradeTime < this.MIN_TIME_BETWEEN_TRADES) {
            return null;
        }
        if (now - this.lastLossTime < this.COOLDOWN_AFTER_LOSS_MS) {
            return null; // Still in cooldown after loss
        }

        // 2. ATR Filter (Avoid Chop)
        const atr = this.calcATR(candles, 14);
        if (atr < this.ATR_MIN_THRESHOLD) {
            return null;
        }

        // 3. Score Validation (Strict)
        const score = prediction.metadata?.score;
        if (!Number.isFinite(score) || score < config.SCORE_THRESHOLD) {
            if (prediction.confidence >= 70 && Math.random() < 0.1) {
                console.log(`🛡️ Entrada Bloqueada: Score insuficiente (${score} < ${config.SCORE_THRESHOLD})`);
            }
            return null;
        }

        if (botStatus === 'RUNNING' && prediction.confidence >= 80) {

            // --- ENTRY PRICE LOGIC ---
            let entryPrice = currentPrice;
            let isLimitOrder = false;

            if (prediction.metadata?.type === 'LIMIT_ORDER' && prediction.limitPrice) {
                entryPrice = prediction.limitPrice;
                isLimitOrder = true;
            }

            const slDistance = Math.abs(entryPrice - prediction.stopLoss);
            if (slDistance === 0) return null;

            // 4. Sizing & Balance Fallback
            let riskAmount = this.config.balance * (this.config.riskPerTrade / 100);
            let positionSize = riskAmount / slDistance;
            let positionValue = positionSize * entryPrice;
            let marginUsed = positionValue / this.config.leverage;

            // Fallback if insufficient balance
            if (marginUsed > this.config.balance) {
                console.log('⚠️ Saldo insuficiente. Reduzindo tamanho e pausando 5s...');
                const maxMargin = this.config.balance * 0.95;
                positionValue = maxMargin * this.config.leverage;
                positionSize = positionValue / entryPrice;
                marginUsed = maxMargin;
                riskAmount = positionSize * slDistance;
                this.lastTradeTime = now + 5000;
            }

            const tpDistance = Math.abs(prediction.takeProfit - entryPrice);
            const riskReward = tpDistance / slDistance;

            this.activeTrade = {
                id: Date.now().toString(),
                type: prediction.direction,
                entry: entryPrice,
                sl: prediction.stopLoss,
                tp: prediction.takeProfit,
                startTime: now,
                highestPrice: entryPrice,
                lowestPrice: entryPrice,
                metadata: prediction.metadata || {},
                partialTaken: false,
                size: positionSize,
                margin: marginUsed,
                leverage: this.config.leverage,
                riskValue: riskAmount,
                profitValue: positionSize * tpDistance,
                rr: riskReward.toFixed(2),
                pnlValue: 0,
                pnlPercent: 0,
                currentPrice: currentPrice,
                symbol: symbol
            };

            this.trailingManager.register({
                orderId: this.activeTrade.id,
                side: this.activeTrade.type === 'COMPRA' ? 'LONG' : 'SHORT',
                entryPrice: entryPrice,
                slPrice: prediction.stopLoss,
                riskPts: slDistance,
                size: positionSize
            });

            if (config.USE_PREV_OPEN_TRAILING) {
                this.trailingManager.setInitialStop(this.activeTrade.id, candles);
            }

            this.lastTradeTime = now;
            console.log(`🎯 TRADE INICIADO: ${prediction.direction} @ ${entryPrice} | Margin: ${marginUsed.toFixed(2)} | Score: ${score}`);

            // EXECUTE REAL ORDER
            if (this.binanceClient) {
                this.executeOrder(this.activeTrade, isLimitOrder);
            }

            return { action: 'ENTRY', trade: this.activeTrade };
        } else if (botStatus !== 'RUNNING' && prediction.confidence >= 80) {
            if (Math.random() < 0.1) {
                console.log(`⏸️ Sinal Ignorado (Bot ${botStatus}): ${prediction.direction} Score: ${score}`);
            }
        }
        return null;
    }

    async executeOrder(trade, isLimit) {
        try {
            const side = trade.type === 'COMPRA' ? 'BUY' : 'SELL';
            // Ensure quantity precision (BTC usually 3 decimals, but safe to check info. For now assuming 3)
            // Better to floor to 3 decimals
            const quantity = Math.floor(trade.size * 1000) / 1000;

            if (quantity <= 0) {
                console.error('❌ Order Quantity too small:', trade.size);
                return;
            }

            const params = {
                symbol: trade.symbol,
                side: side,
                type: isLimit ? 'LIMIT' : 'MARKET',
                quantity: quantity.toString(),
                reduceOnly: false
            };

            if (isLimit) {
                params.price = trade.entry.toFixed(2);
                params.timeInForce = 'GTC';
            }

            console.log(`🚀 Executing ${isLimit ? 'LIMIT' : 'MARKET'} Order: ${side} ${quantity} @ ${trade.entry}`);
            const order = await this.binanceClient.futuresOrder(params);
            console.log('✅ Order Placed:', order.orderId);

            // Place SL (Stop Market)
            const slSide = side === 'BUY' ? 'SELL' : 'BUY';
            const slParams = {
                symbol: trade.symbol,
                side: slSide,
                type: 'STOP_MARKET',
                stopPrice: trade.sl.toFixed(2),
                closePosition: true, // Or reduceOnly: true
                timeInForce: 'GTC'
            };
            const slOrder = await this.binanceClient.futuresOrder(slParams);
            console.log('🛡️ Stop Loss Placed:', slOrder.orderId);

        } catch (error) {
            console.error('❌ Execution Error:', error.message);
            // If error, maybe cancel activeTrade?
        }
    }

    // --- SMART EXIT LOGIC ---
    checkSmartExit(trade, currentPrice, candles) {
        const now = Date.now();

        // 1. Time Protection
        if (now - trade.startTime > config.MAX_HOLD_TIME_MS) {
            return { action: 'EXIT', reason: 'TIMEOUT', profit: 0 }; // Profit calc handled by caller
        }

        // 2. Drawdown Protection
        const isLong = trade.type === 'COMPRA';
        const pnl = isLong ? (currentPrice - trade.entry) * trade.size : (trade.entry - currentPrice) * trade.size;
        const drawdownPct = pnl / this.config.balance;

        if (drawdownPct < -config.MAX_DRAWDOWN_PCT) {
            return { action: 'EXIT', reason: 'MAX_DRAWDOWN', profit: pnl };
        }

        // 3. Reversal Confirmation (The Core Logic)
        // Need at least N candles
        const N = config.REVERSAL_REQUIRED_CONSECUTIVE;
        if (candles.length < N + 1) return null;

        const recent = candles.slice(-N); // Last N candles
        const currentCandle = candles[candles.length - 1];

        // Check direction
        const isCounter = isLong ? recent.every(c => c.close < c.open) : recent.every(c => c.close > c.open);
        if (!isCounter) return null;

        // Check Volume
        // Simple SMA of volume for last 20
        const volumes = candles.slice(-20).map(c => parseFloat(c.volume));
        const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const recentVolAvg = recent.reduce((a, c) => a + parseFloat(c.volume), 0) / N;
        const volRel = recentVolAvg / avgVol;

        if (volRel < config.REVERSAL_VOLREL_THRESHOLD) return null;

        // Check Structure (Close beyond recent extreme)
        // For Long: Close < Lowest Low of last M candles
        // For Short: Close > Highest High of last M candles
        const lookback = config.REVERSAL_BOS_LOOKBACK;
        const lookbackCandles = candles.slice(-(lookback + N), -N); // Candles BEFORE the reversal sequence

        let structureBroken = false;
        if (isLong) {
            const lowestLow = Math.min(...lookbackCandles.map(c => parseFloat(c.low)));
            if (currentCandle.close < lowestLow) structureBroken = true;
        } else {
            const highestHigh = Math.max(...lookbackCandles.map(c => parseFloat(c.high)));
            if (currentCandle.close > highestHigh) structureBroken = true;
        }

        if (structureBroken) {
            return { action: 'EXIT', reason: 'REVERSAL_CONFIRMED', profit: pnl };
        }

        return null;
    }

    manageActiveTrade(currentPrice, candles, advanced, prediction) {
        const trade = this.activeTrade;
        const entry = trade.entry;
        trade.currentPrice = currentPrice;

        if (currentPrice > trade.highestPrice) trade.highestPrice = currentPrice;
        if (currentPrice < trade.lowestPrice) trade.lowestPrice = currentPrice;

        let currentProfit = 0;
        if (trade.type === 'COMPRA') {
            currentProfit = (currentPrice - entry) * trade.size;
        } else {
            currentProfit = (entry - currentPrice) * trade.size;
        }

        trade.pnlValue = currentProfit;
        trade.pnlPercent = (currentProfit / trade.margin) * 100;

        // --- SMART EXIT CHECK ---
        const smartExit = this.checkSmartExit(trade, currentPrice, candles);
        if (smartExit) {
            console.log(`🚨 SMART EXIT: ${smartExit.reason} | PnL: ${smartExit.profit.toFixed(2)}`);

            // Update stats
            if (smartExit.profit > 0) {
                this.performance.wins++;
                this.dailyStats.wins++;
                this.consecutiveLosses = 0;
            } else {
                this.performance.losses++;
                this.dailyStats.losses++;
                this.consecutiveLosses++;
                this.lastLossTime = Date.now();
            }
            this.dailyStats.trades++;
            this.config.balance += smartExit.profit;
            this.saveState();

            this.activeTrade = null;
            return smartExit;
        }

        // Delegate to Trailing Manager
        this.trailingManager.evaluate(trade.id, currentPrice, candles);

        // 3. Robust Reversal Logic (2 Candle Confirmation)
        const isReversalSignal = (trade.type === 'COMPRA' && prediction.direction === 'VENDA') ||
            (trade.type === 'VENDA' && prediction.direction === 'COMPRA');

        if (isReversalSignal && prediction.confidence >= 80) {
            const volRel = advanced.volRel || 0;

            // Check last 2 candles for contra direction
            let contraCandlesCount = 0;
            if (candles.length >= 2) {
                const last = candles[candles.length - 1];
                const prev = candles[candles.length - 2];

                if (trade.type === 'COMPRA') {
                    if (last.close < last.open) contraCandlesCount++;
                    if (prev.close < prev.open) contraCandlesCount++;
                } else {
                    if (last.close > last.open) contraCandlesCount++;
                    if (prev.close > prev.open) contraCandlesCount++;
                }
            }

            if (volRel > 1.2 && contraCandlesCount >= 2) {
                console.log('⚠️ Saída Antecipada (Reversão Confirmada: 2 Candles + Vol)');
                this.activeTrade = null;
                this.config.balance += currentProfit;
                // Reversal is usually a small loss or small win, treat as neutral for consecutive losses unless heavy loss
                if (currentProfit < 0) {
                    this.consecutiveLosses++;
                    this.lastLossTime = Date.now(); // Set cooldown
                }
                else this.consecutiveLosses = 0;

                return { action: 'EXIT', reason: 'REVERSAL_CONFIRMED', profit: currentProfit };
            }
        }

        // 4. Standard Exit Conditions
        let isWin = false;
        let isLoss = false;

        if (trade.type === 'COMPRA') {
            if (currentPrice >= trade.tp) isWin = true;
            else if (currentPrice <= trade.sl) isLoss = true;
        } else {
            if (currentPrice <= trade.tp) isWin = true;
            else if (currentPrice >= trade.sl) isLoss = true;
        }

        if (isWin) {
            this.performance.wins++;
            this.consecutiveLosses = 0; // Reset
            this.config.balance += currentProfit;

            // Update Daily Stats
            this.dailyStats.trades++;
            this.dailyStats.wins++;
            this.saveState();

            console.log(`✅ WIN - Lucro Final: ${currentProfit.toFixed(2)}`);
            this.activeTrade = null;
            return { action: 'EXIT', reason: 'TP', profit: currentProfit };
        }

        if (isLoss) {
            this.performance.losses++;
            this.consecutiveLosses++;
            this.lastLossTime = Date.now(); // Set cooldown
            this.config.balance += currentProfit;

            // Update Daily Stats
            this.dailyStats.trades++;
            this.dailyStats.losses++;
            this.saveState();

            console.log(`❌ LOSS - Prejuízo: ${currentProfit.toFixed(2)}`);
            this.activeTrade = null;
            return { action: 'EXIT', reason: 'SL', profit: currentProfit };
        }

        return { action: 'UPDATE', trade: this.activeTrade };
    }
    forceExit() {
        if (!this.activeTrade) return null;

        const trade = this.activeTrade;
        const currentPrice = trade.currentPrice;
        let profit = 0;

        if (trade.type === 'COMPRA') {
            profit = (currentPrice - trade.entry) * trade.size;
        } else {
            profit = (trade.entry - currentPrice) * trade.size;
        }

        // Update Stats
        if (profit > 0) {
            this.performance.wins++;
            this.dailyStats.wins++;
            this.consecutiveLosses = 0;
        } else {
            this.performance.losses++;
            this.dailyStats.losses++;
            this.consecutiveLosses++;
            this.lastLossTime = Date.now();
        }
        this.dailyStats.trades++;
        this.config.balance += profit;
        this.saveState();

        console.log(`🚨 MANUAL EXIT - PnL: ${profit.toFixed(2)}`);
        this.activeTrade = null;

        return { action: 'EXIT', reason: 'MANUAL', profit };
    }
}

module.exports = new RiskManager();
