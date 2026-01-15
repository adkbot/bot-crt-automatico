# 🔍 DEBUG: Verificando Por Que Linhas Não Aparecem

## ❓ **PROBLEMA:**

Linhas CRT não estão aparecendo no gráfico!

---

## 🔧 **DEBUG ADICIONADO:**

Adicionei logs no console para ver o que está acontecendo.

### **Como verificar:**

1. **Abra o navegador** (http://localhost:3000)
2. **Aperte F12** para abrir DevTools
3. **Vá na aba "Console"**
4. **Procure por:**

```
🔥 CRT Debug: {
    totalCandles: 100,
    lastClosedTime: "17:59:00",
    startTime: 1768511940,
    pccValue: 95516.01
}

📊 PCC Data points: 2 [....]

✅ Desenhando PCC Line com 2 pontos
```

---

## ✅ **SE APARECER:**

```
✅ Desenhando PCC Line com X pontos
```

**Significa:** Os dados estão sendo criados corretamente!

**Problema pode ser:**
- Linhas muito curtas (só 2 pontos)
- Zoom do gráfico escondendo as linhas
- Cor das linhas igual ao fundo

---

## ❌ **SE APARECER:**

```
❌ Sem dados para PCC Line!
```

**Significa:** `pccData.length = 0`

**Causas possíveis:**
- `crt.pcc` é `null` ou `NaN`
- `candles` não tem velas suficientes
- `startTime` está errado

---

## 🎯 **VALORES ESPERADOS:**

```javascript
totalCandles: 100        // Pelo menos 100 velas
lastClosedTime: "HH:MM"  // Hora legível
startTime: 1768511940    // Timestamp unix
pccValue: 95516.01       // Número válido
```

**PCC Data points: 2 ou mais**
- Mínimo: 2 pontos (vela fechada + vela atual)
- Ideal: 2-5 pontos

---

## 🔄 **TESTAR AGORA:**

1. **Recarregue** a página (F5)
2. **Abra** Console (F12)
3. **Veja** os logs
4. **Me diga** o que aparece!

---

## 📝 **POSSÍVEIS PROBLEMAS:**

### **1. Sem PCC valor:**
```
pccValue: null  ❌
```
**Fix:** Backend não está enviando `crt.pcc`

### **2. Sem velas:**
```
totalCandles: 0  ❌
```
**Fix:** WebSocket não está recebendo velas

### **3. Sem pontos:**
```
PCC Data points: 0  ❌
```
**Fix:** Filtro está muito restritivo

---

**🔍 VERIFIQUE O CONSOLE E ME DIGA O QUE VÊ!**
