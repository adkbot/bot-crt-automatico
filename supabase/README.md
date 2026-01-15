# 🗄️ SUPABASE DATABASE - GUIA COMPLETO

## 📊 TODAS AS TABELAS ORGANIZADAS

O sistema possui **10 tabelas** completamente organizadas e otimizadas:

---

## 📋 ESTRUTURA DO BANCO DE DADOS:

### **1. `users`** - Usuários do Sistema
```sql
- id (UUID)
- user_id (VARCHAR) - Único
- email (VARCHAR)
- created_at, updated_at
```

### **2. `user_settings`** - Configurações por Usuário
```sql
- id (UUID)
- user_id (UUID) → FK users
- exchange (binance/bybit)
- binance_api_key, binance_api_secret
- bybit_api_key, bybit_api_secret
- trade_amount (DECIMAL)
- leverage (INTEGER)
- created_at, updated_at
```

### **3. `trades`** - Operações de Trading
```sql
- id (UUID)
- user_id (UUID) → FK users
- pair (VARCHAR) - Ex: BTCUSDT
- type (LONG/SHORT)
- entry_price, exit_price
- stop_loss, take_profit
- quantity, profit, profit_percent
- exit_reason (TP/SL/MANUAL)
- status (OPEN/CLOSED)
- confidence
- entry_time, exit_time
```

### **4. `crt_analysis`** - Análises CRT
```sql
- id (UUID)
- pair (VARCHAR)
- pcc (DECIMAL) - Previous Candle Close
- h4_open, h4_close, h4_high, h4_low
- manipulation_type (BULLISH/BEARISH/NONE)
- turtle_soup_type (LONG/SHORT/NONE)
- phase (ACCUMULATION/MANIPULATION/DISTRIBUTION)
- quadrant (PREMIUM/EQUILIBRIUM/DISCOUNT)
- has_entry (BOOLEAN)
- entry_type (LONG/SHORT)
- timestamp
```

### **5. `opportunities`** - Oportunidades CRT Detectadas
```sql
- id (UUID)
- type (VARCHAR) - "LONG CRT", "SHORT CRT"
- confidence (INTEGER)
- detected_at (TIMESTAMP)
- pair (VARCHAR)
- entry_price (DECIMAL)
```

### **6. `learning_reports`** - Relatórios de Aprendizado IA
```sql
- id (UUID)
- session_number (INTEGER)
- new_videos (INTEGER)
- new_concepts (INTEGER)
- score (INTEGER)
- channel (VARCHAR) - "Novo Legacy", "A Última Chave"
- created_at
```

### **7. `crt_validations`** - Validações Automáticas
```sql
- id (UUID)
- pair (VARCHAR)
- total_errors (INTEGER)
- total_corrections (INTEGER)
- errors (JSONB) - Array de erros
- corrections (JSONB) - Array de correções
- status (VALID/CORRECTED)
- timestamp
```

### **8. `trading_stats`** - Estatísticas Diárias
```sql
- id (UUID)
- user_id (UUID) → FK users
- total_trades
- winning_trades, losing_trades
- total_profit
- win_rate
- date
```

### **9. `balances`** - Saldos dos Usuários
```sql
- id (UUID)
- user_id (UUID) → FK users
- total (DECIMAL)
- available (DECIMAL)
- in_position (DECIMAL)
- last_update
```

### **10. `system_logs`** - Logs do Sistema
```sql
- id (UUID)
- level (INFO/WARNING/ERROR)
- message (TEXT)
- data (JSONB)
- created_at
```

---

## 🚀 COMO CONFIGURAR:

### **1. Criar Projeto no Supabase:**
1. Acesse https://supabase.com
2. Crie um novo projeto
3. Anote a URL e API KEY

### **2. Executar Schema:**
1. Vá em SQL Editor no Supabase
2. Cole o conteúdo de `supabase/schema.sql`
3. Execute (RUN)
4. Todas as tabelas serão criadas automaticamente

### **3. Configurar Environment:**
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-aqui
SUPABASE_SERVICE_KEY=sua-service-key-aqui
```

---

## ✅ RECURSOS INCLUÍDOS:

### **Índices de Performance:**
- ✅ Todos os campos principais indexados
- ✅ Buscas rápidas por user_id, pair, timestamp
- ✅ Otimizado para queries frequentes

### **Row Level Security (RLS):**
- ✅ Usuários só veem seus próprios dados
- ✅ Políticas automáticas de segurança
- ✅ auth.uid() integrado

### **Triggers Automáticos:**
- ✅ `updated_at` atualiza automaticamente
- ✅ Funções PostgreSQL incluídas

---

## 📊 EXEMPLO DE USO:

### **Inserir Trade:**
```sql
INSERT INTO trades (
    user_id, pair, type, entry_price,
    stop_loss, take_profit, quantity,
    confidence, entry_time, status
) VALUES (
    'uuid-do-usuario',
    'BTCUSDT',
    'LONG',
    96500.00,
    96000.00,
    98000.00,
    0.01,
    0.85,
    NOW(),
    'OPEN'
);
```

### **Buscar Oportunidades:**
```sql
SELECT * FROM opportunities
WHERE pair = 'BTCUSDT'
AND detected_at >= NOW() - INTERVAL '4 hours'
ORDER BY detected_at DESC;
```

### **Estatísticas do Dia:**
```sql
SELECT * FROM trading_stats
WHERE user_id = 'uuid-do-usuario'
AND date = CURRENT_DATE;
```

---

## 🔧 MANUTENÇÃO:

### **Limpar Dados Antigos:**
```sql
-- Deletar análises antigas (> 7 dias)
DELETE FROM crt_analysis
WHERE timestamp < NOW() - INTERVAL '7 days';

-- Deletar logs antigos (> 30 dias)
DELETE FROM system_logs
WHERE created_at < NOW() - INTERVAL '30 days';
```

### **Backup:**
```bash
# Via Supabase Dashboard → Database → Backups
# Ou usar pg_dump:
pg_dump -h db.xxxx.supabase.co -U postgres -d postgres > backup.sql
```

---

## 📈 MONITORAMENTO:

### **Dashboard do Supabase:**
- Table Editor - Ver/editar dados
- SQL Editor - Executar queries
- Database - Monitorar performance
- Logs - Ver logs em tempo real

---

## 🎯 TABELAS POR FUNCIONALIDADE:

### **Autenticação & Configuração:**
- `users`
- `user_settings`

### **Trading:**
- `trades`
- `balances`
- `trading_stats`

### **CRT Sistema:**
- `crt_analysis`
- `opportunities`
- `crt_validations`

### **IA & Aprendizado:**
- `learning_reports`

### **Sistema:**
- `system_logs`

---

**🗄️ BANCO DE DADOS 100% ORGANIZADO!**
