import React, { useState, useEffect } from 'react';
import { Calculator, Activity, Lock, Unlock } from 'lucide-react';

const PernadaWidget = ({ data, activePair }) => {
    const [holdMode, setHoldMode] = useState(false);
    const [calcInputs, setCalcInputs] = useState({
        margin: 15,
        leverage: 20,
        entry: 0,
        tp: 0
    });
    const [calcResult, setCalcResult] = useState({ notional: 0, profit: 0 });

    // Update inputs when data changes (optional auto-fill)
    useEffect(() => {
        if (data && data.currentPrice) {
            setCalcInputs(prev => ({ ...prev, entry: data.currentPrice }));
        }
    }, [data]);

    useEffect(() => {
        const notional = calcInputs.margin * calcInputs.leverage;
        const pts = Math.abs(calcInputs.entry - calcInputs.tp);
        const profit = calcInputs.entry > 0 ? notional * (pts / calcInputs.entry) : 0;
        setCalcResult({ notional, profit });
    }, [calcInputs]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCalcInputs(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const score = data?.metadata?.score || 0;
    const momentumRate = data?.advanced?.momentumRate || 0;
    const volRel = data?.advanced?.volRel || 0;
    const predictedTPPoints = data?.metadata?.predictedExtension || 0;
    const signal = data?.metadata?.type === 'PERNADA' ? 'PERNADA CONFIRMED' : 'AGUARDANDO';

    return (
        <div className="bg-[#071025] p-4 rounded-xl border border-gray-800 font-sans text-[#e6eef8] shadow-lg">
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                <h3 className="text-[#5efcb0] font-bold flex items-center gap-2">
                    <Activity size={18} /> PERNADA STATUS <span className="text-xs text-gray-500 ml-2">[{activePair}]</span>
                </h3>
                <span className={`text-xs font-bold px-2 py-1 rounded ${signal === 'PERNADA CONFIRMED' ? 'bg-[#00ff9d] text-black animate-pulse' : 'bg-gray-700 text-gray-400'}`}>
                    {signal}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Metrics */}
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Score:</span>
                        <b className={`${score >= 70 ? 'text-[#00ff9d]' : 'text-gray-300'}`}>{score.toFixed(0)}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Momentum Rate:</span>
                        <b>{momentumRate.toFixed(2)}</b>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Vol Rel:</span>
                        <b>{volRel.toFixed(2)}</b>
                    </div>
                    <div className="flex justify-between border-t border-gray-800 pt-2 mt-2">
                        <span className="text-gray-400">Predicted TP (pts):</span>
                        <b className="text-yellow-400">{predictedTPPoints.toFixed(0)}</b>
                    </div>

                    <button
                        onClick={() => setHoldMode(!holdMode)}
                        className={`w-full mt-3 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors ${holdMode ? 'bg-[#ff0055] text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                        {holdMode ? <Lock size={14} /> : <Unlock size={14} />}
                        {holdMode ? 'Manter até Reversão: ON' : 'Manter até Reversão: OFF'}
                    </button>
                </div>

                {/* Calculator */}
                <div className="bg-[#0a0b1e] p-3 rounded border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                            <Calculator size={14} /> CALCULADORA ({activePair})
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                            <label className="text-[10px] text-gray-500 block">Margem ($)</label>
                            <input name="margin" value={calcInputs.margin} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 block">Alavancagem</label>
                            <input name="leverage" value={calcInputs.leverage} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 block">Entrada</label>
                            <input name="entry" value={calcInputs.entry} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 block">TP Alvo</label>
                            <input name="tp" value={calcInputs.tp} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" />
                        </div>
                    </div>
                    <div className="text-[10px] text-center border-t border-gray-700 pt-2">
                        <div className="text-gray-400">Resultado Estimado</div>
                        <div className="text-[#00ff9d] font-bold text-sm">
                            +${calcResult.profit.toFixed(2)} <span className="text-gray-600 text-[10px]">({calcResult.notional.toFixed(0)} Notional)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PernadaWidget;
