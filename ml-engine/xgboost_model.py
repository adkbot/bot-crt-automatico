"""
⚡ XGBoost Model - Decisão Final de Trading
Sistema de gradient boosting que combina LSTM + Indicadores + CRT
"""

import numpy as np
import xgboost as xgb
from sklearn.preprocessing import StandardScaler
import joblib
import os

class XGBoostDecider:
    def __init__(self):
        """
        Inicializa XGBoost para decisão final de trading
        """
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.feature_importance = None
        
    def build_model(self):
        """
        Constrói modelo XGBoost otimizado para trading
        """
        self.model = xgb.XGBClassifier(
            # Hiperparâmetros otimizados
            max_depth=8,
            learning_rate=0.1,
            n_estimators=200,
            min_child_weight=3,
            gamma=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            
            # Trading específico
            objective='multi:softprob',  # 3 classes: BUY, SELL, HOLD
            num_class=3,
            
            # Performance
            tree_method='hist',
            random_state=42,
            n_jobs=-1
        )
        
        print("✅ Modelo XGBoost construído:")
        print(f"   Max depth: 8")
        print(f"   Estimators: 200")
        print(f"   Classes: 3 (BUY, SELL, HOLD)")
        
        return self.model
    
    def prepare_features(self, lstm_prediction, indicators, crt_data, market_context):
        """
        Combina todas as features para decisão
        
        Args:
            lstm_prediction: dict com probabilidades do LSTM
            indicators: dict com indicadores técnicos
            crt_data: dict com dados CRT
            market_context: dict com contexto de mercado
        
        Returns:
            array de features normalizado
        """
        features = []
        
        # 1. Features do LSTM (3)
        features.extend([
            lstm_prediction.get('BUY', 0),
            lstm_prediction.get('SELL', 0),
            lstm_prediction.get('HOLD', 0)
        ])
        
        # 2. Indicadores Técnicos (10)
        features.extend([
            indicators.get('rsi', 50) / 100,  # Normalizado
            indicators.get('macd', 0) / 100,
            indicators.get('macd_signal', 0) / 100,
            indicators.get('bb_upper', 0),
            indicators.get('bb_middle', 0),
            indicators.get('bb_lower', 0),
            indicators.get('volume_sma_ratio', 1),
            indicators.get('atr', 0),
            indicators.get('adx', 0) / 100,
            indicators.get('cci', 0) / 100
        ])
        
        # 3. CRT Data (8)
        features.extend([
            crt_data.get('pcc_distance', 0),
            1 if crt_data.get('quadrant') == 'Q1_DISCOUNT' else 0,
            1 if crt_data.get('quadrant') == 'Q2_DISCOUNT' else 0,
            1 if crt_data.get('quadrant') == 'Q3_PREMIUM' else 0,
            1 if crt_data.get('quadrant') == 'Q4_PREMIUM' else 0,
            1 if crt_data.get('manipulation_detected') else 0,
            1 if crt_data.get('turtle_soup_detected') else 0,
            crt_data.get('confidence', 0)
        ])
        
        # 4. Market Context (5)
        features.extend([
            1 if market_context.get('trend') == 'BULLISH' else 0,
            1 if market_context.get('trend') == 'BEARISH' else 0,
            market_context.get('volatility', 0),
            market_context.get('volume_spike', 0),
            market_context.get('time_of_day', 12) / 24  # Normalizado
        ])
        
        return np.array([features])
    
    def train(self, X_train, y_train, X_val=None, y_val=None):
        """
        Treina o modelo XGBoost
        """
        if self.model is None:
            self.build_model()
        
        print(f"\n⚡ Iniciando treinamento XGBoost...")
        print(f"   Samples: {len(X_train)}")
        print(f"   Features: {X_train.shape[1]}")
        
        # Normalizar features
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        # Preparar dados de validação
        eval_set = None
        if X_val is not None and y_val is not None:
            X_val_scaled = self.scaler.transform(X_val)
            eval_set = [(X_val_scaled, y_val)]
        
        # Treinar
        self.model.fit(
            X_train_scaled, y_train,
            eval_set=eval_set,
            verbose=True
        )
        
        # Calcular importância das features
        self.feature_importance = self.model.feature_importances_
        
        self.is_trained = True
        print("\n✅ Treinamento XGBoost concluído!")
        
        # Mostrar top 5 features mais importantes
        top_indices = np.argsort(self.feature_importance)[-5:][::-1]
        print("\n📊 Top 5 Features mais importantes:")
        for i, idx in enumerate(top_indices, 1):
            print(f"   {i}. Feature {idx}: {self.feature_importance[idx]:.4f}")
        
        return self.model
    
    def predict(self, features):
        """
        Faz predição final
        
        Returns:
            dict com decisão e probabilidades
        """
        if not self.is_trained:
            raise Exception("❌ Modelo XGBoost não treinado!")
        
        # Normalizar
        features_scaled = self.scaler.transform(features)
        
        # Predizer
        probabilities = self.model.predict_proba(features_scaled)[0]
        prediction = self.model.predict(features_scaled)[0]
        
        actions = ['BUY', 'SELL', 'HOLD']
        
        return {
            'action': actions[prediction],
            'confidence': float(np.max(probabilities)),
            'probabilities': {
                'BUY': float(probabilities[0]),
                'SELL': float(probabilities[1]),
                'HOLD': float(probabilities[2])
            },
            'should_trade': np.max(probabilities) > 0.65  # Só trade se > 65% confiança
        }
    
    def save(self, path='models/xgboost_model.json'):
        """
        Salva modelo treinado
        """
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self.model.save_model(path)
        joblib.dump(self.scaler, path.replace('.json', '_scaler.pkl'))
        joblib.dump(self.feature_importance, path.replace('.json', '_importance.pkl'))
        print(f"✅ Modelo XGBoost salvo: {path}")
    
    def load(self, path='models/xgboost_model.json'):
        """
        Carrega modelo treinado
        """
        if os.path.exists(path):
            self.model = xgb.XGBClassifier()
            self.model.load_model(path)
            self.scaler = joblib.load(path.replace('.json', '_scaler.pkl'))
            self.feature_importance = joblib.load(path.replace('.json', '_importance.pkl'))
            self.is_trained = True
            print(f"✅ Modelo XGBoost carregado: {path}")
            return True
        return False

if __name__ == "__main__":
    # Teste do modelo
    print("🧪 Testando XGBoost Model...")
    
    xgb_model = XGBoostDecider()
    xgb_model.build_model()
    
    # Criar dados sintéticos (26 features)
    dummy_X = np.random.rand(1000, 26)
    dummy_y = np.random.choice(3, 1000)
    
    # Treinar rapidamente
    xgb_model.train(dummy_X, dummy_y)
    
    # Testar predição
    test_features = dummy_X[0:1]
    prediction = xgb_model.predict(test_features)
    
    print(f"\n🎯 Predição de teste:")
    print(f"   Ação: {prediction['action']}")
    print(f"   Confidence: {prediction['confidence']*100:.2f}%")
    print(f"   Should trade: {'✅' if prediction['should_trade'] else '❌'}")
    print(f"   Probabilidades:")
    for action, prob in prediction['probabilities'].items():
        print(f"      {action}: {prob*100:.2f}%")
    
    print("\n✅ XGBoost Model funcionando!")
