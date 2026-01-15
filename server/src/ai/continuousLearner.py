"""
🎯 SISTEMA DE APRENDIZADO CONTÍNUO COM RECOMPENSA/PUNIÇÃO
Executa busca automática a cada hora e aplica sistema de gamificação

REGRAS:
✅ Acerto (TP) = +100 pontos de recompensa + Aprende padrão vencedor
❌ Erro  (SL) = -500 pontos (PUNIÇÃO SEVERA) + Análise do que deu errado
🎯 Meta: 5:1 ou mais (Risk/Reward)
📚 Notifica a cada aprendizado bem-sucedido
"""

import os
import sys
import json
import time
import schedule
from datetime import datetime

# Adicionar diretório pai ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai.youtubeLearner import AdvancedCRTLearner

class RewardPunishmentLearner:
    def __init__(self):
        self.learner = AdvancedCRTLearner()
        self.rewards_file = 'rewards_punishments_log.json'
        self.rewards_data = self.load_rewards()
        
        # Sistema de pontuação
        self.score = self.rewards_data.get('total_score', 0)
        self.wins = self.rewards_data.get('wins', 0)
        self.losses = self.rewards_data.get('losses', 0)
        self.learning_sessions = self.rewards_data.get('sessions', 0)
        
    def load_rewards(self):
        """Carrega dados de recompensas/punições"""
        if os.path.exists(self.rewards_file):
            with open(self.rewards_file, 'r') as f:
                return json.load(f)
        return {
            'total_score': 0,
            'wins': 0,
            'losses': 0,
            'sessions': 0,
            'history': []
        }
    
    def save_rewards(self):
        """Salva dados de recompensas"""
        self.rewards_data['total_score'] = self.score
        self.rewards_data['wins'] = self.wins
        self.rewards_data['losses'] = self.losses
        self.rewards_data['sessions'] = self.learning_sessions
        
        with open(self.rewards_file, 'w') as f:
            json.dump(self.rewards_data, f, indent=2)
    
    def apply_reward(self, trade_result, profit=0):
        """Aplica recompensa ou punição baseado no resultado do trade"""
        timestamp = datetime.now().isoformat()
        
        if trade_result == 'WIN':
            # ✅ RECOMPENSA POR ACERTO
            reward_points = 100
            self.score += reward_points
            self.wins += 1
            
            log_entry = {
                'timestamp': timestamp,
                'result': 'WIN',
                'points': reward_points,
                'profit': profit,
                'total_score': self.score,
                'message': f'✅ ACERTO! +{reward_points} pontos | Lucro: ${profit:.2f}'
            }
            
            # Notificação de sucesso
            self.notify_achievement(profit, reward_points)
            
        elif trade_result == 'LOSS':
            # ❌ PUNIÇÃO SEVERA POR ERRO
            punishment_points = -500
            self.score += punishment_points
            self.losses += 1
            
            log_entry = {
                'timestamp': timestamp,
                'result': 'LOSS',
                'points': punishment_points,
                'profit': profit,
                'total_score': self.score,
                'message': f'❌ ERRO! {punishment_points} pontos (PUNIÇÃO SEVERA) | Perda: ${profit:.2f}'
            }
            
            # Aprender com o erro
            print(f"\n{'='*70}")
            print(f"⚠️ PUNIÇÃO APLICADA: {punishment_points} pontos")
            print(f"📉 Score total: {self.score}")
            print(f"🔍 Analisando o que deu errado...")
            print(f"{'='*70}\n")
        
        # Adicionar ao histórico
        self.rewards_data['history'].append(log_entry)
        
        # Manter apenas últimos 100 registros
        if len(self.rewards_data['history']) > 100:
            self.rewards_data['history'] = self.rewards_data['history'][-100:]
        
        self.save_rewards()
        
        return log_entry
    
    def notify_achievement(self, profit, points):
        """Notifica quando a IA alcança meta de lucro"""
        print(f"\n{'='*70}")
        print(f"🎯 ALVO ALCANÇADO!")
        print(f"💰 Meta de lucro buscada: 5:1 ou mais")
        print(f"💵 Valor alcançado nesta operação: ${profit:.2f}")
        print(f"⭐ Pontos de recompensa: +{points}")
        print(f"📊 Score total: {self.score}")
        print(f"✅ Wins: {self.wins} | ❌ Losses: {self.losses}")
        print(f"📈 Win Rate: {(self.wins/(self.wins+self.losses)*100) if (self.wins+self.losses) > 0 else 0:.1f}%")
        print(f"{'='*70}\n")
    
    def hourly_learning(self):
        """Execução de hora em hora - Busca e aprende"""
        self.learning_sessions += 1
        
        print(f"\n{'🔥'*35}")
        print(f"🧠 SESSÃO DE APRENDIZADO #{self.learning_sessions}")
        print(f"⏰ {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
        print(f"{'🔥'*35}\n")
        
        # Realizar aprendizado do YouTube
        print("📺 Buscando novos vídeos no YouTube...")
        try:
            result = self.learner.update_knowledge(focus_novo_legacy=True)
            
            if result:
                new_videos = result.get('new_videos', 0)
                new_concepts = result.get('new_concepts', 0)
                
                print(f"\n✅ Aprendizado concluído!")
                print(f"📹 Novos vídeos analisados: {new_videos}")
                print(f"💡 Novos conceitos aprendidos: {new_concepts}")
                print(f"📊 Score atual: {self.score}")
                
                # Salvar progresso
                self.save_rewards()
                
        except Exception as e:
            print(f"❌ Erro durante aprendizado: {str(e)}")
        
        print(f"\n⏳ Próxima sessão em 1 hora...\n")
    
    def start_continuous_learning(self):
        """Inicia aprendizado contínuo de hora em hora"""
        print(f"\n{'='*70}")
        print(f"🚀 SISTEMA DE APRENDIZADO CONTÍNUO INICIADO")
        print(f"⏰ Busca automática: A CADA HORA")
        print(f"🎯 Objetivo: Maximizar lucro 5:1 ou mais")
        print(f"✅ Recompensa por acerto: +100 pontos")
        print(f"❌ Punição por erro: -500 pontos (SEVERA)")
        print(f"{'='*70}\n")
        
        # Executar imediatamente na inicialização
        self.hourly_learning()
        
        # Agendar execuções de hora em hora
        schedule.every(1).hours.do(self.hourly_learning)
        
        # Loop infinito
        print("🔄 Sistema rodando... (Ctrl+C para parar)")
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # Verificar a cada minuto
        except KeyboardInterrupt:
            print("\n\n⏹️  Sistema de aprendizado parado.")
            print(f"📊 Stats Finais:")
            print(f"   Score: {self.score}")
            print(f"   Wins: {self.wins}")
            print(f"   Losses: {self.losses}")
            print(f"   Sessões: {self.learning_sessions}")


if __name__ == "__main__":
    learner = RewardPunishmentLearner()
    learner.start_continuous_learning()
