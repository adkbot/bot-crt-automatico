-- ===================================
-- 🗄️ SUPABASE DATABASE SCHEMA
-- Sistema Completo de Trading CRT
-- ===================================

-- ===== 1. TABELA DE USUÁRIOS =====
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===== 2. TABELA DE CONFIGURAÇÕES =====
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) DEFAULT 'binance',
    binance_api_key TEXT,
    binance_api_secret TEXT,
    bybit_api_key TEXT,
    bybit_api_secret TEXT,
    trade_amount DECIMAL(20, 8) DEFAULT 100,
    leverage INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ===== 3. TABELA DE TRADES =====
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pair VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL, -- LONG ou SHORT
    entry_price DECIMAL(20, 8) NOT NULL,
    exit_price DECIMAL(20, 8),
    stop_loss DECIMAL(20, 8) NOT NULL,
    take_profit DECIMAL(20, 8) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    profit DECIMAL(20, 8),
    profit_percent DECIMAL(10, 4),
    exit_reason VARCHAR(50), -- TAKE_PROFIT, STOP_LOSS, MANUAL
    status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, CLOSED
    confidence DECIMAL(5, 4),
    entry_time TIMESTAMP NOT NULL,
    exit_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===== 4. TABELA DE ANÁLISES CRT =====
CREATE TABLE IF NOT EXISTS crt_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pair VARCHAR(20) NOT NULL,
    pcc DECIMAL(20, 8), -- Previous Candle Close
    h4_open DECIMAL(20, 8), -- 4H Open
    h4_close DECIMAL(20, 8), -- 4H Close
    h4_high DECIMAL(20, 8), -- 4H High
    h4_low DECIMAL(20, 8), -- 4H Low
    manipulation_type VARCHAR(20), -- BULLISH, BEARISH, NONE
    turtle_soup_type VARCHAR(20), -- LONG, SHORT, NONE
    phase VARCHAR(20), -- ACCUMULATION, MANIPULATION, DISTRIBUTION
    quadrant VARCHAR(20), -- PREMIUM, EQUILIBRIUM, DISCOUNT
    has_entry BOOLEAN DEFAULT FALSE,
    entry_type VARCHAR(20), -- LONG, SHORT
    timestamp TIMESTAMP DEFAULT NOW()
);

-- ===== 5. TABELA DE OPORTUNIDADES CRT =====
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- "LONG CRT", "SHORT CRT"
    confidence INTEGER NOT NULL,
    detected_at TIMESTAMP DEFAULT NOW(),
    pair VARCHAR(20) NOT NULL,
    entry_price DECIMAL(20, 8),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===== 6. TABELA DE RELATÓRIOS DE APRENDIZADO =====
CREATE TABLE IF NOT EXISTS learning_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_number INTEGER NOT NULL,
    new_videos INTEGER DEFAULT 0,
    new_concepts INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    channel VARCHAR(100), -- "Novo Legacy", "A Última Chave"
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===== 7. TABELA DE VALIDAÇÕES CRT =====
CREATE TABLE IF NOT EXISTS crt_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pair VARCHAR(20) NOT NULL,
    total_errors INTEGER DEFAULT 0,
    total_corrections INTEGER DEFAULT 0,
    errors JSONB, -- Array de erros
    corrections JSONB, -- Array de correções
    status VARCHAR(20), -- VALID, CORRECTED
    timestamp TIMESTAMP DEFAULT NOW()
);

-- ===== 8. TABELA DE ESTATÍSTICAS =====
CREATE TABLE IF NOT EXISTS trading_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    total_profit DECIMAL(20, 8) DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- ===== 9. TABELA DE SALDOS =====
CREATE TABLE IF NOT EXISTS balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total DECIMAL(20, 8) NOT NULL,
    available DECIMAL(20, 8) NOT NULL,
    in_position DECIMAL(20, 8) DEFAULT 0,
    last_update TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===== 10. TABELA DE LOGS DO SISTEMA =====
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) NOT NULL, -- INFO, WARNING, ERROR
    message TEXT NOT NULL,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===== ÍNDICES PARA PERFORMANCE =====

-- Trades
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_pair ON trades(pair);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_entry_time ON trades(entry_time);

-- CRT Analysis
CREATE INDEX idx_crt_analysis_pair ON crt_analysis(pair);
CREATE INDEX idx_crt_analysis_timestamp ON crt_analysis(timestamp);

-- Opportunities
CREATE INDEX idx_opportunities_detected_at ON opportunities(detected_at);
CREATE INDEX idx_opportunities_pair ON opportunities(pair);

-- Learning Reports
CREATE INDEX idx_learning_reports_created_at ON learning_reports(created_at);

-- Validations
CREATE INDEX idx_crt_validations_pair ON crt_validations(pair);
CREATE INDEX idx_crt_validations_timestamp ON crt_validations(timestamp);

-- Stats
CREATE INDEX idx_trading_stats_user_id ON trading_stats(user_id);
CREATE INDEX idx_trading_stats_date ON trading_stats(date);

-- Balances
CREATE INDEX idx_balances_user_id ON balances(user_id);

-- System Logs
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- ===== FUNÇÕES ÚTEIS =====

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== ROW LEVEL SECURITY (RLS) =====

-- Habilitar RLS nas tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;

-- Políticas: Usuários só veem seus próprios dados
CREATE POLICY users_policy ON users
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY user_settings_policy ON user_settings
    FOR ALL USING (user_id IN (SELECT id FROM users WHERE user_id = auth.uid()::text));

CREATE POLICY trades_policy ON trades
    FOR ALL USING (user_id IN (SELECT id FROM users WHERE user_id = auth.uid()::text));

CREATE POLICY trading_stats_policy ON trading_stats
    FOR ALL USING (user_id IN (SELECT id FROM users WHERE user_id = auth.uid()::text));

CREATE POLICY balances_policy ON balances
    FOR ALL USING (user_id IN (SELECT id FROM users WHERE user_id = auth.uid()::text));

-- ===== FIM DO SCHEMA =====
