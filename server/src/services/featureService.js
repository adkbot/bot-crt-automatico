const { Worker } = require('worker_threads');
const path = require('path');

class FeatureExtractionService {
    constructor() {
        this.worker = new Worker(path.join(__dirname, '../workers/featureWorker.js'));
        this.callbacks = new Map();
        this.messageId = 0;

        this.worker.on('message', (result) => {
            // Simple implementation: we just emit the latest result
            // In a real pool we would map IDs, but here we assume sequential processing for simplicity
            if (this.latestCallback) {
                this.latestCallback(result);
            }
        });

        this.worker.on('error', (err) => console.error('Worker error:', err));
    }

    analyze(candles, htfCandles = []) {
        return new Promise((resolve) => {
            this.latestCallback = resolve;
            this.worker.postMessage({ candles, htfCandles });
        });
    }
}

module.exports = new FeatureExtractionService();
