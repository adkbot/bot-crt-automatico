"""
🚀 HYBRID ML ENGINE - LSTM + XGBoost
Sistema híbrido que combina memória temporal (LSTM) com decisão inteligente (XGBoost)
"""

import numpy as np
from lstm_model import LSTMPredictor
from xgboost_model import XGBoostDecider
import json
import os

class HybridMLEngine:
    def __init__(self):
        """
        Inicializa sistema híbrido
        """
        print("🚀 Inicializando Hybrid ML Engine...")
        
        # Modelos
        self.lstm = LSTMPredictor(sequence_length=60, features=10)
        self.xgboost = XGBoostDecider()
        
        # Estado
        self.is_ready = False
        self.training_history = []
        
        # Tentar carregar modelos salvos
        self.load_models()
    
    def load_models(self):
        """
        Carrega modelos pré-treinados se existirem
        """
        lstm_loaded = self.lstm.load('models/lstm_model.h5')
        xgb_loaded = self.xgboost.load('models/xgboost_model.json')
        
        if lstm_loaded and xgb_loaded:
            self.is_ready = True
            print("✅ Modelos carregados e prontos!")
        else:
            print("⚠️ Modelos não encontrados. Treinar antes de usar.")
    
    def prepare_lstm_input(self, candles):
        """
        Prepara input para LSTM
        
        Args:
            candles: Lista de velas com OHLCV + indicadores
        
        Returns:
            array formatado para LSTM
        """
        features = []
        
        for candle in candles:
            features.append([
                candle['open'],
                candle['high'],
                candle['low'],
                candle['close'],
                candle['volume'],
                candle.get('rsi', 50),
                candle.get('macd', 0),
                candle.get('bb_middle', candle['close']),
                candle.get('atr', 0),
                candle.get('volume_sma_ratio', 1)
            ])
        
        return np.array(features)
    
    def predict(self, candles, indicators, crt_data, market_context):
        """
        Faz predição híbrida completa
        
        Args:
            candles: Últimas 60+ velas
            indicators: Indicadores técnicos atuais
            crt_data: Dados CRT atuais
            market_context: Contexto de mercado
        
        Returns:
            dict com decisão final e análise completa
        """
        if not self.is_ready:
            raise Exception("❌ Modelos não estão prontos! Treine primeiro.")
        
        print("\n🧠 Iniciando predição híbrida...")
        
        # 1. LSTM: Analisa sequência temporal
        print("   1️⃣ LSTM analisando padrões temporais...")
        lstm_input = self.prepare_lstm_input(candles[-60:])
        lstm_input_scaled = self.lstm.scaler.transform(lstm_input)
        lstm_sequence = np.expand_dims(lstm_input_scaled, axis=0)
        
        lstm_prediction = self.lstm.predict(lstm_sequence)
        print(f"      LSTM sugere: {lstm_prediction['action']} ({lstm_prediction['confidence']*100:.1f}%)")
        
        # 2. XGBoost: Combina LSTM + features atuais
        print("   2️⃣ XGBoost combinando todas as informações...")
        xgb_features = self.xgboost.prepare_features(
            lstm_prediction,
            indicators,
            crt_data,
            market_context
        )
        
        xgb_prediction = self.xgboost.predict(xgb_features)
        print(f"      XGBoost decide: {xgb_prediction['action']} ({xgb_prediction['confidence']*100:.1f}%)")
        
        # 3. Decisão final
        final_decision = {
            'action': xgb_prediction['action'],
            'confidence': xgb_prediction['confidence'],
            'should_trade': xgb_prediction['should_trade'],
            
            # Detalhes
            'lstm_analysis': lstm_prediction,
            'xgboost_analysis': xgb_prediction,
            
            # Razões
            'reasons': self._generate_reasons(lstm_prediction, xgb_prediction, crt_data),
            
            # Métricas
            'model_agreement': self._calculate_agreement(lstm_prediction, xgb_prediction)
        }
        
        print(f"\n   ✅ Decisão Final: {final_decision['action']}")
        print(f"      Confidence: {final_decision['confidence']*100:.1f}%")
        print(f"      Executar: {'✅ SIM' if final_decision['should_trade'] else '❌ NÃO'}")
        
        return final_decision
    
    def _calculate_agreement(self, lstm_pred, xgb_pred):
        """
        Calcula concordância entre modelos
        """
        if lstm_pred['action'] == xgb_pred['action']:
            return 1.0  # 100% concordância
        
        # Concordância parcial baseada em probabilidades
        lstm_prob = lstm_pred[xgb_pred['action']]
        return float(lstm_prob)
    
    def _generate_reasons(self, lstm_pred, xgb_pred, crt_data):
        """
        Gera razões humanizadas para a decisão
        """
        reasons = []
        
        # Razão do LSTM
        if lstm_pred['confidence'] > 0.7:
            reasons.append(f"LSTM detectou padrão forte para {lstm_pred['action']}")
        
        # Razão do XGBoost
        if xgb_pred['should_trade']:
            reasons.append(f"XGBoost confirma: {xgb_pred['action']} com {xgb_pred['confidence']*100:.0f}% confiança")
        
        # Razões CRT
        if crt_data.get('manipulation_detected'):
            reasons.append("Manipulação CRT detectada")
        
        if crt_data.get('turtle_soup_detected'):
            reasons.append("Turtle Soup pattern identificado")
        
        quadrant = crt_data.get('quadrant', '')
        if 'DISCOUNT' in quadrant and xgb_pred['action'] == 'BUY':
            reasons.append(f"Preço em zona Discount ({quadrant})")
        elif 'PREMIUM' in quadrant and xgb_pred['action'] == 'SELL':
            reasons.append(f"Preço em zona Premium ({quadrant})")
        
        return reasons
    
    def train_from_history(self, historical_data, epochs_lstm=50, retrain_xgb=True):
        """
        Treina modelos com dados históricos
        
        Args:
            historical_data: dict com {
                'candles': lista de velas,
                'labels': lista de labels (0=BUY, 1=SELL, 2=HOLD),
                'indicators': indicadores por timestamp,
                'crt': dados CRT por timestamp
            }
        """
        print("\n🎓 Iniciando treinamento do sistema híbrido...")
        
        # 1. Treinar LSTM
        print("\n1️⃣ Treinando LSTM...")
        candles_array = self.prepare_lstm_input(historical_data['candles'])
        labels_lstm = np.eye(3)[historical_data['labels']]  # One-hot encoding
        
        X_lstm, y_lstm = self.lstm.prepare_data(candles_array, labels_lstm)
        lstm_history = self.lstm.train(X_lstm, y_lstm, epochs=epochs_lstm)
        
        # 2. Gerar features para XGBoost
        if retrain_xgb:
            print("\n2️⃣ Preparando dados para XGBoost...")
            X_xgb = []
            
            for i in range(len(X_lstm)):
                # Get LSTM prediction for this sequence
                lstm_pred = self.lstm.predict(X_lstm[i:i+1])
                
                # Get corresponding indicators and CRT
                idx = i + self.lstm.sequence_length
                indicators = historical_data['indicators'][idx]
                crt = historical_data['crt'][idx]
                market = historical_data.get('market_context', {})[idx]
                
                # Prepare features
                features = self.xgboost.prepare_features(
                    lstm_pred, indicators, crt, market
                )
                X_xgb.append(features[0])
            
            X_xgb = np.array(X_xgb)
            y_xgb = historical_data['labels'][self.lstm.sequence_length:]
            
            # 3. Treinar XGBoost
            print("\n3️⃣ Treinando XGBoost...")
            
            # Split train/val
            split = int(len(X_xgb) * 0.8)
            X_train = X_xgb[:split]
            y_train = y_xgb[:split]
            X_val = X_xgb[split:]
            y_val = y_xgb[split:]
            
            self.xgboost.train(X_train, y_train, X_val, y_val)
        
        # 4. Salvar modelos
        print("\n💾 Salvando modelos...")
        self.lstm.save()
        self.xgboost.save()
        
        self.is_ready = True
        
        print("\n✅ Sistema híbrido treinado com sucesso!")
        print("   LSTM + XGBoost juntos e otimizados!")
        
        return {
            'lstm_accuracy': lstm_history.history['accuracy'][-1],
            'status': 'trained',
            'ready': True
        }
    
    def learn_from_trade_result(self, trade_data, was_successful):
        """
        Aprende com resultado de um trade
        Atualiza modelos em tempo real
        """
        # Implementar aprendizado online (incremental)
        # Por enquanto, salva para próximo retreino
        self.training_history.append({
            'trade': trade_data,
            'success': was_successful,
            'timestamp': trade_data.get('timestamp')
        })
        
        # Se acumular muitos exemplos, retreinar
        if len(self.training_history) >= 100:
            print("📚 100 trades acumulados. Considere retreinar!")
    
    def get_stats(self):
        """
        Retorna estatísticas dos modelos
        """
        return {
            'ready': self.is_ready,
            'lstm_trained': self.lstm.is_trained,
            'xgboost_trained': self.xgboost.is_trained,
            'trades_learned': len(self.training_history),
            'model_size': {
                'lstm_params': self.lstm.model.count_params() if self.lstm.model else 0,
                'xgboost_trees': self.xgboost.model.n_estimators if self.xgboost.model else 0
            }
        }

