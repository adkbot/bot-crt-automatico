# 🧠 SISTEMA DE APRENDIZADO CONTÍNUO COM RECOMPENSA/PUNIÇÃO

## 📋 DESCRIÇÃO

Sistema avançado que faz a IA aprender **DE HORA EM HORA** com o YouTube, aplicando um sistema de **RECOMPENSA/PUNIÇÃO** baseado nos resultados dos trades.

---

## 🎯 FONTES DE APRENDIZADO

### **Canais Prioritários:**

1. **Novo Legacy** (Peso: 10.0)
   - https://www.youtube.com/@NovoLegacy
   - Foco: CRT, One Candle Strategy, PCC, Manipulation

2. **A Última Chave Oficial** (Peso: 8.5) ⭐ NOVO!
   - https://www.youtube.com/@aultimachaveoficial
   - Foco: **FUTUROS** (NÃO Forex!)
   - Metodologia: Setup 5:1, Price Action, Gestão de Risco

---

## ⚖️ SISTEMA DE PONTUAÇÃO

### ✅ **RECOMPENSA (Acerto/TP)**
```
+100 pontos
🎯 Aprende o padrão vencedor
💰 Meta: 5:1 ou mais (Risk/Reward)
```

### ❌ **PUNIÇÃO (Erro/SL)**
```
-500 pontos (SEVERA!)
🔍 Análise do que deu errado
📚 Ajusta estratégia
```

---

## ⏰ EXECUÇÃO AUTOMÁTICA

**Frequência:** A CADA HORA

### **O que acontece:**
1. 📺 Busca novos vídeos no YouTube
2. 🧠 Extrai conceitos e estratégias
3. 📊 Compara com performance real
4. ✅ Valida aprendizado
5. 💾 Salva conhecimento
6. 📢 **NOTIFICA** quando aprende algo novo

---

## 🚀 COMO USAR

### **1. Instalar dependência:**
```bash
cd server
pip install schedule
```

### **2. Iniciar sistema de aprendizado:**

**Opção A - Windows:**
```bash
start_learning.bat
```

**Opção B - Manual:**
```bash
cd server
python src/ai/continuousLearner.py
```

### **3. O sistema irá:**
- ✅ Executar imediatamente ao iniciar
- ⏰ Repetir a cada 1 hora automaticamente
- 📢 Mostrar notificações de progresso
- 💾 Salvar tudo em `rewards_punishments_log.json`

---

## 📊 NOTIFICAÇÕES

### **Quando ACERTA (TP):**
```
══════════════════════════════════════════════════════════════════════
🎯 ALVO ALCANÇADO!
💰 Meta de lucro buscada: 5:1 ou mais
💵 Valor alcançado nesta operação: $150.00
📊 Risk/Reward: 1:5.2
⭐ Pontos de recompensa: +100
🏆 META 5:1 ALCANÇADA! EXCELENTE!
══════════════════════════════════════════════════════════════════════
```

### **Quando ERRA (SL):**
```
══════════════════════════════════════════════════════════════════════
❌ STOP LOSS ATINGIDO
⚠️ PUNIÇÃO APLICADA: -500 pontos (SEVERA)
📉 Perda nesta operação: $30.00
🔍 Analisando o que deu errado...
══════════════════════════════════════════════════════════════════════
```

### **A cada hora (Aprendizado):**
```
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
🧠 SESSÃO DE APRENDIZADO #23
⏰ 15/01/2026 14:30:45
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

📺 Buscando novos vídeos no YouTube...

✅ Aprendizado concluído!
📹 Novos vídeos analisados: 3
💡 Novos conceitos aprendidos: 5
📊 Score atual: 1200

⏳ Próxima sessão em 1 hora...
```

---

## 📁 ARQUIVOS GERADOS

### `rewards_punishments_log.json`
```json
{
  "total_score": 1200,
  "wins": 15,
  "losses": 3,
  "sessions": 24,
  "history": [
    {
      "timestamp": "2026-01-15T14:30:00",
      "result": "WIN",
      "points": 100,
      "profit": 150.00,
      "total_score": 1200,
      "message": "✅ ACERTO! +100 pontos | Lucro: $150.00"
    }
  ]
}
```

---

## 🎯 OBJETIVOS DO SISTEMA

1. ✅ **Aprender continuamente** do YouTube
2. ✅ **Aplicar punição severa** em erros para forçar melhoria
3. ✅ **Recompensar acertos** para reforçar padrões vencedores
4. ✅ **Meta 5:1** em cada operação
5. ✅ **Notificar** a cada aprendizado
6. ✅ **Melhorar constantemente** a estratégia

---

## 📈 ESTATÍSTICAS

O sistema rastreia:
- 📊 **Score Total** (pontos acumulados)
- ✅ **Total de Wins**
- ❌ **Total de Losses**
- 🎓 **Sessões de Aprendizado**
- 📚 **Conceitos Aprendidos**
- 🎯 **Win Rate**

---

## ⚠️ IMPORTANTE

- A IA **NÃO** aprende Forex - Foco em **FUTUROS**
- Punição é **SEVERA** (-500 pontos) para forçar correção
- Meta mínima: **5:1 Risk/Reward**
- Sistema roda **24/7** automaticamente
- Notificações aparecem **no console do servidor**

---

## 🔄 FLUXO COMPLETO

```
Hora em Hora:
    ↓
1. Busca YouTube
    ↓
2. Analisa Vídeos
    ↓
3. Extrai Conceitos
    ↓
4. Valida com Performance
    ↓
5. Aprende Padrões
    ↓
6. Notifica Progresso
    ↓
(Repete a cada hora)

Trade Fecha:
    ↓
Se TP → +100 pontos + Notificação
Se SL → -500 pontos + Análise erro
```

---

## 🎊 RESULTADO ESPERADO

Com o tempo, a IA irá:
- ✅ Identificar os **melhores setups**
- ✅ Evitar **padrões perdedores**
- ✅ Buscar **sempre 5:1 ou mais**
- ✅ **Notificar** cada conquista
- ✅ Tornar-se **especialista** em CRT para Futuros

---

**🚀 SISTEMA PRONTO PARA RODAR 24/7!**
