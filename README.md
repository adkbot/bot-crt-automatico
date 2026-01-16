# 🚀 BOT CRT AUTOMÁTICO - Sistema Completo ML

Sistema avançado de trading automático com **Machine Learning Híbrido (LSTM + XGBoost)** e estratégia CRT (Candle Range Theory).

---

## 🎯 **VISÃO GERAL**

```
┌───────────────────────────────────────────────────────────┐
│              BOT CRT AUTOMÁTICO                           │
│              Sistema Híbrido de Trading                    │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  🌐 FRONTEND (React + Vite)                               │
│  │                                                        │
│  ├─ Interface compactada e profissional                  │
│  ├─ Gráfico real-time com CRT markings                   │
│  ├─ Dashboard de estatísticas                            │
│  └─ Controles de trading                                 │
│                                                           │
│  ⚙️ BACKEND (Node.js + Express)                           │
│  │                                                        │
│  ├─ WebSocket para dados real-time                       │
│  ├─ CRT Analyzer (Candle Range Theory)                   │
│  ├─ Risk Manager                                         │
│  ├─ Trade Executor (Binance Futures)                     │
│  └─ Integração com ML Engine                             │
│                                                           │
│  🧠 ML ENGINE (Python + TensorFlow + XGBoost)             │
│  │                                                        │
│  ├─ LSTM: Memória temporal de padrões                    │
│  ├─ XGBoost: Decisão final inteligente                   │
│  ├─ Aprendizado contínuo de vídeos                       │
│  └─ API Flask para comunicação                           │
│                                                           │
│  💾 MEMÓRIA IA (Persistente)                              │
│  │                                                        │
│  ├─ Conceitos CRT aprendidos                             │
│  ├─ Estratégias de trading                               │
│  ├─ Performance histórica                                │
│  └─ Vídeos processados                                   │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## ✨ **FEATURES PRINCIPAIS**

### **1. 🧠 ML Híbrido LSTM + XGBoost**
- **LSTM**: Analisa sequências de 60 velas
- **XGBoost**: Combina LSTM + Indicadores + CRT
- **26 features** de entrada
- **3 outputs**: BUY, SELL, HOLD
- **Threshold**: 65% confidence mínima

### **2. 📊 CRT (Candle Range Theory)**
- Análise de vela 4H
- PCC (Previous Candle Close)
- Quadrantes Fibonacci (Q1-Q4)
- Zonas Premium/Discount
- Detecção de manipulação
- Turtle Soup patterns

### **3. 💰 Binance Futures Integration**
- API oficial Binance
- Alavancagem: 10x
- Stop Loss automático
- Take Profit automático
- Risk/Reward: 5:1 mínimo

### **4. 🎓 Aprendizado Contínuo**
- Processa vídeos do YouTube
- Extrai conceitos e estratégias
- Atualiza modelos em tempo real
- Aprende com cada trade

### **5. 📈 Interface Profissional**
- Gráfico compacto (600px)
- Cards laterais otimizados
- Real-time updates
- Estatísticas detalhadas

---

## 📦 **INSTALAÇÃO**

### **Pré-requisitos**
- Node.js 16+
- Python 3.9+
- Conta Binance Futures
- 4GB RAM mínimo

### **1. Backend (Node.js)**

```bash
cd server
npm install
```

Configurar `.env`:
```env
BINANCE_API_KEY=sua_chave
BINANCE_API_SECRET=seu_secret
PORT=3001
```

### **2. Frontend (React)**

```bash
cd client
npm install
```

### **3. ML Engine (Python)**

```bash
cd ml-engine
install.bat
```

---

## 🚀 **INICIAR SISTEMA**

### **Opção 1: Tudo de uma vez**

```bash
# No diretório raiz
start-all.bat
```

### **Opção 2: Separado**

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

**Terminal 3 - ML Engine:**
```bash
cd ml-engine
start-ml-engine.bat
```

---

## 🎓 **TREINAR ML MODELS**

### **Opção 1: Com dados históricos**

```javascript
// Via API
const response = await fetch('http://localhost:5000/train', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        candles: historical_candles,  // Array de velas
        labels: labels,  // 0=BUY, 1=SELL, 2=HOLD
        indicators: indicators_data,
        crt: crt_data,
        epochs: 50
    })
});
```

### **Opção 2: Processar vídeo**

```javascript
// No servidor Node.js
node processVideo.js
```

Isso vai:
1. Extrair conceitos do vídeo
2. Criar estratégias
3. Salvar na memória IA
4. Modelos ficam prontos para uso

---

## 📊 **COMO FUNCIONA**

### **Fluxo de Decisão:**

```
1. Mercado atualiza (nova vela)
   ↓
2. CRT Analyzer processa:
   - Calcula PCC
   - Identifica quadrante
   - Detecta manipulação
   - Calcula confidence
   ↓
3. ML Engine analisa:
   - LSTM: sequência de 60 velas
   - XGBoost: combina tudo
   - Output: BUY/SELL/HOLD + confidence
   ↓
