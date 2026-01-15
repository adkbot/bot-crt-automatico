module.exports = {
    BINANCE_API_KEY: process.env.BINANCE_API_KEY || '',
    BINANCE_API_SECRET: process.env.BINANCE_API_SECRET || '',
    PORT: process.env.PORT || 3001,

    // --- 1. CONFIGURAÇÃO DO SISTEMA (PARÂMETROS RÍGIDOS) ---

    // 1.1 Seleção de Set de Timeframe
    // 'SET_1': Swing (D1/H1), 'SET_2': Day Trade (H4/M15), 'SET_3': Scalping (M15/M1)
    ACTIVE_SET: 'SET_3',

    TIMEFRAME_SETS: {
        SET_1: { PROFILE: 'SWING', HTF: '1d', LTF: '1h' },
        SET_2: { PROFILE: 'DAY_TRADE', HTF: '4h', LTF: '15m' },
        SET_3: { PROFILE: 'SCALPING', HTF: '15m', LTF: '1m' }
    },

    // 1.2 Filtro de Horário de Sessões (UTC)
    // O agente só busca NOVOS GATILHOS (Fase 3) nestas janelas.
    SESSION_FILTER_ENABLED: true,
    TRADING_SESSIONS: [
        { name: 'ASIA_OCEANIA', start: '00:00', end: '04:00' },
        { name: 'LONDON', start: '07:00', end: '10:00' },
        { name: 'NEW_YORK', start: '12:00', end: '16:00' }
    ],

    // --- 2. DEFINIÇÕES MATEMÁTICAS ---
    FRACTAL_LOOKBACK: 2, // 2 candles left, 2 candles right for Swing High/Low
    VOLUME_SMA_PERIOD: 20,
    VOLUME_SPIKE_THRESHOLD: 1.5, // 150% of SMA
    RISK_REWARD_RATIO: 2, // User requested standard 2R

    // --- 3. GESTÃO DE RISCO (RIGOROSA) ---
    MARGIN_MODE: 'ISOLATED',
    LEVERAGE: 10, // Alavancagem Fixa
    RISK_PER_TRADE_PCT: 0.01, // 1% do Equity
    STOP_LOSS_BUFFER_PCT: 0.0005, // 0.05% buffer
    SCORE_THRESHOLD: 70, // User requested > 70

    // --- 4. CONFIGURAÇÕES GERAIS ---
    // Analysis Config
    FVG_MAX_AGE_MINUTES: 120, // Depende do TF, mas para M15/M1 ok

    // System Config
    MICRO_BATCH_DELAY_MS: 150,
    WORKER_POOL_SIZE: 2,

    // Watchlist
    WATCH_LIST: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'TNSRUSDT'],

    // Rate limiting & concurrency
    MIN_TIME_BETWEEN_TRADES_MS: 10000,
    MAX_CONCURRENT_TRADES: 1, // Foco em precisão

    // Market state filters
    ATR_MIN_THRESHOLD: 5, // Ajustado para Scalping

    // Risk & sizing / daily limits
    MAX_TRADES_PER_DAY: 10, // Menos trades, mais qualidade
    TARGET_WINS: 5,
    TARGET_LOSSES: 3,
    STATE_FILE_PATH: './data/trading_state.json',

    // Cooldowns
    COOLDOWN_AFTER_LOSS_MS: 60000, // 1 min cooldown

    // Other flags
    ENABLE_STRICT_SCORE_GATE: true,
    AUTO_SWITCH_PAIR: true,
    TIMEZONE: 'UTC' // Sistema opera em UTC internamente para bater com as sessões
};
