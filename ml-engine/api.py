"""
🌐 ML ENGINE API
API Flask para comunicação entre Node.js e ML Engine híbrido
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from hybrid_engine import HybridMLEngine
import numpy as np
import json

app = Flask(__name__)
CORS(app)

# Inicializar engine
engine = HybridMLEngine()

@app.route('/health', methods=['GET'])
def health():
    """
    Verifica saúde do sistema
    """
    stats = engine.get_stats()
    return jsonify({
        'status': 'healthy',
        'ready': stats['ready'],
        'models': stats
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Endpoint principal de predição
    
    Espera JSON:
    {
        "candles": [...],
        "indicators": {...},
        "crt_data": {...},
        "market_context": {...}
    }
    """
    try:
        data = request.get_json()
        
        if not engine.is_ready:
            return jsonify({
                'error': 'Model not ready. Train first.',
                'ready': False
            }), 503
        
        # Fazer predição
        result = engine.predict(
            candles=data['candles'],
            indicators=data['indicators'],
            crt_data=data['crt_data'],
            market_context=data['market_context']
        )
        
        return jsonify({
            'success': True,
            'prediction': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/train', methods=['POST'])
def train():
    """
    Treina modelos com dados históricos
    
    Espera JSON:
    {
        "candles": [...],
        "labels": [...],
        "indicators": {...},
        "crt": {...},
        "epochs": 50
    }
    """
    try:
        data = request.get_json()
        
        result = engine.train_from_history(
            historical_data={
                'candles': data['candles'],
                'labels': data['labels'],
                'indicators': data.get('indicators', {}),
                'crt': data.get('crt', {}),
                'market_context': data.get('market_context', {})
            },
            epochs_lstm=data.get('epochs', 50)
        )
        
        return jsonify({
            'success': True,
            'result': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/learn', methods=['POST'])
def learn_from_result():
    """
    Aprende com resultado de trade
    
    Espera JSON:
    {
        "trade_data": {...},
        "was_successful": true/false
    }
    """
    try:
        data = request.get_json()
        
        engine.learn_from_trade_result(
            trade_data=data['trade_data'],
            was_successful=data['was_successful']
        )
        
        return jsonify({
            'success': True,
            'message': 'Trade result recorded for learning'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/stats', methods=['GET'])
def stats():
    """
    Retorna estatísticas dos modelos
    """
    return jsonify(engine.get_stats())

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 ML ENGINE API")
    print("="*50)
    print("\nEndpoints disponíveis:")
    print("  GET  /health   - Verifica saúde do sistema")
    print("  POST /predict  - Faz predição híbrida")
    print("  POST /train    - Treina modelos")
    print("  POST /learn    - Aprende com resultado")
    print("  GET  /stats    - Estatísticas dos modelos")
    print("\n" + "="*50)
    print("\n🌐 Rodando em: http://localhost:5000")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
