/**
 * 🎓 PROCESSADOR DE VÍDEO PARA IA
 * 
 * Script para adicionar vídeo do YouTube à base de conhecimento da IA
 */

const { getInstance: getKnowledgeApplicator } = require('./src/ai/KnowledgeApplicator');

async function processYouTubeVideo() {
    const knowledgeApplicator = getKnowledgeApplicator();

    // Inicializar IA
    await knowledgeApplicator.initialize();

    console.log('\n🎓 Processando vídeo do YouTube...\n');

    // Dados extraídos do vídeo: https://youtu.be/lkfEz0KuQYs
    const videoData = {
        url: 'https://youtu.be/lkfEz0KuQYs',
        title: 'CRT Trading Strategy - Candle Range Theory',

        // Conceitos CRT ensinados no vídeo
        concepts: [
            {
                name: 'Manipulação no PCC',
                category: 'CRT',
                description: 'Preço manipula PCC antes de reverter na direção correta',
                confidence: 0.85
            },
            {
                name: 'Rejeição em Premium',
                category: 'CRT',
                description: 'Preço rejeita zona premium (Q4) para movimento bearish',
                confidence: 0.80
            },
            {
                name: 'Suporte em Discount',
                category: 'CRT',
                description: 'Preço encontra suporte em zona discount (Q1) para movimento bullish',
                confidence: 0.82
            },
            {
                name: 'Alinhamento com Bias 4H',
                category: 'CRT',
                description: 'Trade alinhado com bias da vela 4H tem maior probabilidade',
                confidence: 0.75
            },
            {
                name: 'Confluência de Níveis CRT',
                category: 'CRT',
                description: 'Quando múltiplos níveis convergem, aumenta a probabilidade',
                confidence: 0.78
            },
            {
                name: 'Turtle Soup Pattern',
                category: 'CRT',
                description: 'Falsa quebra seguida de reversão forte',
                confidence: 0.88
            },
            {
                name: 'Fair Value Gap (FVG)',
                category: 'CRT',
                description: 'Lacunas de preço que tendem a ser preenchidas',
                confidence: 0.72
            },
            {
                name: 'Order Block Validation',
                category: 'CRT',
                description: 'Blocos de ordem validam zonas de reversão',
                confidence: 0.80
            }
        ],

        // Estratégias ensinadas no vídeo
        strategies: [
            {
                name: 'Compra em Discount com Suporte',
                description: 'Entrar LONG quando preço está em Q1/Q2 DISCOUNT com suporte confirmado',
                rules: ['BUY_ON_DISCOUNT_SUPPORT'],
                conditions: {
                    quadrant: 'DISCOUNT',
                    bias: 'BULLISH',
                    manipulation: true
                },
                riskReward: 5
            },
            {
                name: 'Venda em Premium com Rejeição',
                description: 'Entrar SHORT quando preço está em Q3/Q4 PREMIUM com rejeição confirmada',
                rules: ['SELL_ON_PREMIUM_REJECTION'],
                conditions: {
                    quadrant: 'PREMIUM',
                    bias: 'BEARISH',
                    manipulation: true
                },
                riskReward: 5
            },
            {
                name: 'Trade no Alinhamento',
                description: 'Operar apenas quando alinhado com bias da 4H',
                rules: ['ALIGN_WITH_H4_BIAS'],
                conditions: {
                    bias: 'ANY'
                },
                riskReward: 3
            },
            {
                name: 'Entrada em Turtle Soup',
                description: 'Entrar na reversão após falsa quebra de nível importante',
                rules: ['ENTER_ON_TURTLE_SOUP'],
                conditions: {
                    manipulation: true
                },
                riskReward: 6
            }
        ],

        points: 2500 // Pontuação pela complexidade do vídeo
    };

    // Processar vídeo
    await knowledgeApplicator.learnFromVideo(videoData);

    // Mostrar resultado
    console.log('\n✅ VÍDEO PROCESSADO COM SUCESSO!\n');

    const summary = knowledgeApplicator.getSummary();
    console.log('📊 RESUMO DO CONHECIMENTO ATUAL:');
    console.log(`   💡 Total de Conceitos: ${summary.totalKnowledge.concepts}`);
    console.log(`   🎯 Total de Estratégias: ${summary.totalKnowledge.strategies}`);
    console.log(`   📹 Total de Vídeos: ${summary.totalKnowledge.videos}`);
    console.log(`   📈 Performance Média: ${summary.performance.avgConceptSuccess}\n`);

    console.log('🎓 CONCEITOS ATIVOS:');
    const topConcepts = knowledgeApplicator.getTopConcepts();
    topConcepts.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.name} (Confidence: ${c.confidence})`);
    });

    console.log('\n🎯 ESTRATÉGIAS ATIVAS:');
    const topStrategies = knowledgeApplicator.getTopStrategies();
    topStrategies.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.name} (Win Rate: ${s.winRate})`);
    });

    console.log('\n🚀 IA ESTÁ PRONTA PARA USAR ESTE CONHECIMENTO NOS PRÓXIMOS TRADES!\n');

    process.exit(0);
}

// Executar
processYouTubeVideo().catch(error => {
    console.error('❌ Erro ao processar vídeo:', error);
    process.exit(1);
});
