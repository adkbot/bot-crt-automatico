const config = require('../config');

class MarketScanner {
    constructor(client) {
        this.client = client;
        this.blackList = ['USDCUSDT', 'TUSDUSDT', 'FDUSDUSDT', 'USDPUSDT', 'EURUSDT', 'BUSDUSDT'];
        this.lastScanTime = 0;
        this.cachedResults = [];
        this.SCAN_INTERVAL = 60000; // 1 minute cache
    }

    async getTopPairs() {
        const now = Date.now();
        if (now - this.lastScanTime < this.SCAN_INTERVAL && this.cachedResults.length > 0) {
            return this.cachedResults;
        }

        try {
            // 1. Get 24h stats for all pairs
            const allStats = await this.client.dailyStats();

            // 2. Filter and Sort
            const candidates = allStats.filter(ticker => {
                const symbol = ticker.symbol;

                // Must be USDT pair
                if (!symbol.endsWith('USDT')) return false;

                // Filter out stablecoins and blacklist
                if (this.blackList.includes(symbol)) return false;
                if (symbol.includes('UP') || symbol.includes('DOWN') || symbol.includes('BEAR') || symbol.includes('BULL')) return false;

                // Min Volume (e.g. 10M USDT)
                const quoteVol = parseFloat(ticker.quoteVolume);
                if (quoteVol < 10000000) return false;

                return true;
            });

            // 3. Calculate Score for each candidate (Volatility + Volume)
            // We want high volatility (high/low diff or price change) and high volume
            const scored = candidates.map(t => {
                const change = Math.abs(parseFloat(t.priceChangePercent));
                const vol = parseFloat(t.quoteVolume);

                // Simple score: Change %
                // You could weight volume too, but usually we just want "movers" that have enough liquidity
                return {
                    symbol: t.symbol,
                    price: parseFloat(t.lastPrice),
                    change24h: parseFloat(t.priceChangePercent),
                    volume: vol,
                    high: parseFloat(t.highPrice),
                    low: parseFloat(t.lowPrice),
                    // "Lateral" check proxy: if change is very small (< 1%), it might be lateral or dead
                    isLateral: change < 1.5
                };
            });

            // 4. Filter out lateral markets and Sort by Volatility (Change %)
            const active = scored.filter(s => !s.isLateral);
            active.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));

            // 5. Take top 10
            this.cachedResults = active.slice(0, 10);
            this.lastScanTime = now;

            console.log(`Scanner updated: Top pair ${this.cachedResults[0]?.symbol} (${this.cachedResults[0]?.change24h}%)`);
            return this.cachedResults;

        } catch (error) {
            console.error("Scanner Error:", error);
            return this.cachedResults; // Return stale data on error
        }
    }

    // Optional: Check if a specific pair is still "good"
    async isPairHealthy(pair) {
        const top = await this.getTopPairs();
        return top.find(p => p.symbol === pair) !== undefined;
    }
}

module.exports = MarketScanner;
