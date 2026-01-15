# 🚀 AI TRADING SYSTEM CRT v3.0

Sistema completo de trading usando **CRT (Candle Range Theory)** com IA que aprende do YouTube!

---

## 🎯 **O QUE É CRT?**

**Candle Range Theory** é uma técnica de trading baseada na anatomia da vela de 4H:

### **Fases da Vela:**
1. **Consolidação** - Preço abre e rangeia
2. **Manipulação** - Movimento contra tendência (cria o pavio) ← **ZONA DE ENTRADA!**
3. **Distribuição** - Movimento impulsivo real
4. **Exaustão** - Vela se prepara para fechar

### **Conceito Principal: PCC (Previous Candle Close)**
- **O PONTO MAIS IMPORTANTE!**
- PCC = Fechamento da vela de 4H anterior
- Preço ABAIXO do PCC (bullish) → COMPRA
- Preço ACIMA do PCC (bearish) → VENDA

---

## 🧠 **SISTEMA DE IA QUE APRENDE DO YOUTUBE**

### **Como Funciona:**
1. 🔍 Busca automaticamente vídeos sobre CRT no YouTube
2. 📝 Extrai transcrições/legendas dos vídeos
3. 🧩 Identifica conceitos (PCC, Manipulation, Turtle Soup, etc.)
4. 💾 **Salva conhecimento permanentemente** (nunca esquece!)
5. 🔄 Atualiza estratégia continuamente

### **Configurar YouTube Learning:**

1. **Obter API Key do YouTube:**
   - Acesse: https://console.cloud.google.com/
   - Crie um projeto
   - Ative "YouTube Data API v3"
   - Crie credenciais (API Key)

2. **Instalar Python (se não tiver):**
   ```bash
   # Download: https://www.python.org/downloads/
   ```

3. **Instalar dependências:**
   ```bash
   cd server
   pip install -r requirements.txt
   ```

4. **Configurar API Key:**
   Adicione no `.env`:
   ```env
   YOUTUBE_API_KEY=sua_api_key_aqui
   ```

5. **Atualizar conhecimento:**
   ```bash
   python src/ai/youtubeLearner.py
   ```

---

## 📊 **MUDANÇAS DO SISTEMA**

### **Análise CRT (NÃO é mais SMC!):**

**Marcações no Gráfico:**
- ✅ **Linha PCC** (verde/vermelha) - Referência principal
- ✅ **Quadrantes Fibonacci** (25%, 50%, 75%)
- ✅ **Zona de Manipulação** (highlight quando preço cruza PCC)
- ✅ **FVG** (Fair Value Gaps) no timeframe menor
- ✅ **Turtle Soup** (captura de liquidez)
- ✅ **Overlay da vela 4H** no gráfico de 1m

**Detecções:**
- PCC (Previous Candle Close)
- Fase atual (Consolidation/Manipulation/Distribution/Exhaustion)
- Manipulação (quando cruza PCC)
- Turtle Soup (reversão após captura de liquidez)
- FVG (gaps de valor justo)
- Quadrante atual (Q1-Q4)

---

## ⚙️ **CONFIGURAÇÃO**

### **Timeframes Recomendados:**
- **Vela de referência**: 4H (four hour)
- **Execução**: 1m ou 5m
- **Overlay**: Vela de 4H no gráfico de 1m

### **Horário Ideal:**
- **09:00 - 11:00 EST** (Sessão de Nova York)
- Maior volatilidade

### **Ativos Recomendados:**
- **Ouro** (XAUUSD) - Muito impulsivo
- **NASDAQ** (NAS100) - Muito impulsivo
- **Bitcoin** (BTCUSDT) ou **Ethereum** (ETHUSDT)

---

## 🎓 **COMO A IA APRENDE**

### **Base de Conhecimento (knowledge_base.json):**
```json
{
  "videos_analyzed": ["videoID1", "videoID2", ...],
  "concepts": {
    "PCC": [
      {
        "video": "Título do vídeo",
        "context": "...explicação do conceito...",
        "source": "Canal"
      }
    ],
    "Manipulation": [...],
    "Turtle Soup": [...]
  },
  "last_update": "2026-01-14T22:00:00"
}
```

### **Processo de Aprendizado:**
1. Sistema busca termos: "CRT trading", "One candle strategy", etc.
2. Para cada vídeo encontrado:
   - Extrai transcrição
   - Procura palavras-chave (PCC, Manipulation, FVG, etc.)
   - Salva contexto e explicação
3. Compila estratégia baseada em TODOS os vídeos
4. **Nunca esquece** - conhecimento acumulativo!

### **Atualização Automática:**
O sistema pode rodar periodicamente (ex: 1x por semana) para:
- Buscar novos vídeos
- Aprender novos conceitos
- Refinar estratégia

---

## 🔧 **INSTALAÇÃO E USO**

### **1. Backend**
```bash
cd server
npm install
pip install -r requirements.txt  # Para YouTube Learning

# Configurar .env
BINANCE_API_KEY=sua_chave
BINANCE_API_SECRET=sua_secret
YOUTUBE_API_KEY=sua_youtube_api

npm start
```

### **2. Frontend**
```bash
cd client
npm install
npm run dev
```

### **3. Atualizar Conhecimento IA**
```bash
cd server
python src/ai/youtubeLearner.py
```

---

## 📈 **ESTRATÉGIA DE ENTRADA CRT**

### **Setup Ideal:**
1. ✅ Vela de 4H define tendência (bullish ou bearish)
2. ✅ Aguardar preço criar **manipulação** (cruzar PCC)
3. ✅ No timeframe de 1m, procurar:
   - FVG (Fair Value Gap)
   - Turtle Soup (captura de liquidez)
   - Preço voltar para dentro da vela 4H
4. ✅ Entrar na direção da distribuição

### **Gestão de Risco:**
- **Stop Loss**: Abaixo/acima do pavio de manipulação
- **Take Profit**: Quadrante 75% (premium/discount)
- **Risk/Reward**: Mínimo 1:2

---

## 🎯 **DIFERENÇAS: CRT vs SMC**

| Aspecto | SMC (Antigo) | CRT (Novo) |
|---------|--------------|------------|
| Foco | Order Blocks, BOS/CHOCH | Anatomia da vela 4H |
| Referência | Estrutura de mercado | **PCC** (Previous Candle Close) |
| Timeframe | Vários | **4H fixo** + 1m para entrada |
| Entrada | Quebra de estrutura | **Manipulação no PCC** |
| Padrão chave | Order Blocks | **Turtle Soup** |

---

## 🚀 **PRÓXIMOS PASSOS**

1. ✅ Configure YouTube API
2. ✅ Rode `python youtubeLearner.py` para primeira atualização
3. ✅ Revise `knowledge_base.json` gerado
4. ✅ Inicie servidor com `npm start`
5. ✅ Observe marcações CRT no gráfico
6. ✅ Atualize conhecimento semanalmente

---

## 📚 **RECURSOS**

- **Vídeo Original CRT**: https://youtu.be/lkfEz0KuQYs
- **YouTube Data API**: https://console.cloud.google.com/
- **Documentação Python**: https://www.python.org/

---

## ⚠️ **IMPORTANTE**

- Sistema usa **CRT**, não SMC!
- IA **nunca esquece** o que aprende
- Base de conhecimento cresce com o tempo
- Python oferece mais profundidade que JavaScript
- Atualizar conhecimento regularmente para melhores resultados

---

**Desenvolvido com ❤️ usando Node.js + Python**
