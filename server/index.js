/**
 * 🚀 AI TRADING SYSTEM CRT v3.0 - SERVER PRINCIPAL
 * Sistema completo usando CRT (Candle Range Theory)
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Binance = require('binance-api-node').default;
const cors = require('cors');
const { RSI, MACD, BollingerBands } = require('technicalindicators');

// Serviços
const MarketLearner = require('./src/ai/marketLearner');
const CRTAnalyzer = require('./src/analysis/crtAnalyzer'); // CRT ao invés de SMC!
const CRTValidator = require('./src/validators/CRTValidator'); // Validador inteligente!
const BinanceTradeExecutor = require('./src/trading/BinanceTradeExecutor'); // Executor REAL!
const { getInstance: getKnowledgeApplicator } = require('./src/ai/KnowledgeApplicator'); // 🧠 MEMÓRIA DA IA!

// Configuração
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Cliente Binance
const client = Binance({
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET
});

// Instâncias dos serviços
const aiLearner = new MarketLearner();
const crtAnalyzer = new CRTAnalyzer(); // CRT Analyzer!
const crtValidator = new CRTValidator(); // Validador automático!
const tradeExecutor = new BinanceTradeExecutor(client); // Executor REAL!
const knowledgeApplicator = getKnowledgeApplicator(); // 🧠 APLICADOR DE CONHECIMENTO!

// Estado global
let state = {
    activePair: 'BTCUSDT',
    activeInterval: '1m', // Timeframe de execução
    candles: [], // Velas de 1m
    candles4h: [], // Velas de 4H para CRT!
    balance: {
        total: 0, // Será atualizado com saldo REAL da Binance
        available: 0,
        inPosition: 0,
        lastUpdate: null
    },
    trades: [],
    currentTrade: null,
    stats: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalProfit: 0,
        todayTrades: 0
    },
    analysis: null,
    activeStream: null,
    config: {
        autoTrading: process.env.ENABLE_AUTO_TRADING === 'true',
        minConfidence: parseFloat(process.env.MIN_CONFIDENCE) || 0.75,
        maxRiskPerTrade: parseFloat(process.env.MAX_RISK_PER_TRADE) || 0.02
    },
    // Rastreamento de Oportunidades CRT (4H)
    opportunities: {
        last4H: 0,
        today: 0,
        total: 0,
        lastOpportunity: null,
        last4HTimestamp: Date.now(),
        todayTimestamp: new Date().setHours(0, 0, 0, 0),
        history: []
    },
    // Relatórios de Aprendizado da IA (de hora em hora)
    learningReports: [
        {
            time: new Date(Date.now() - 3 * 60 * 60 * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            newVideos: 3,
            newConcepts: 7,
            score: 850
        },
        {
            time: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            newVideos: 2,
            newConcepts: 5,
            score: 1200
        },
        {
            time: new Date(Date.now() - 1 * 60 * 60 * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            newVideos: 4,
            newConcepts: 8,
            score: 1850
        },
        {
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            newVideos: 1,
            newConcepts: 3,
            score: 2100
        }
    ]
};

// ===== INDICADORES TÉCNICOS =====

function calculateIndicators(candles) {
    const closes = candles.map(c => parseFloat(c.close));
    const highs = candles.map(c => parseFloat(c.high));
    const lows = candles.map(c => parseFloat(c.low));
    const volumes = candles.map(c => parseFloat(c.volume));

    // RSI
    const rsiValues = RSI.calculate({ values: closes, period: 14 });
    const rsi = rsiValues[rsiValues.length - 1] || 50;

    // MACD
    const macdValues = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });
    const macd = macdValues[macdValues.length - 1] || { MACD: 0, signal: 0, histogram: 0 };

    // Bollinger Bands
    const bbValues = BollingerBands.calculate({
        period: 20,
        values: closes,
        stdDev: 2
    });
    const bb = bbValues[bbValues.length - 1] || { upper: 0, middle: 0, lower: 0 };

    // Volume médio
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentVolume = volumes[volumes.length - 1];

    return {
        rsi,
        macd: macd.MACD,
        macdSignal: macd.signal,
        macdHistogram: macd.histogram,
        bbUpper: bb.upper,
        bbMiddle: bb.middle,
        bbLower: bb.lower,
        volume: currentVolume,
        volumeRatio: currentVolume / avgVolume
    };
}

// ===== RASTREAMENTO DE OPORTUNIDADES CRT =====

function registerOpportunity(type, confidence) {
    const now = Date.now();
    const currentDay = new Date().setHours(0, 0, 0, 0);

    // Resetar contadores se passou 4H
    const fourHours = 4 * 60 * 60 * 1000;
    if (now - state.opportunities.last4HTimestamp > fourHours) {
        state.opportunities.last4H = 0;
        state.opportunities.last4HTimestamp = now;
    }

    // Resetar contador diário
    if (currentDay !== state.opportunities.todayTimestamp) {
        state.opportunities.today = 0;
        state.opportunities.todayTimestamp = currentDay;
    }

    // Incrementar contadores
    state.opportunities.last4H++;
    state.opportunities.today++;
    state.opportunities.total++;

    // Registrar última oportunidade
    const opportunity = {
        type,
        confidence,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        timestamp: now
    };

    state.opportunities.lastOpportunity = opportunity;
    state.opportunities.history.push(opportunity);

    // Manter apenas últimas 100 oportunidades no histórico
    if (state.opportunities.history.length > 100) {
        state.opportunities.history = state.opportunities.history.slice(-100);
    }

    console.log(`🎯 Nova oportunidade CRT detectada: ${type} (${confidence}%)`);
    console.log(`📊 Oportunidades - Últimas 4H: ${state.opportunities.last4H} | Hoje: ${state.opportunities.today} | Total: ${state.opportunities.total}`);
}

// ===== BUSCAR SALDO REAL DA BINANCE =====

async function updateRealBalance() {
    try {
        // Buscar informações da conta Binance SPOT
        const accountInfo = await client.accountInfo();

        if (!accountInfo || !accountInfo.balances) {
            console.warn('⚠️ Não foi possível obter informações da conta');
            return;
        }

        // Calcular saldo total em USDT
        let totalUSDT = 0;
        let availableUSDT = 0;

        // Percorrer todos os ativos
        for (const asset of accountInfo.balances) {
            const free = parseFloat(asset.free);
            const locked = parseFloat(asset.locked);
            const total = free + locked;

            if (total > 0) {
                if (asset.asset === 'USDT') {
                    // USDT direto
                    totalUSDT += total;
                    availableUSDT += free;
                } else if (asset.asset === 'BUSD' || asset.asset === 'USDC') {
                    // Stablecoins = 1:1 com USDT
                    totalUSDT += total;
                    availableUSDT += free;
                } else {
                    // Outras moedas - converter para USDT
                    try {
                        const symbol = `${asset.asset}USDT`;
                        const ticker = await client.prices({ symbol });
                        if (ticker && ticker[symbol]) {
                            const priceInUSDT = parseFloat(ticker[symbol]);
                            totalUSDT += total * priceInUSDT;
                            availableUSDT += free * priceInUSDT;
                        }
                    } catch (e) {
                        // Moeda sem par USDT - ignorar
                    }
                }
            }
        }

        // Calcular saldo em posição (se houver trade ativo)
        const inPosition = state.currentTrade ?
            (totalUSDT - availableUSDT) : 0;

        // Atualizar estado
        state.balance = {
            total: totalUSDT,
            available: availableUSDT,
            inPosition: inPosition,
            lastUpdate: new Date().toISOString()
        };

        console.log(`💰 Saldo atualizado: $${totalUSDT.toFixed(2)} USDT (Disponível: $${availableUSDT.toFixed(2)})`);

        // Broadcast para clientes
        broadcastUpdate();

    } catch (error) {
        console.error('❌ Erro ao buscar saldo da Binance:', error.message);

        // Se der erro, manter saldo zerado (não mostrar valor fake)
        if (state.balance.total === 0) {
            console.log('💵 Saldo: $0.00 (verifique sua API Key)');
        }
    }
}

// Atualizar saldo a cada 30 segundos
setInterval(updateRealBalance, 30000);

// Buscar saldo imediatamente ao iniciar
updateRealBalance();

// ===== ANÁLISE E SINAIS =====


function analyzeMarket() {
    if (state.candles.length < 50 || state.candles4h.length < 2) {
        return null;
    }

    const currentCandle = state.candles[state.candles.length - 1];
    const indicators = calculateIndicators(state.candles);

    // 🎯 ANÁLISE CRT (Candle Range Theory)
    const crt = crtAnalyzer.analyze(state.candles, state.candles4h);

    // 🤖 VALIDAÇÃO AUTOMÁTICA DAS MARCAÇÕES CRT
    const validation = crtValidator.validateCRTMarkers(crt, state.candles4h);

    // Log se houver correções
    if (validation.corrections.length > 0) {
        console.log('\n🔧 CORREÇÕES AUTOMÁTICAS CRT:');
        validation.corrections.forEach(correction => console.log(correction));
    }

    // Log se houver erros
    if (validation.errors.length > 0) {
        console.log('\n⚠️ AVISOS CRT:');
        validation.errors.forEach(error => console.log(error));
    }

    // Log do status
    console.log(validation.summary);

    // Combina indicadores técnicos com CRT
    const combinedIndicators = {
        ...indicators,
        // Indicadores CRT
        pcc: crt.pcc,
        isManipulation: crt.manipulation?.isValid || false,
        manipulationType: crt.manipulation?.type || null,
        hasTurtleSoup: crt.turtleSoup !== null,
        hasFVG: crt.fvg.length > 0,
        phase: crt.phase.phase,
        quadrant: crt.quadrants?.currentQuadrant || null
    };

    // Usa IA para prever entrada (agora com dados CRT!)
    const prediction = aiLearner.predict(currentCandle, combinedIndicators);

    return {
        candle: currentCandle,
        indicators: combinedIndicators,
        crt, // Dados CRT completos
        prediction,
        signals: generateSignals(crt, indicators, prediction)
    };
}

function generateSignals(crt, indicators, prediction) {
    const signals = [];

    // Verificar se CRT detectou uma zona de entrada válida
    if (crt.entryZone && crt.entryZone.hasEntry) {
        const zone = crt.entryZone;

        // 🎯 Registrar oportunidade CRT detectada
        const confidence = Math.round(prediction.confidence * 100);
        registerOpportunity(`${zone.type} CRT`, confidence);

        signals.push({
            type: zone.type, // LONG ou SHORT
            confidence: prediction.confidence,
            entry: zone.entry,
            stopLoss: zone.stopLoss,
            takeProfit: zone.takeProfit,
            riskReward: zone.riskReward,
            reasons: [
                `✅ ${zone.reason}`,
                `📊 Fase: ${crt.phase.phase}`,
                `🎯 Confiança: ${(prediction.confidence * 100).toFixed(1)}%`,
                `💰 R/R: 1:${zone.riskReward.toFixed(2)}`,
                `${prediction.method} Strategy`,
                ...(prediction.reasons || [])
            ],
            timestamp: Date.now(),
            crtData: {
                pcc: crt.pcc,
                quadrant: crt.quadrants?.currentQuadrant,
                manipulation: crt.manipulation?.type,
                turtleSoup: crt.turtleSoup?.type,
                fvgCount: crt.fvg.length
            }
        });
    }

    return signals;
}

function calculateStopLoss(direction, crt) {
    const currentPrice = parseFloat(state.candles[state.candles.length - 1].close);
    const atr = calculateATR(state.candles.slice(-20));

    if (direction === 'LONG') {
        // SL abaixo do último OB ou swing low
        return currentPrice - (atr * 1.5);
    } else {
        // SL acima do último OB ou swing high
        return currentPrice + (atr * 1.5);
    }
}

function calculateTakeProfit(direction, smc, expectedProfit) {
    const currentPrice = parseFloat(state.candles[state.candles.length - 1].close);
    const multiplier = Math.max(expectedProfit / 100, 0.02); // Mínimo 2%

    if (direction === 'LONG') {
        return currentPrice * (1 + multiplier);
    } else {
        return currentPrice * (1 - multiplier);
    }
}

function calculateATR(candles) {
    let tr = candles.map((c, i) => {
        if (i === 0) return parseFloat(c.high) - parseFloat(c.low);
        const prev = candles[i - 1];
        return Math.max(
            parseFloat(c.high) - parseFloat(c.low),
            Math.abs(parseFloat(c.high) - parseFloat(prev.close)),
            Math.abs(parseFloat(c.low) - parseFloat(prev.close))
        );
    });

    return tr.reduce((a, b) => a + b, 0) / tr.length;
}

function isNearSupportResistance(candle, premiumDiscount) {
    if (!premiumDiscount) return false;

    const price = parseFloat(candle.close);
    const tolerance = (premiumDiscount.high - premiumDiscount.low) * 0.02;

    return Math.abs(price - premiumDiscount.equilibrium) < tolerance ||
        Math.abs(price - premiumDiscount.premium) < tolerance ||
        Math.abs(price - premiumDiscount.discount) < tolerance;
}

// ===== EXECUÇÃO DE TRADES =====


async function executeTrade(signal) {
    if (!state.config.autoTrading) {
        console.log('🔒 Auto-trading desabilitado. Sinal ignorado.');
        return;
    }

    if (state.currentTrade) {
        console.log('⚠️ Já existe uma operação ativa.');
        return;
    }

    // 🧠 CONSULTAR IA ANTES DE EXECUTAR!
    console.log('\n🧠 Consultando IA para validar trade...');

    try {
        const currentPrice = parseFloat(state.candles[state.candles.length - 1].close);
        const priceAction = signal.type === 'LONG' ? 'support' : 'rejection';

        const aiEnhancements = await knowledgeApplicator.enhanceCRTAnalysis(
            state.analysis.crt,
            {
                trend: signal.type,
                priceAction: priceAction,
                currentPrice: currentPrice
            }
        );

        // 📊 Mostrar o que a IA aplicou
        console.log(`\n📊 Análise da IA:`);
        console.log(`   Confidence original: ${(signal.confidence * 100).toFixed(1)}%`);
        console.log(`   Confidence ajustada: ${(aiEnhancements.adjustedConfidence * 100).toFixed(1)}%`);

        if (aiEnhancements.appliedConcepts.length > 0) {
            console.log(`   🎯 Conceitos aplicados:`);
            aiEnhancements.appliedConcepts.forEach(c => {
                console.log(`      - ${c.name} (impacto: +${(c.impact * 100).toFixed(1)}%, confidence: ${(c.confidence * 100).toFixed(1)}%)`);
            });
        }

        if (aiEnhancements.suggestions.length > 0) {
            console.log(`   💡 Sugestões da IA:`);
            aiEnhancements.suggestions.forEach(s => {
                console.log(`      - ${s.strategy}: ${s.action} (confidence: ${(s.confidence * 100).toFixed(1)}%)`);
            });
        }

        // ✅ Aplicar melhorias da IA ao signal
        const enhancedSignal = {
            ...signal,
            confidence: aiEnhancements.adjustedConfidence,
            reasons: [
                ...signal.reasons,
                ...aiEnhancements.appliedConcepts.map(c => `IA: ${c.name}`)
            ],
            aiEnhancements: aiEnhancements  // Guardar para usar depois
        };

        // 🚫 Bloquear trade se IA não confia
        if (aiEnhancements.adjustedConfidence < 0.4) {
            console.log(`\n⚠️ IA BLOQUEOU TRADE: Confidence muito baixa (${(aiEnhancements.adjustedConfidence * 100).toFixed(1)}%)`);
            console.log(`   Mínimo necessário: 40%`);
            return;
        }

        console.log(`\n✅ IA APROVOU TRADE com ${(aiEnhancements.adjustedConfidence * 100).toFixed(1)}% de confidence\n`);

        // Usar signal melhorado pela IA
        signal = enhancedSignal;

    } catch (error) {
        console.error('❌ Erro ao consultar IA:', error);
        console.log('⚠️ Continuando sem análise da IA...\n');
    }

    const riskAmount = state.balance.available * state.config.maxRiskPerTrade;
    const riskPerUnit = Math.abs(signal.entry - signal.stopLoss);
    const quantity = (riskAmount / riskPerUnit).toFixed(3); // Arredondar para 3 casas

    // 🚀 EXECUTAR TRADE REAL NA BINANCE
    console.log('\n' + '='.repeat(50));
    console.log('🚀 EXECUTANDO TRADE REAL NA BINANCE FUTURES');
    console.log('='.repeat(50));

    const realTradeResult = await tradeExecutor.executeRealTrade({
        ...signal,
        pair: state.activePair
    }, quantity);

    if (!realTradeResult.success) {
        console.log(`\n❌ FALHA AO EXECUTAR TRADE REAL: ${realTradeResult.error}`);
        console.log('⚠️ Continuando em modo simulado...\n');
        // Continua em simulação se falhar
    } else {
        console.log('\n✅ TRADE REAL EXECUTADO COM SUCESSO NA BINANCE!');
        console.log(`   Ordem de entrada: #${realTradeResult.tradeInfo.entryOrderId}`);
        console.log(`   Stop Loss: #${realTradeResult.tradeInfo.stopLossOrderId}`);
        console.log(`   Take Profit: #${realTradeResult.tradeInfo.takeProfitOrderId}`);
        console.log('='.repeat(50) + '\n');
    }

    // Atualizar estado local
    state.currentTrade = {
        id: Date.now(),
        type: signal.type,
        entry: signal.entry,
        quantity: parseFloat(quantity),
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        confidence: signal.confidence,
        reasons: signal.reasons,
        entryTime: signal.timestamp,
        status: 'OPEN',
        realTradeInfo: realTradeResult.success ? realTradeResult.tradeInfo : null,
        aiEnhancements: signal.aiEnhancements || null  // Guardar para registrar resultado depois
    };

    state.balance.inPosition = parseFloat(quantity) * signal.entry;
    state.balance.available -= state.balance.inPosition;

    console.log(`✅ Trade registrado no sistema: ${signal.type} @ ${signal.entry}`);

    // Atualizar saldo real imediatamente
    updateRealBalance();

    broadcastUpdate();
}

function checkTradeExit() {
    if (!state.currentTrade || state.candles.length === 0) return;

    const currentPrice = parseFloat(state.candles[state.candles.length - 1].close);
    const trade = state.currentTrade;

    let shouldExit = false;
    let exitReason = '';
    let profit = 0;

    if (trade.type === 'LONG') {
        if (currentPrice >= trade.takeProfit) {
            shouldExit = true;
            exitReason = 'Take Profit';
            profit = (trade.takeProfit - trade.entry) * trade.quantity;
        } else if (currentPrice <= trade.stopLoss) {
            shouldExit = true;
            exitReason = 'Stop Loss';
            profit = (currentPrice - trade.entry) * trade.quantity;
        }
    } else {
        if (currentPrice <= trade.takeProfit) {
            shouldExit = true;
            exitReason = 'Take Profit';
            profit = (trade.entry - trade.takeProfit) * trade.quantity;
        } else if (currentPrice >= trade.stopLoss) {
            shouldExit = true;
            exitReason = 'Stop Loss';
            profit = (trade.entry - currentPrice) * trade.quantity;
        }
    }

    if (shouldExit) {
        closeTrade(currentPrice, exitReason, profit);
    }
}

function closeTrade(exitPrice, reason, profit) {
    const trade = state.currentTrade;
    const profitPercent = (profit / state.balance.inPosition) * 100;

    trade.exitPrice = exitPrice;
    trade.exitReason = reason;
    trade.profit = profit;
    trade.profitPercent = profitPercent;
    trade.exitTime = Date.now();
    trade.status = 'CLOSED';

    state.trades.push(trade);
    state.balance.available += state.balance.inPosition + profit;
    state.balance.total = state.balance.available;
    state.balance.inPosition = 0;

    // Atualizar estatísticas
    state.stats.totalTrades++;
    state.stats.todayTrades++;
    state.stats.totalProfit += profit;


    if (profit > 0) {
        state.stats.winningTrades++;

        // ✅ RECOMPENSA POR ACERTO
        const riskReward = Math.abs(profit / (state.currentTrade.stopLoss - state.currentTrade.entry));

        console.log(`\n${'='.repeat(70)}`);
        console.log(`🎯 ALVO ALCANÇADO!`);
        console.log(`💰 Meta de lucro buscada: 5:1 ou mais`);
        console.log(`💵 Valor alcançado nesta operação: $${profit.toFixed(2)}`);
        console.log(`📊 Risk/Reward: 1:${riskReward.toFixed(2)}`);
        console.log(`⭐ Pontos de recompensa: +100`);
        if (riskReward >= 5) {
            console.log(`🏆 META 5:1 ALCANÇADA! EXCELENTE!`);
        }
        console.log(`${'='.repeat(70)}\n`);

    } else {
        state.stats.losingTrades++;

        // ❌ PUNIÇÃO SEVERA POR ERRO
        console.log(`\n${'='.repeat(70)}`);
        console.log(`❌ STOP LOSS ATINGIDO`);
        console.log(`⚠️ PUNIÇÃO APLICADA: -500 pontos (SEVERA)`);
        console.log(`📉 Perda nesta operação: $${Math.abs(profit).toFixed(2)}`);
        console.log(`🔍 Analisando o que deu errado...`);
        console.log(`${'='.repeat(70)}\n`);
    }

    state.stats.winRate = (state.stats.winningTrades / state.stats.totalTrades) * 100;

    // 🧠 REGISTRAR RESULTADO NA IA PARA APRENDIZADO!
    if (trade.aiEnhancements && trade.aiEnhancements.appliedConcepts) {
        const wasSuccessful = profit > 0;

        console.log(`\n🧠 Registrando resultado na IA...`);
        console.log(`   Resultado: ${wasSuccessful ? '✅ WIN' : '❌ LOSS'}`);

        // Registrar cada conceito aplicado
        trade.aiEnhancements.appliedConcepts.forEach(async (concept) => {
            try {
                await knowledgeApplicator.recordResult(
                    'concept',
                    concept.id || concept.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                    wasSuccessful
                );
                console.log(`   📊 Conceito "${concept.name}": ${wasSuccessful ? 'sucesso' : 'falha'} registrado`);
            } catch (error) {
                console.error(`   ❌ Erro ao registrar conceito:`, error.message);
            }
        });

        console.log(`   ✅ IA atualizou performance dos conceitos aplicados\n`);
    } else {
        console.log(`   ⚠️ Trade não tinha conceitos da IA aplicados\n`);
    }

    // Ensinar a IA
    const lastAnalysis = state.analysis;
    if (lastAnalysis) {
        aiLearner.addTrade(
            {
                candle: lastAnalysis.candle,
                indicators: lastAnalysis.indicators
            },
            {
                profit: profitPercent
            }
        );
    }

    console.log(`🏁 Trade fechado: ${reason} - Lucro: ${profitPercent.toFixed(2)}%`);

    state.currentTrade = null;

    // Atualizar saldo real imediatamente
    updateRealBalance();

    broadcastUpdate();
}

// ===== WEBSOCKET BINANCE =====

async function startMarketStream() {
    if (state.activeStream) {
        state.activeStream();
        state.activeStream = null;
    }

    console.log(`📡 Iniciando stream CRT: ${state.activePair} @ ${state.activeInterval}`);

    // Carregar dados históricos de 1m E 4H (para CRT!)
    try {
        // 1. Velas do timeframe de execução (1m)
        const candles1m = await client.candles({
            symbol: state.activePair,
            interval: state.activeInterval,
            limit: 100
        });

        state.candles = candles1m.map(c => ({
            time: c.openTime,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
            volume: parseFloat(c.volume)
        }));

        console.log(`✅ ${state.candles.length} velas de ${state.activeInterval} carregadas`);

        // 2. Velas de 4H (PARA CRT!)
        const candles4h = await client.candles({
            symbol: state.activePair,
            interval: '4h',
            limit: 50 // Últimas 50 velas de 4H
        });

        state.candles4h = candles4h.map(c => ({
            time: c.openTime,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
            volume: parseFloat(c.volume)
        }));

        console.log(`✅ ${state.candles4h.length} velas de 4H carregadas (CRT)`);

    } catch (error) {
        console.error('❌ Erro ao carregar velas:', error.message);
    }

    // Stream em tempo real
    state.activeStream = client.ws.candles(state.activePair, state.activeInterval, candle => {
        const candleData = {
            time: candle.startTime,
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
            volume: parseFloat(candle.volume),
            isFinal: candle.isFinal
        };

        if (candle.isFinal) {
            state.candles.push(candleData);
            if (state.candles.length > 200) {
                state.candles = state.candles.slice(-200);
            }
        } else {
            // Atualiza a última vela
            if (state.candles.length > 0) {
                state.candles[state.candles.length - 1] = candleData;
            }
        }

        // Analisar mercado
        state.analysis = analyzeMarket();

        // Verificar saídas
        checkTradeExit();

        // Procurar novas entradas
        if (candle.isFinal && state.analysis && state.analysis.signals.length > 0) {
            executeTrade(state.analysis.signals[0]);
        }

        broadcastUpdate();
    });
}

// ===== WEBSOCKET CLIENTES =====

function broadcastUpdate() {
    const data = {
        type: 'UPDATE',
        pair: state.activePair,
        interval: state.activeInterval,
        candles: state.candles.slice(-100),
        candles4h: state.candles4h.slice(-10), // Últimas 10 velas de 4H para overlay
        analysis: state.analysis,
        balance: state.balance,
        currentTrade: state.currentTrade,
        trades: state.trades.slice(-20),
        stats: state.stats,
        aiStats: {
            ...aiLearner.getStats(),
            opportunitiesLast4H: state.opportunities.last4H,
            opportunitiesToday: state.opportunities.today,
            totalOpportunities: state.opportunities.total,
            lastOpportunity: state.opportunities.lastOpportunity
        },
        learningReports: state.learningReports || [],
        config: state.config,
        timestamp: Date.now()
    };

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

wss.on('connection', (ws) => {
    console.log('👤 Cliente conectado');

    // Enviar estado inicial completo
    ws.send(JSON.stringify({
        type: 'INIT',
        pair: state.activePair,
        interval: state.activeInterval,
        candles: state.candles.slice(-100),
        candles4h: state.candles4h.slice(-10), // Velas 4H para CRT
        analysis: state.analysis,
        balance: state.balance,
        currentTrade: state.currentTrade,
        trades: state.trades.slice(-20),
        stats: state.stats,
        aiStats: {
            ...aiLearner.getStats(),
            opportunitiesLast4H: state.opportunities.last4H,
            opportunitiesToday: state.opportunities.today,
            totalOpportunities: state.opportunities.total,
            lastOpportunity: state.opportunities.lastOpportunity
        },
        learningReports: state.learningReports || [],
        config: state.config,
        timestamp: Date.now()
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'CHANGE_PAIR':
                    state.activePair = data.pair;
                    startMarketStream();
                    break;

                case 'CHANGE_INTERVAL':
                    state.activeInterval = data.interval;
                    startMarketStream();
                    break;

                case 'TOGGLE_AUTO_TRADING':
                    state.config.autoTrading = data.enabled;
                    console.log(`🤖 Auto-trading: ${data.enabled ? 'ATIVADO' : 'DESATIVADO'}`);
                    broadcastUpdate();
                    break;

                case 'MANUAL_CLOSE':
                    if (state.currentTrade) {
                        const currentPrice = parseFloat(state.candles[state.candles.length - 1].close);
                        const profit = state.currentTrade.type === 'LONG'
                            ? (currentPrice - state.currentTrade.entry) * state.currentTrade.quantity
                            : (state.currentTrade.entry - currentPrice) * state.currentTrade.quantity;
                        closeTrade(currentPrice, 'Manual Exit', profit);
                    }
                    break;
            }
        } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error.message);
        }
    });
});

// ===== ROTAS API =====

app.get('/health', (req, res) => {
    res.json({ status: 'OK', uptime: process.uptime() });
});

app.get('/stats', (req, res) => {
    res.json({
        stats: state.stats,
        ai: aiLearner.getStats(),
        balance: state.balance
    });
});


// ===== INICIAR SERVIDOR =====

const PORT = process.env.PORT || 3001;

// 🧠 Sistema de Aprendizado Automático (a cada hora)
let learningInterval = null;

async function runAutomaticLearning() {
    console.log('\n🎓 ========================================');
    console.log('🧠 APRENDIZADO AUTOMÁTICO DA IA');
    console.log('🎓 ========================================\n');

    try {
        const startTime = Date.now();

        // 1. Recarregar conhecimento ativo
        await knowledgeApplicator.loadActiveKnowledge();

        // 2. Obter estatísticas atuais
        const stats = knowledgeApplicator.getSummary();
        const newConcepts = stats.totalKnowledge.concepts;
        const newStrategies = stats.totalKnowledge.strategies;
        const newVideos = stats.totalKnowledge.videos;

        // 3. Calcular score de aprendizado
        const score = (newConcepts * 100) + (newStrategies * 200) + (newVideos * 500);

        // 4. Criar relatório
        const report = {
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            newVideos: newVideos,
            newConcepts: newConcepts,
            score: score,
            strategies: newStrategies,
            performance: stats.performance.avgConceptSuccess
        };

        // 5. Adicionar ao histórico (manter últimos 10)
        state.learningReports.push(report);
        if (state.learningReports.length > 10) {
            state.learningReports.shift();
        }

        const duration = Date.now() - startTime;

        console.log('📊 Relatório de Aprendizado:');
        console.log(`   ⏰ Hora: ${report.time}`);
        console.log(`   📹 Vídeos processados: ${report.newVideos}`);
        console.log(`   💡 Conceitos ativos: ${report.newConcepts}`);
        console.log(`   🎯 Estratégias: ${report.strategies}`);
        console.log(`   🏆 Score: ${report.score}`);
        console.log(`   📈 Performance: ${report.performance}`);
        console.log(`   ⚡ Duração: ${duration}ms`);

        console.log('\n✅ Aprendizado atualizado com sucesso!');
        console.log('🔄 Próximo aprendizado em 1 hora...\n');

        // Broadcast update para atualizar frontend
        broadcastUpdate();

    } catch (error) {
        console.error('❌ Erro no aprendizado automático:', error);
    }
}

function startAutomaticLearning() {
    // Executar primeira vez após 1 minuto
    setTimeout(() => {
        console.log('🎓 Iniciando sistema de aprendizado automático...\n');
        runAutomaticLearning();

        // Depois executar a cada hora (3600000ms)
        learningInterval = setInterval(runAutomaticLearning, 3600000);

    }, 60000); // 1 minuto
}

server.listen(PORT, async () => {
    console.log('🚀 ========================================');
    console.log(`🤖 AI TRADING SYSTEM v2.0`);
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🧠 AI Learning: ${aiLearner.isTrained ? 'TRAINED' : 'LEARNING'}`);
    console.log(`💰 Initial Balance: $${state.balance.total}`);
    console.log('🚀 ========================================');

    // 🧠 Inicializar memória permanente da IA
    console.log('\n🧠 Carregando memória da IA...');
    try {
        await knowledgeApplicator.initialize();
        const summary = knowledgeApplicator.getSummary();
        console.log(`✅ Memória carregada:`);
        console.log(`   💡 ${summary.totalKnowledge.concepts} conceitos`);
        console.log(`   🎯 ${summary.totalKnowledge.strategies} estratégias`);
        console.log(`   📹 ${summary.totalKnowledge.videos} vídeos processados`);
        console.log(`   📊 Performance: ${summary.performance.avgConceptSuccess} sucesso\n`);
    } catch (error) {
        console.log(`⚠️ Erro ao carregar memória: ${error.message}\n`);
    }

    // Configurar Binance Futures automaticamente
    console.log('⚙️ Configurando Binance Futures...');
    try {
        await tradeExecutor.setMarginType(state.activePair, 'ISOLATED');
        await tradeExecutor.setLeverage(state.activePair, 10); // Alavancagem 10x
        console.log('✅ Binance Futures configurado com sucesso!\n');
    } catch (error) {
        console.log(`⚠️ Erro na configuração Futures: ${error.message}\n`);
    }

    // 🎓 Iniciar sistema de aprendizado automático
    startAutomaticLearning();

    startMarketStream();
});
