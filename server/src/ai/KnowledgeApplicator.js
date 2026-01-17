/**
 * 🎯 APLICADOR DE CONHECIMENTO DA IA
 * 
 * Este módulo pega o conhecimento da memória da IA
 * e APLICA nas decisões de trading em tempo real!
 */

const { getInstance: getAIMemory } = require('./AIMemory');

class KnowledgeApplicator {
    constructor() {
        this.memory = getAIMemory();
        this.activeStrategies = [];
        this.activeConcepts = [];
    }

    /**
     * Inicializa e carrega conhecimento
     */
    async initialize() {
        await this.memory.load();
        await this.loadActiveKnowledge();
        console.log('🎯 Conhecimento da IA carregado e pronto para aplicar');
    }

    /**
     * Carrega conhecimento ativo para uso
     */
    async loadActiveKnowledge() {
        // Carregar top estratégias
        this.activeStrategies = this.memory.getRelevantStrategies(0.0);

        // Carregar top conceitos CRT
        this.activeConcepts = this.memory.getRelevantConcepts('CRT', 0.3);

        console.log(`📚 ${this.activeStrategies.length} estratégias ativas`);
        console.log(`💡 ${this.activeConcepts.length} conceitos CRT ativos`);
    }

    /**
     * Aplica conhecimento na análise CRT
     */
    async enhanceCRTAnalysis(crtData, market) {
        const enhancements = {
            adjustedConfidence: crtData.confidence || 0.5,
            appliedConcepts: [],
            suggestions: [], // 🔧 CORREÇÃO: era "suggestionsweet" (typo)
            warnings: []
        };

        // Aplicar conceitos relevantes
        for (const concept of this.activeConcepts) {
            const applied = this.applyConceptToCRT(concept, crtData, market);
            if (applied) {
                enhancements.appliedConcepts.push({
                    name: concept.name,
                    impact: applied.impact,
                    confidence: concept.confidence
                });

                // Ajustar confidência baseado no conceito
                enhancements.adjustedConfidence += applied.impact * concept.successRate;
            }
        }

        // Aplicar estratégias
        for (const strategy of this.activeStrategies) {
            const match = this.matchStrategy(strategy, crtData, market);
            if (match.matches) {
                enhancements.suggestions.push({
                    strategy: strategy.name,
                    action: match.action,
                    confidence: strategy.winRate,
                    reason: match.reason
                });
            }
        }

        // Garantir confidence entre 0 e 1
        enhancements.adjustedConfidence = Math.max(0, Math.min(1, enhancements.adjustedConfidence));

        return enhancements;
    }

    /**
     * Aplica conceito específico ao CRT
     */
    applyConceptToCRT(concept, crtData, market) {
        const rules = {
            'manipulacao_pcc': () => {
                // Se detectou manipulação no PCC
                if (crtData.manipulation?.detected) {
                    return { impact: 0.15, reason: 'Manipulação no PCC detectada' };
                }
                return null;
            },

            'rejeicao_zona_premium': () => {
                // Se preço rejeitou zona premium
                if (crtData.currentQuadrant?.includes('PREMIUM') && market.priceAction === 'rejection') {
                    return { impact: 0.20, reason: 'Rejeição em zona premium' };
                }
                return null;
            },

            'suporte_zona_discount': () => {
                // Se preço encontrou suporte em discount
                if (crtData.currentQuadrant?.includes('DISCOUNT') && market.priceAction === 'support') {
                    return { impact: 0.20, reason: 'Suporte em zona discount' };
                }
                return null;
            },

            'alinhamento_bias': () => {
                // Se movimento alinha com bias 4H
                const bias = crtData.bias?.direction;
                const movement = market.trend;
                if (bias === movement) {
                    return { impact: 0.10, reason: `Alinhado com bias ${bias}` };
                }
                return null;
            },

            'confluencia_niveis': () => {
                // Se múltiplos níveis convergem
                const near = crtData.nearbyLevels?.length || 0;
                if (near >= 2) {
                    return { impact: 0.15, reason: `${near} níveis em confluência` };
                }
                return null;
            }
        };

        const rule = rules[concept.id];
        return rule ? rule() : null;
    }