if __name__ == "__main__":
    print("🧪 Testando Hybrid ML Engine...\n")
    
    engine = HybridMLEngine()
    
    # Testar predição (se modelos existirem)
    if engine.is_ready:
        # Dados de teste
        dummy_candles = [{
            'open': 100 + i*0.1,
            'high': 101 + i*0.1,
            'low': 99 + i*0.1,
            'close': 100.5 + i*0.1,
            'volume': 1000 + i*10,
            'rsi': 50 + i*0.5,
            'macd': 0.1 * i,
            'bb_middle': 100 + i*0.1,
            'atr': 1.5,
            'volume_sma_ratio': 1.0
        } for i in range(70)]
        
        indicators = {
            'rsi': 55,
            'macd': 0.5,
            'macd_signal': 0.3,
            'bb_upper': 105,
            'bb_middle': 100,
            'bb_lower': 95,
            'volume_sma_ratio': 1.2,
            'atr': 1.5,
            'adx': 25,
            'cci': 50
        }
        
        crt = {
            'pcc_distance': 0.02,
            'quadrant': 'Q1_DISCOUNT',
            'manipulation_detected': True,
            'turtle_soup_detected': False,
            'confidence': 0.75
        }
        
        market = {
            'trend': 'BULLISH',
            'volatility': 0.015,
            'volume_spike': 1.3,
            'time_of_day': 14
        }
        
        result = engine.predict(dummy_candles, indicators, crt, market)
        
        print("\n📊 Resultado completo:")
        print(json.dumps(result, indent=2))
    
    # Stats
    stats = engine.get_stats()
    print("\n📈 Estatísticas do sistema:")
    print(json.dumps(stats, indent=2))
    
    print("\n✅ Hybrid ML Engine funcionando!")