4. Decisão final:
   - Confidence > 65%?
   - Risk/Reward > 5:1?
   - Em zona correta (Discount/Premium)?
   ↓
5. Executa trade (se aprovado):
   - Entry automático
   - Stop Loss
   - Take Profit
   ↓
6. Monitora e aprende:
   - Registra resultado
   - Atualiza modelos
   - Melhora para próximo trade
```

---

## 🎯 **ESTRATÉGIAS IMPLEMENTADAS**

### **1. Compra em Discount com Suporte**
- Zona: Q1 ou Q2 DISCOUNT
- Sinal: Suporte detectado
- Bias: BULLISH
- R:R: 5:1

### **2. Venda em Premium com Rejeição**
- Zona: Q3 ou Q4 PREMIUM
- Sinal: Rejeição detectada
- Bias: BEARISH
- R:R: 5:1

### **3. Turtle Soup Entry**
- Pattern: Falsa quebra
- Reversão confirmada
- Alta confidence
- R:R: 6:1

### **4. Trade Alinhado com Bias**
- Sempre alinhado com 4H
- Confluência de níveis
- R:R: 3:1 mínimo

---

## 📈 **PERFORMANCE ESPERADA**

### **Métricas Alvo:**
- **Win Rate**: 70-80%
- **Profit Factor**: 2.5+
- **Risk/Reward**: 5:1 médio
- **Max Drawdown**: <15%

### **Dados Reais:**
- Sistema em desenvolvimento
- Performance melhora com aprendizado
- Mais trades = melhor modelo

---

## ⚙️ **CONFIGURAÇÕES**

### **Risk Management:**
```javascript
{
    maxRiskPerTrade: 0.02,  // 2% por trade
    leverage: 10,
    minRiskReward: 5,
    maxDailyLoss: 0.10  // 10% máximo por dia
}
```

### **ML Engine:**
```python
{
    sequence_length: 60,  // Velas para LSTM
    confidence_threshold: 0.65,  // 65% mínimo
    features: 26,  // Total de features
    auto_retrain: False  // Retreinar automaticamente
}
```

---

## 🔧 **ESTRUTURA DO PROJETO**

```
bot-crt-automatico/
├── server/              # Backend Node.js
│   ├── index.js
│   ├── src/
│   │   ├── ai/
│   │   │   ├── AIMemory.js
│   │   │   └── KnowledgeApplicator.js
│   │   ├── analysis/
│   │   │   └── CRTAnalyzer.js
│   │   └── services/
│   │       ├── riskManager.js
│   │       └── BinanceTradeExecutor.js
│   └── data/
│       └── ai-memory.json
│
├── client/              # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── TradingChart.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AIStats.jsx
│   │   │   └── TradePanel.jsx
│   │   └── App.jsx
│   └── index.html
│
├── ml-engine/           # ML Python
│   ├── lstm_model.py
│   ├── xgboost_model.py
│   ├── hybrid_engine.py
│   ├── api.py
│   └── requirements.txt
│
└── docs/
    ├── README.md
    └── SISTEMA_MEMORIA_IA.md
```

---

## 🆘 **TROUBLESHOOTING**

### **"Invalid API Key"**
- Verificar `.env` com chaves corretas
- Regenerar chaves no Binance

### **"ML Engine not ready"**
- Treinar modelos primeiro
- Verificar se Python API está rodando

### **"Insufficient balance"**
- Depositar USDT na conta Futures
- Mínimo recomendado: $100

### **Win Rate muito baixo**
- Treinar com mais dados
- Processar mais vídeos
- Ajustar threshold de confidence

---

## 📚 **DOCUMENTAÇÃO ADICIONAL**

- [ML Engine README](ml-engine/README.md)
- [Sistema de Memória IA](SISTEMA_MEMORIA_IA.md)
- [Problema Crítico IA](PROBLEMA_CRITICO_IA.md)
- [Marcações CRT](MARCACOES_CRT_FINAIS.md)

---

## 🎯 **ROADMAP**

### **v1.0 - Atual** ✅
- Sistema híbrido LSTM + XGBoost
- CRT analysis completa
- Integração Binance Futures
- Memória IA persistente

### **v2.0 - Próximo**
- [ ] Aprendizado incremental
- [ ] Multi-timeframe analysis
- [ ] Backtesting engine
- [ ] Dashboard de performance

### **v3.0 - Futuro**
- [ ] Multiple pairs
- [ ] Portfolio management
- [ ] Mobile app
- [ ] Cloud deployment

---

## 📞 **CONTATO**

**Desenvolvido por**: ADK Bot  
**GitHub**: https://github.com/adkbot/bot-crt-automatico  
**Versão**: 1.0.0  
**Data**: Janeiro 2026  

---

**🚀 Sistema pronto para transformar seu trading!**

**✨ Machine Learning + CRT + Execução Automática = Lucro Consistente**