    /**
     * Verifica se estratégia se aplica à situação atual
     */
    matchStrategy(strategy, crtData, market) {
        // Verificar condições básicas
        const conditions = strategy.conditions || {};

        const matches = {
            bias: !conditions.bias || conditions.bias === crtData.bias?.direction,
            quadrant: !conditions.quadrant || crtData.currentQuadrant?.includes(conditions.quadrant),
            manipulation: !conditions.manipulation || crtData.manipulation?.detected === conditions.manipulation,
            trend: !conditions.trend || market.trend === conditions.trend
        };

        const allMatch = Object.values(matches).every(m => m);

        if (allMatch) {
            // Determinar ação baseado nas regras da estratégia
            let action = 'HOLD';
            let reason = strategy.name;

            if (strategy.rules?.includes('BUY_ON_DISCOUNT_SUPPORT')) {
                if (crtData.currentQuadrant?.includes('DISCOUNT') && market.priceAction === 'support') {
                    action = 'BUY';
                    reason = 'Suporte em discount conforme estratégia';
                }
            }

            if (strategy.rules?.includes('SELL_ON_PREMIUM_REJECTION')) {
                if (crtData.currentQuadrant?.includes('PREMIUM') && market.priceAction === 'rejection') {
                    action = 'SELL';
                    reason = 'Rejeição em premium conforme estratégia';
                }
            }

            return {
                matches: true,
                action,
                reason,
                confidence: strategy.winRate
            };
        }

        return { matches: false };
    }

    /**
     * Registra resultado de aplicação de conhecimento
     */
    async recordResult(type, id, wasSuccessful) {
        await this.memory.recordUsage(type, id, wasSuccessful);
        console.log(`📊 Resultado registrado: ${type} ${id} = ${wasSuccessful ? 'Sucesso' : 'Falha'}`);
    }

    /**
     * Adiciona novo conhecimento de vídeo
     */
    async learnFromVideo(videoData) {
        console.log(`🎓 Aprendendo de vídeo: ${videoData.title}`);

        const videoId = await this.memory.addVideo(videoData);

        // Adicionar conceitos
        for (const concept of (videoData.concepts || [])) {
            await this.memory.addConcept(videoId, concept);
            console.log(`  💡 Conceito: ${concept.name}`);
        }

        // Adicionar estratégias
        for (const strategy of (videoData.strategies || [])) {
            await this.memory.addStrategy(videoId, strategy);
            console.log(`  🎯 Estratégia: ${strategy.name}`);
        }

        // Recarregar conhecimento ativo
        await this.loadActiveKnowledge();

        console.log(`✅ Vídeo processado: ${videoData.concepts?.length || 0} conceitos, ${videoData.strategies?.length || 0} estratégias`);
    }

    /**
     * Obtém resumo do conhecimento atual
     */
    getSummary() {
        const stats = this.memory.getStats();

        return {
            totalKnowledge: {
                concepts: stats.totalConcepts,
                strategies: stats.totalStrategies,
                patterns: stats.totalPatterns,
                videos: stats.totalVideos
            },
            activeKnowledge: {
                strategies: this.activeStrategies.length,
                concepts: this.activeConcepts.length
            },
            performance: {
                avgConceptSuccess: (stats.avgConceptSuccess * 100).toFixed(1) + '%',
                avgStrategyWinRate: (stats.avgStrategyWinRate * 100).toFixed(1) + '%'
            },
            lastUpdate: stats.lastUpdate
        };
    }

    /**
     * Obtém top conceitos por performance
     */
    getTopConcepts(limit = 10) {
        return this.activeConcepts
            .slice(0, limit)
            .map(c => ({
                name: c.name,
                category: c.category,
                successRate: (c.successRate * 100).toFixed(1) + '%',
                timesApplied: c.timesApplied,
                confidence: (c.confidence * 100).toFixed(1) + '%'
            }));
    }

    /**
     * Obtém top estratégias por performance
     */
    getTopStrategies(limit = 10) {
        return this.activeStrategies
            .slice(0, limit)
            .map(s => ({
                name: s.name,
                winRate: (s.winRate * 100).toFixed(1) + '%',
                totalTrades: s.totalTrades,
                profitable: s.profitable
            }));
    }
}

// Singleton
let instance = null;

module.exports = {
    getInstance: () => {
        if (!instance) {
            instance = new KnowledgeApplicator();
        }
        return instance;
    }
};
