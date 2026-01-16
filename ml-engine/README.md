# 🧠 ML ENGINE - Sistema Híbrido LSTM + XGBoost

Sistema avançado de Machine Learning para trading que combina **memória temporal (LSTM)** com **decisão inteligente (XGBoost)**.

---

## 🏗️ **ARQUITETURA**

```
┌─────────────────────────────────────────────────┐
│           SISTEMA HÍBRIDO ML                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  📊 INPUT                                       │
│  ├─ 60 velas históricas (OHLCV + indicadores)  │
│  ├─ Indicadores técnicos atuais                │
│  ├─ Dados CRT (quadrantes, PCC, etc)           │
│  └─ Contexto de mercado                        │
│                                                 │
│  🧠 PROCESSAMENTO                               │
│  ├─ LSTM (Memória Temporal)                    │
│  │   └─ Analisa sequência de 60 velas          │
│  │   └─ Detecta padrões temporais              │
│  │   └─ Output: BUY/SELL/HOLD + confidence     │
│  │                                              │
│  ├─ XGBoost (Decisão Final)                    │
│  │   └─ Combina: LSTM + Indicadores + CRT      │
│  │   └─ 26 features totais                     │
│  │   └─ Gradient Boosting de 200 árvores       │
│  │                                              │
│  ✅ OUTPUT                                      │
│  ├─ Ação: BUY, SELL ou HOLD                    │
│  ├─ Confidence: 0-100%                          │
│  ├─ Should Trade: true/false (>65%)             │
│  └─ Razões humanizadas da decisão              │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## ⚡ **FEATURES**

### **LSTM (Long Short-Term Memory)**
- ✅ 3 camadas LSTM (128→64→32 neurônios)
- ✅ Dropout e BatchNormalization para evitar overfitting
- ✅ Aprende padrões de 60 velas (1 hora em 1m)
- ✅ Output: probabilidades para BUY/SELL/HOLD

### **XGBoost (Gradient Boosting)**
- ✅ 200 árvores de decisão
- ✅ 26 features combinadas:
  - 3 do LSTM (BUY, SELL, HOLD)
  - 10 indicadores técnicos
  - 8 dados CRT
  - 5 contexto de mercado
- ✅ Threshold de 65% para executar trade
- ✅ Feature importance para entender decisões

---

## 📦 **INSTALAÇÃO**

### **1. Instalar Dependências**

```bash
cd ml-engine
install.bat
```

Isso vai:
- Criar ambiente virtual Python
- Instalar TensorFlow, Keras, XGBoost
- Configurar tudo automaticamente

### **2. Iniciar ML Engine**

```bash
start-ml-engine.bat
```

A API vai rodar em: `http://localhost:5000`

---

## 🔌 **API ENDPOINTS**

### **GET /health**
Verifica se sistema está pronto

```json
{
  "status": "healthy",
  "ready": true,
  "models": {
    "lstm_trained": true,
    "xgboost_trained": true
  }
}
```

### **POST /predict**
Faz predição híbrida

**Request:**
```json
{
  "candles": [
    {
      "open": 100,
      "high": 101,
      "low": 99,
      "close": 100.5,
      "volume": 1000,
      "rsi": 55,
      "macd": 0.5,
      ...
    },
    ... // 60+ velas
  ],
  "indicators": {
    "rsi": 55,
    "macd": 0.5,
    "bb_upper": 105,
    ...
  },
  "crt_data": {
    "quadrant": "Q1_DISCOUNT",
    "manipulation_detected": true,
    ...
  },
  "market_context": {
    "trend": "BULLISH",
    "volatility": 0.015,
    ...
  }
}
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "action": "BUY",
    "confidence": 0.87,
    "should_trade": true,
    "lstm_analysis": {
      "action": "BUY",
      "confidence": 0.82,
      "BUY": 0.82,
      "SELL": 0.10,
      "HOLD": 0.08
    },
    "xgboost_analysis": {
      "action": "BUY",
      "confidence": 0.87,
      "probabilities": {
        "BUY": 0.87,
        "SELL": 0.08,
        "HOLD": 0.05
      }
    },
    "reasons": [
      "LSTM detectou padrão forte para BUY",
      "XGBoost confirma: BUY com 87% confiança",
      "Preço em zona Discount (Q1_DISCOUNT)",
      "Manipulação CRT detectada"
    ],
    "model_agreement": 0.95
  }
}
```

