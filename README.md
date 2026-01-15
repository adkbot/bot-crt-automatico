# 🤖 AI TRADING SYSTEM - Sistema Completo de Trading com IA

Sistema profissional de trading que analisa o mercado em **tempo real** usando **Inteligência Artificial** e técnicas de **Smart Money Concepts (SMC)**.

![Status](https://img.shields.io/badge/status-active-success.svg)
![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## 🌟 Características

### 🧠 **Inteligência Artificial**
- ✅ Aprende padrões do mercado automaticamente usando **Redes Neurais**
- ✅ Melhora as decisões ao longo do tempo com cada trade executado
- ✅ Sistema adaptativo que se ajusta às condições do mercado
- ✅ Treinamento automático a cada 10 novos trades

### 📊 **Análise Smart Money Concepts (SMC)**
- ✅ Detecção de **Break of Structure (BOS)** e **Change of Character (CHOCH)**
- ✅ Identificação de **Order Blocks (OB)** institucionais
- ✅ Detecção de **Fair Value Gaps (FVG)**
- ✅ Reconhecimento de **Liquidity Sweeps**
- ✅ Zonas **Premium/Discount** (Fibonacci)
- ✅ Viés de mercado automático (Bullish/Bearish/Neutral)

### 📈 **Gráfico Profissional**
- ✅ Gráfico de velas em tempo real usando **Lightweight Charts**
- ✅ **Marcações SMC visíveis** direto no gráfico
- ✅ Indicadores OHLC com variação percentual
- ✅ Legenda interativa com todos os padrões detectados
- ✅ Design moderno e responsivo

### 💹 **Dashboard Completo**
- ✅ **Saldo da carteira** com lucro/prejuízo em tempo real
- ✅ **Estatísticas detalhadas**: Win Rate, Total de Trades, Lucro Total
- ✅ **Operação atual** com entrada, SL, TP e confiança
- ✅ **Histórico de trades** com resultados
- ✅ **Status da IA** com progresso de aprendizado

### ⚙️ **Controles e Configurações**
- ✅ Seleção de **par** (BTCUSDT, ETHUSDT, etc.)
- ✅ Seleção de **timeframe** (1m, 5m, 15m, 1h, 4h, 1d)
- ✅ Toggle de **Auto-Trading** ON/OFF
- ✅ Fechamento manual de operações
- ✅ WebSocket em tempo real

---

## 🚀 Instalação e Configuração

### Pré-requisitos

- **Node.js** 16+ ([Download](https://nodejs.org/))
- **npm** ou **yarn**
- Conta na **Binance** com API Key ([Criar API](https://www.binance.com/en/my/settings/api-management))

### 1️⃣ Configurar Backend

```bash
# Navegar para a pasta do servidor
cd server

# Instalar dependências
npm install

# Criar arquivo .env
copy .env.example .env

# Editar .env com suas credenciais da Binance
notepad .env
```

**Edite o arquivo `.env`:**
```env
BINANCE_API_KEY=sua_api_key_aqui
BINANCE_API_SECRET=sua_api_secret_aqui
PORT=3001
MIN_CONFIDENCE=0.75
MAX_RISK_PER_TRADE=0.02
ENABLE_AUTO_TRADING=false
```

### 2️⃣ Configurar Frontend

```bash
# Navegar para a pasta do cliente
cd ../client

# Instalar dependências
npm install
```

---

## ▶️ Como Executar

### Iniciar o Sistema Completo

**Opção 1: Iniciar ambos manualmente**

```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend
cd client
npm run dev
```

**Opção 2: Script único (criar arquivo `start.bat` na raiz)**

```batch
@echo off
echo 🚀 Iniciando AI Trading System...

start cmd /k "cd server && npm start"
timeout /t 3 /nobreak >nul
start cmd /k "cd client && npm run dev"

echo ✅ Sistema iniciado!
echo 📡 Backend: http://localhost:3001
echo 🌐 Frontend: http://localhost:3000
```

### Acessar o Sistema

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

---

## 📖 Como Usar

### 1. **Iniciar o Sistema**
Execute o backend e frontend conforme as instruções acima.

### 2. **Configurar o Par e Timeframe**
- No header superior, selecione o **par** que deseja analisar (ex: BTCUSDT)
- Escolha o **timeframe** (recomendado: 1m ou 5m para testes)

### 3. **Ativar Auto-Trading (Opcional)**
- Clique no botão **"Auto Trading OFF"** para ativar
- O sistema começará a fazer entradas automaticamente quando detectar sinais de alta confiança
- ⚠️ **ATENÇÃO**: Comece com `ENABLE_AUTO_TRADING=false` no `.env` até entender o sistema

### 4. **Monitorar Análises**
- **Gráfico Central**: Veja as velas em tempo real com marcações SMC
- **Sidebar Esquerda**: Monitore saldo, estatísticas e operação atual
- **Sidebar Direita**: Veja sinais detectados, trades recentes e status da IA

### 5. **Aprendizado da IA**
- A IA precisa de **50 trades** para fazer o treinamento inicial
- Depois disso, ela retreina automaticamente a cada 10 trades
- Acompanhe o progresso no card **"Status da IA"**

### 6. **Fechar Operação Manualmente**
- Se houver uma operação ativa, clique em **"Fechar Manualmente"** no painel direito

---

## 🎯 Estratégia de Trading

### Como Funciona

1. **Análise Contínua**: O sistema analisa cada vela nova em tempo real
2. **Detecção de Padrões**: Identifica padrões SMC (BOS, OB, FVG, Sweeps)
3. **Cálculo de Indicadores**: RSI, MACD, Bollinger Bands, Volume
4. **Previsão da IA**: Combina tudo e prevê se deve entrar ou não
5. **Execução**: Se confiança > 75%, executa a operação automaticamente (se auto-trading estiver ativo)

### Lógica de Entrada

✅ **Sinal de Compra (LONG)** quando:
- BOS Bullish ou CHOCH Bullish confirmado
- Order Block Bullish presente
- FVG Bullish ou Liquidity Sweep Bullish
- RSI < 30 (sobrevenda)
- MACD positivo
- Confiança da IA > 75%

❌ **Sinal de Venda (SHORT)** quando:
- BOS Bearish ou CHOCH Bearish confirmado
- Order Block Bearish presente
- FVG Bearish ou Liquidity Sweep Bearish
- RSI > 70 (sobrecompra)
- MACD negativo
- Confiança da IA > 75%

### Gestão de Risco

- **Stop Loss**: Calculado automaticamente usando ATR (1.5x)
- **Take Profit**: Baseado no lucro esperado pela IA (mínimo 2%)
- **Risco por Trade**: Configurável no `.env` (padrão: 2% do saldo)

---

## 🔧 Configurações Avançadas

### Arquivo `.env` do Backend

```env
# API Binance
BINANCE_API_KEY=sua_api_key
BINANCE_API_SECRET=sua_secret

# Servidor
PORT=3001
NODE_ENV=development

# Trading
MIN_CONFIDENCE=0.75          # Confiança mínima para entrada (0-1)
MAX_RISK_PER_TRADE=0.02      # Risco máximo por trade (2%)
ENABLE_AUTO_TRADING=false    # Auto-trading ativo? (true/false)
```

### Ajustar Confiança Mínima

Para ser mais **conservador** (menos trades, mais precisão):
```env
MIN_CONFIDENCE=0.85  # 85% de confiança mínima
```

Para ser mais **agressivo** (mais trades, menos precisão):
```env
MIN_CONFIDENCE=0.65  # 65% de confiança mínima
```

---

## 📊 Estrutura do Projeto

```
binance-prediction-system/
├── server/                    # Backend Node.js
│   ├── src/
│   │   ├── ai/
│   │   │   └── marketLearner.js      # Rede Neural (Brain.js)
│   │   └── analysis/
│   │       └── smcAnalyzer.js        # Análise SMC
│   ├── index.js               # Servidor principal
│   ├── package.json
│   └── .env                   # Configurações (não commitar!)
│
├── client/                    # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx        # Dashboard do saldo
│   │   │   ├── TradingChart.jsx     # Gráfico profissional
│   │   │   ├── TradePanel.jsx       # Painel de trades
│   │   │   ├── ControlPanel.jsx     # Controles
│   │   │   └── AIStats.jsx          # Estatísticas da IA
│   │   ├── App.jsx            # App principal
│   │   ├── App.css
│   │   ├── index.css          # Design System
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md                  # Este arquivo
```

---

## 🛡️ Segurança

### ⚠️ **IMPORTANTE**

1. **NUNCA compartilhe** suas credenciais da Binance
2. **NUNCA commite** o arquivo `.env` no Git
3. **Use API Keys** com permissões limitadas (somente leitura + trading, sem saques)
4. **Teste primeiro** em modo paper trading ou com valores baixos
5. **Configure IP Whitelist** na Binance para sua API Key

### Configurar API Key na Binance

1. Acesse: https://www.binance.com/en/my/settings/api-management
2. Crie uma nova API Key
3. Marque apenas: **"Enable Reading"** e **"Enable Spot & Margin Trading"**
4. **NÃO marque**: "Enable Withdrawals"
5. Configure **IP Access Restriction** com seu IP
6. Copie API Key e Secret para o `.env`

---

## 🐛 Troubleshooting

### Erro: "Invalid Api-Key"
- Verifique se copiou corretamente a API Key e Secret
- Confirme que a API Key tem permissões de Trading habilitadas
- Teste em modo de leitura primeiro (`ENABLE_AUTO_TRADING=false`)

### Erro: "Cannot find module 'brain.js'"
```bash
cd server
npm install
```

### Frontend não conecta ao Backend
- Verifique se o backend está rodando na porta 3001
- Confirme que não há firewall bloqueando
- Tente: `curl http://localhost:3001/health`

### IA não está aprendendo
- A IA precisa de **50 trades** para o treinamento inicial
- Verifique se os trades estão sendo executados
- Acompanhe o progresso no card "Status da IA"

---

## 📈 Próximas Melhorias

- [ ] Backtesting histórico
- [ ] Múltiplos pares simultâneos
- [ ] Notificações via Telegram
- [ ] Gráfico TradingView oficial embed
- [ ] Export de relatórios PDF
- [ ] Modo paper trading integrado
- [ ] Otimização de hiperparâmetros da IA

---

##  Aviso Legal

⚠️ **Este sistema é para fins educacionais**. Trading de criptomoedas envolve **alto risco** e você pode perder todo seu capital investido.

- Não garanto lucros
- Use por sua conta e risco
- Teste extensivamente antes de usar com dinheiro real
- Comece com valores baixos

**Desenvolvedor não se responsabiliza por perdas financeiras.**

---

## 📝 Licença

MIT License - Sinta-se livre para usar e modificar!

---

## 👨‍💻 Suporte

Para dúvidas ou problemas:
1. Verifique este README completo
2. Revise os logs do console do backend
3. Teste com `ENABLE_AUTO_TRADING=false` primeiro

---

**Criado com ❤️ por um sistema de IA profissional**

🚀 **Bons trades!**
