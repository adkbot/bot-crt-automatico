"""
🧠 LSTM Model - Memória Temporal para Trading
Sistema de memória de longo prazo que aprende padrões temporais
"""

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from sklearn.preprocessing import MinMaxScaler
import joblib
import os

class LSTMPredictor:
    def __init__(self, sequence_length=60, features=10):
        """
        Inicializa LSTM para predição de trading
        
        Args:
            sequence_length: Quantas velas passadas usar (60 = 1 hora em velas de 1min)
            features: Número de features por vela (OHLCV + indicadores)
        """
        self.sequence_length = sequence_length
        self.features = features
        self.model = None
        self.scaler = MinMaxScaler()
        self.is_trained = False
        
    def build_model(self):
        """
        Constrói arquitetura LSTM avançada
        """
        model = Sequential([
            # Primeira camada LSTM com muita memória
            LSTM(128, return_sequences=True, input_shape=(self.sequence_length, self.features)),
            Dropout(0.2),
            BatchNormalization(),
            
            # Segunda camada LSTM
            LSTM(64, return_sequences=True),
            Dropout(0.2),
            BatchNormalization(),
            
            # Terceira camada LSTM
            LSTM(32, return_sequences=False),
            Dropout(0.2),
            
            # Camadas densas para decisão
            Dense(32, activation='relu'),
            Dropout(0.2),
            Dense(16, activation='relu'),
            
            # Output: 3 neurônios (BUY, SELL, HOLD)
            Dense(3, activation='softmax')
        ])
        
        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        self.model = model
        print("✅ Modelo LSTM construído:")
        print(f"   Sequência: {self.sequence_length} velas")
        print(f"   Features: {self.features}")
        print(f"   Parâmetros: {model.count_params():,}")
        
        return model
    
    def prepare_data(self, candles_data, labels=None):
        """
        Prepara dados para LSTM
        
        Args:
            candles_data: Array de velas [n_samples, features]
            labels: array de labels (opcional, para treino)
        
        Returns:
            X, y normalizados e formatados
        """
        # Normalizar dados
        scaled_data = self.scaler.fit_transform(candles_data)
        
        # Criar sequências
        X = []
        y = []
        
        for i in range(self.sequence_length, len(scaled_data)):
            X.append(scaled_data[i-self.sequence_length:i])
            if labels is not None:
                y.append(labels[i])
        
        X = np.array(X)
        
        if labels is not None:
            y = np.array(y)
            return X, y
        
        return X
    
    def train(self, X_train, y_train, epochs=50, batch_size=32, validation_split=0.2):
        """
        Treina o modelo LSTM
        """
        if self.model is None:
            self.build_model()
        
        print(f"\n🎓 Iniciando treinamento LSTM...")
        print(f"   Samples: {len(X_train)}")
        print(f"   Epochs: {epochs}")
        print(f"   Batch size: {batch_size}")
        
        history = self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            verbose=1,
            callbacks=[
                keras.callbacks.EarlyStopping(
                    patience=10,
                    restore_best_weights=True
                ),
                keras.callbacks.ReduceLROnPlateau(
                    factor=0.5,
                    patience=5
                )
            ]
        )
        
        self.is_trained = True
        print("\n✅ Treinamento concluído!")
        print(f"   Acurácia final: {history.history['accuracy'][-1]*100:.2f}%")
        
        return history
    
    def predict(self, sequence):
        """
        Faz predição para uma sequência de velas
        
        Returns:
            dict com probabilidades {BUY, SELL, HOLD}
        """
        if not self.is_trained:
            raise Exception("❌ Modelo não treinado!")
        
        # Preparar entrada
        if len(sequence.shape) == 2:
            sequence = np.expand_dims(sequence, axis=0)
        
        # Predizer
        prediction = self.model.predict(sequence, verbose=0)[0]
        
        return {
            'BUY': float(prediction[0]),
            'SELL': float(prediction[1]),
            'HOLD': float(prediction[2]),
            'confidence': float(np.max(prediction)),
            'action': ['BUY', 'SELL', 'HOLD'][np.argmax(prediction)]
        }
    
    def save(self, path='models/lstm_model.h5'):
        """
        Salva modelo treinado
        """
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self.model.save(path)
        joblib.dump(self.scaler, path.replace('.h5', '_scaler.pkl'))
        print(f"✅ Modelo salvo: {path}")
    
    def load(self, path='models/lstm_model.h5'):
        """
        Carrega modelo treinado
        """
        if os.path.exists(path):
            self.model = keras.models.load_model(path)
            self.scaler = joblib.load(path.replace('.h5', '_scaler.pkl'))
            self.is_trained = True
            print(f"✅ Modelo carregado: {path}")
            return True
        return False

if __name__ == "__main__":
    # Teste do modelo
    print("🧪 Testando LSTM Model...")
    
    lstm = LSTMPredictor(sequence_length=60, features=10)
    lstm.build_model()
    
    # Criar dados sintéticos para teste
    dummy_data = np.random.rand(1000, 10)
    dummy_labels = np.eye(3)[np.random.choice(3, 1000)]
    
    X, y = lstm.prepare_data(dummy_data, dummy_labels)
    
    print(f"\n📊 Dados preparados:")
    print(f"   X shape: {X.shape}")
    print(f"   y shape: {y.shape}")
    
    # Treinar rapidamente
    lstm.train(X, y, epochs=5)
    
    # Testar predição
    test_sequence = X[0:1]
    prediction = lstm.predict(test_sequence)
    
    print(f"\n🎯 Predição de teste:")
    print(f"   Ação: {prediction['action']}")
    print(f"   Confidence: {prediction['confidence']*100:.2f}%")
    print(f"   BUY: {prediction['BUY']*100:.2f}%")
    print(f"   SELL: {prediction['SELL']*100:.2f}%")
    print(f"   HOLD: {prediction['HOLD']*100:.2f}%")
    
    print("\n✅ LSTM Model funcionando!")