### **POST /train**
Treina modelos com dados históricos

```json
{
  "candles": [...],  // Muitas velas históricas
  "labels": [0, 1, 2, ...],  // 0=BUY, 1=SELL, 2=HOLD
  "indicators": {...},
  "crt": {...},
  "epochs": 50
}
```

### **POST /learn**
Aprende com resultado de trade

```json
{
  "trade_data": {
    "action": "BUY",
    "entry": 100,
    "exit": 105,
    ...
  },
  "was_successful": true
}
```

---

## 🎓 **TREINAMENTO**

### **Dados Necessários**
- Mínimo: 1000 velas históricas
- Ideal: 10,000+ velas
- Labels: 0=BUY, 1=SELL, 2=HOLD para cada vela

### **Processo**
1. LSTM treina com sequências de 60 velas
2. XGBoost treina com features combinadas
3. Modelos salvos em `ml-engine/models/`
4. Prontos para uso em produção

---

## 🔗 **INTEGRAÇÃO COM NODE.JS**

```javascript
// No seu código Node.js
const axios = require('axios');

async function getPrediction(candles, indicators, crt, market) {
    const response = await axios.post('http://localhost:5000/predict', {
        candles,
        indicators,
        crt_data: crt,
        market_context: market
    });
    
    return response.data.prediction;
}

// Usar na decisão de trade
const prediction = await getPrediction(...);

if (prediction.should_trade && prediction.confidence > 0.7) {
    console.log(`✅ ML Engine recomenda: ${prediction.action}`);
    console.log(`   Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
    console.log(`   Razões: ${prediction.reasons.join(', ')}`);
    
    // Executar trade
    executeTrade(prediction.action);
}
```

---

## 📊 **PERFORMANCE**

### **Métricas Esperadas**
- **Accuracy**: 70-85% (após treinamento)
- **Precision**: 75-90% (poucos falsos positivos)
- **Recall**: 65-80% (captura maioria das oportunidades)
- **F1-Score**: 70-85%

### **Vantagens do Sistema Híbrido**
1. **LSTM** captura padrões temporais que outros modelos perdem
2. **XGBoost** combina múltiplas fontes de informação
3. **Ensemble** reduz viés de modelo único
4. **Threshold** de 65% filtra trades de baixa confiança

---

## 🚀 **ROADMAP**

### **V1.0 - Atual**
- ✅ LSTM + XGBoost funcionando
- ✅ API Flask operacional
- ✅ Integração básica

### **V2.0 - Próximo**
- [ ] Aprendizado online (incremental)
- [ ] Múltiplos timeframes
- [ ] Auto-tuning de hiperparâmetros
- [ ] Dashboard de performance

### **V3.0 - Futuro**
- [ ] Reinforcement Learning
- [ ] Transformer models
- [ ] Multi-asset support

---

## 📝 **NOTAS IMPORTANTES**

1. **Primeiro Uso**: Modelos precisam ser treinados antes
2. **Dados**: Quanto mais dados históricos, melhor
3. **Hardware**: GPU acelera treinamento LSTM (opcional)
4. **Memória**: ~2GB RAM mínimo
5. **Python**: Versão 3.9+ recomendada

---

## 🆘 **TROUBLESHOOTING**

### **Erro: "Model not ready"**
- Execute treinamento primeiro via `/train`

### **Erro: "Out of memory"**
- Reduza `sequence_length` no LSTM
- Reduza `batch_size` no treinamento

### **Baixa accuracy**
- Mais dados de treinamento
- Mais epochs
- Verificar qualidade dos labels

---

## 📞 **SUPORTE**

Sistema desenvolvido por: **ADK Bot**  
Versão: **1.0.0**  
Data: **Janeiro 2026**

---

**🎯 O ML Engine está pronto para levar seu trading a outro nível!**
