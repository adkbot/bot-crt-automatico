# ADKBOT System - Update Guide (v2.1)

## New Features

### 1. Advanced Chart Visualizations
The frontend chart now displays detailed market structure analysis, similar to TradingView:
*   **Swing Highs (SH) / Swing Lows (SL):** Visualized with Red (Down) and Green (Up) arrows.
*   **Break of Structure (BOS) / Change of Character (CHoCH):** Dashed lines indicating where price has broken significant structure levels.
*   **Order Blocks (OB):** Zones marked with lines indicating potential support (Bullish OB) or resistance (Bearish OB).
*   **Liquidity Sweeps:** Specific lines marking where liquidity has been swept.
*   **FVG / IFVG:** Fair Value Gaps and Inversion FVGs are colored and labeled.

### 2. Profit Protection Mechanism
A new safety layer has been added to the Trailing Stop logic:
*   **Trigger:** When the trade reaches **0.8R** (0.8 times the risk).
*   **Action:** The Stop Loss is automatically moved to protect **50% of the current profit**.
*   **Logic:** `New SL = Entry + (Current Price - Entry) * 0.5` (for Longs).
*   **Integration:** This works in tandem with the "Prev-Open Trailing" logic. The bot will always respect the "Prev-Open" stop unless the "Profit Protection" stop is tighter (more profitable), in which case it takes precedence.

### 3. Frontend Auto-Switching
The frontend now intelligently follows the bot's activity. If the backend auto-switches to a new trading pair (e.g., from BTCUSDT to SOLUSDT) because of a better opportunity, the frontend chart will automatically switch to display that pair.

## Configuration Updates

### `server/src/config.js`
*   `SCORE_THRESHOLD`: Temporarily set to **40** (previously 85) to allow for easier testing and more frequent trade entries. **Remember to set this back to 80+ for production.**
*   `USE_PREV_OPEN_TRAILING`: Set to `true` to enable the candle-based trailing stop.

### `server/src/services/trailing_manager.js`
New configuration parameters (internal defaults):
*   `profitProtectionTriggerR`: 0.8
*   `profitProtectionPct`: 0.5

## How to Run & Test

### 1. Start the Server
```bash
cd server
npm run server
```

### 2. Start the Client
```bash
cd client
npm run dev
```

### 3. Verify in Replay Mode (Backend Only)
To test the logic without risking funds or waiting for live market moves:
```bash
cd server
node scripts/replay_runner.js
```
*   Watch the console output for:
    *   `STOP_SET initial (prevOpen)`: Confirms initial SL placement.
    *   `STOP_MOVED (reversal)`: Confirms Prev-Open Trailing logic.
    *   `🛡️ Profit Protection`: Confirms the new 50% profit guard logic.

## Troubleshooting
*   **Chart not updating?** Check if the WebSocket is connected (Green indicator in header).
*   **No trades taking?** Ensure `SCORE_THRESHOLD` is low enough (currently 40) and the market is active.
*   **Visuals missing?** Ensure you are on the correct timeframe (1m is default for high-frequency analysis).
