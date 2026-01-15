"""
🧠 ADVANCED YOUTUBE LEARNING SYSTEM - Sistema Avançado de Aprendizado
Aprende CRT do YouTube e SE AUTO-VALIDA comparando com resultados reais!

FONTE PRINCIPAL: Novo Legacy (https://www.youtube.com/@NovoLegacy)
- Aprende técnica CRT
- Valida com outros canais
- Compara aprendizado com performance real
- Se torna ESPECIALISTA no sistema
"""

import os
import json
import time
from datetime import datetime
from googleapiclient.discovery import build
from youtube_transcript_api import YouTubeTranscriptApi
import re
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

class AdvancedCRTLearner:
    def __init__(self):
        # API Key do YouTube
        self.api_key = os.getenv('YOUTUBE_API_KEY', 'YOUR_API_KEY_HERE')
        print(f"🔑 YouTube API Key carregada: {self.api_key[:20]}..." if self.api_key != 'YOUR_API_KEY_HERE' else "❌ API Key não encontrada")
        try:
            self.youtube = build('youtube', 'v3', developerKey=self.api_key)
        except:
            print("⚠️ YouTube API não configurada. Configure YOUTUBE_API_KEY no .env")
            self.youtube = None
        
        # Bases de conhecimento
        self.knowledge_file = 'crt_knowledge_base.json'
        self.performance_file = 'trading_performance.json'
        self.validation_file = 'learning_validation.json'
        
        self.knowledge = self.load_knowledge()
        self.performance_data = self.load_performance()
        self.validation_results = self.load_validation()
        
        # Canais prioritários (Novo Legacy é o principal!)
        self.priority_channels = {
            'NovoLegacy': {
                'id': 'UCuHf0qp6kVqVGfPQHq_KJJQ',  # ID do canal Novo Legacy
                'url': 'https://www.youtube.com/@NovoLegacy',
                'weight': 10.0,  # Peso máximo - FONTE PRINCIPAL
                'focus': 'CRT, One Candle Strategy, PCC, Manipulation'
            },
            'AUltimaChave': {
                'id': '@aultimachaveoficial',  # A Última Chave Oficial
                'url': 'https://www.youtube.com/@aultimachaveoficial',
                'weight': 8.5,  # Peso alto - Metodologia para Futuros
                'focus': 'Futuros, Price Action, Setup 5:1, Gestão de Risco',
                'market_type': 'FUTURES'  # NÃO é Forex!
            }
        }
        
        # Canais complementares
        self.complementary_channels = {
            'ICT_Concepts': {
                'search': 'ICT smart money concepts CRT',
                'weight': 7.0,
                'focus': 'Complementar - Conceitos relacionados'
            },
            'Price_Action': {
                'search': 'price action candle theory trading',
                'weight': 5.0,
                'focus': 'Validação - Análise de velas'
            }
        }
        
        # Termos CRT para buscar (focado em Novo Legacy)
        self.crt_terms = [
            'one candle strategy',
            'CRT trading',
            'previous candle close PCC',
            'candle manipulation trading',
            'turtle soup trading',
            '4 hour candle strategy',
            'candle range theory',
            'premium discount zones',
            'liquidity sweep trading'
        ]
    
    def load_knowledge(self):
        """Carregar base de conhecimento"""
        if os.path.exists(self.knowledge_file):
            with open(self.knowledge_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {
            'videos_analyzed': [],
            'concepts': {},
            'strategies': [],
            'sources': {},
            'confidence_scores': {},
            'last_update': None,
            'total_learning_hours': 0
        }
    
    def load_performance(self):
        """Carregar dados de performance real"""
        if os.path.exists(self.performance_file):
            with open(self.performance_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {
            'trades': [],
            'win_rate': 0,
            'avg_rr': 0,
            'total_profit': 0,
            'concepts_used': {}
        }
    
    def load_validation(self):
        """Carregar validações de aprendizado"""
        if os.path.exists(self.validation_file):
            with open(self.validation_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {
            'validations': [],
            'compatibility_scores': {},
            'improvements': [],
            'last_validation': None
        }
    
    def save_all(self):
        """Salvar todas as bases"""
        self.knowledge['last_update'] = datetime.now().isoformat()
        
        with open(self.knowledge_file, 'w', encoding='utf-8') as f:
            json.dump(self.knowledge, f, indent=2, ensure_ascii=False)
        
        with open(self.performance_file, 'w', encoding='utf-8') as f:
            json.dump(self.performance_data, f, indent=2, ensure_ascii=False)
        
        with open(self.validation_file, 'w', encoding='utf-8') as f:
            json.dump(self.validation_results, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Bases salvas: {len(self.knowledge['videos_analyzed'])} vídeos analisados")
    
    def search_novo_legacy_videos(self, max_results=10):
        """Buscar vídeos do canal Novo Legacy"""
        if not self.youtube:
            print("❌ YouTube API não disponível")
            return []
        
        print("\n🎯 BUSCANDO VÍDEOS DO NOVO LEGACY...")
        videos = []
        
        try:
            # Buscar por canal
            request = self.youtube.search().list(
                part='snippet',
                channelId=self.priority_channels['NovoLegacy']['id'],
                type='video',
                maxResults=max_results,
                order='relevance',
                q='CRT one candle'  # Filtrar por conteúdo CRT
            )
            response = request.execute()
            
            for item in response['items']:
                video_id = item['id']['videoId']
                title = item['snippet']['title']
                description = item['snippet']['description']
                
                videos.append({
                    'id': video_id,
                    'title': title,
                    'description': description,
                    'channel': 'Novo Legacy',
                    'url': f'https://www.youtube.com/watch?v={video_id}',
                    'priority': 10.0  # Máxima prioridade
                })
            
            print(f"✅ {len(videos)} vídeos encontrados no Novo Legacy")
            
        except Exception as e:
            print(f"❌ Erro ao buscar Novo Legacy: {str(e)}")
        
        return videos
    
    def search_complementary_videos(self, query, max_results=5):
        """Buscar vídeos complementares"""
        if not self.youtube:
            return []
        
        try:
            request = self.youtube.search().list(
                part='snippet',
                q=query,
                type='video',
                maxResults=max_results,
                order='relevance'
            )
            response = request.execute()
            
            videos = []
            for item in response['items']:
                videos.append({
                    'id': item['id']['videoId'],
                    'title': item['snippet']['title'],
                    'description': item['snippet']['description'],
                    'channel': item['snippet']['channelTitle'],
                    'url': f'https://www.youtube.com/watch?v={item["id"]["videoId"]}',
                    'priority': 5.0  # Prioridade menor
                })
            
            return videos
        
        except Exception as e:
            print(f"⚠️ Erro em busca complementar: {str(e)}")
            return []
    
    def get_transcript(self, video_id):
        """Extrair transcrição do vídeo"""
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            try:
                transcript = transcript_list.find_transcript(['en'])
            except:
                try:
                    transcript = transcript_list.find_transcript(['pt', 'pt-BR'])
                except:
                    return None
            
            transcript_data = transcript.fetch()
            full_text = ' '.join([item['text'] for item in transcript_data])
            
            return full_text
        
        except Exception as e:
            return None
    
    def extract_crt_concepts(self, text, video_info):
        """Extrair conceitos CRT do texto"""
        concepts = {}
        
        # Palavras-chave CRT (baseado em Novo Legacy)
        crt_keywords = {
            'PCC': {
                'patterns': [r'PCC', r'previous\s+candle\s+close', r'close\s+of\s+previous', r'prior\s+close'],
                'importance': 10.0  # Crítico!
            },
            '4H_Candle': {
                'patterns': [r'4\s*h(?:our)?', r'four\s+hour', r'4h\s+candle'],
                'importance': 10.0
            },
            'Manipulation': {
                'patterns': [r'manipulation', r'wick', r'liquidity\s+grab', r'fake\s+out'],
                'importance': 9.0
            },
            'Distribution': {
                'patterns': [r'distribution', r'impulse', r'real\s+move', r'breakout'],
                'importance': 9.0
            },
            'Quadrants': {
                'patterns': [r'quadrant', r'fibonacci', r'25%', r'50%', r'75%', r'premium', r'discount'],
                'importance': 8.0
            },
            'Turtle_Soup': {
                'patterns': [r'turtle\s+soup', r'liquidity\s+sweep', r'stop\s+hunt'],
                'importance': 8.0
            },
            'Entry_Zone': {
                'patterns': [r'entry', r'zone', r'setup', r'signal'],
                'importance': 9.0
            },
            'Risk_Management': {
                'patterns': [r'stop\s+loss', r'take\s+profit', r'risk\s+reward', r'R:R'],
                'importance': 9.0
            }
        }
        
        for concept, data in crt_keywords.items():
            matches = []
            for pattern in data['patterns']:
                found = re.findall(pattern, text, re.IGNORECASE)
                matches.extend(found)
            
            if matches:
                # Extrair contexto
                context_snippets = []
                for match in matches[:3]:
                    index = text.lower().find(match.lower())
                    if index != -1:
                        start = max(0, index - 150)
                        end = min(len(text), index + 150)
                        context_snippets.append(text[start:end].strip())
                
                concepts[concept] = {
                    'count': len(matches),
                    'importance': data['importance'],
                    'contexts': context_snippets,
                    'source': video_info['title'],
                    'channel': video_info['channel'],
                    'priority': video_info['priority']
                }
        
        return concepts
    
    def validate_concept_compatibility(self, concept, new_data):
        """Validar se novo conceito é compatível com conhecimento existente"""
        if concept not in self.knowledge['concepts']:
            return {'compatible': True, 'confidence': 1.0, 'reason': 'Novo conceito'}
        
        existing = self.knowledge['concepts'][concept]
        
        # Comparar contextos
        similarity_score = 0
        total_comparisons = 0
        
        for new_context in new_data['contexts']:
            for existing_entry in existing[:3]:  # Comparar com top 3 existentes
                if 'context' in existing_entry:
                    for old_context in existing_entry['context']:
                        # Calcular similaridade simples (palavras em comum)
                        new_words = set(new_context.lower().split())
                        old_words = set(old_context.lower().split())
                        
                        if len(new_words) > 0 and len(old_words) > 0:
                            similarity = len(new_words & old_words) / len(new_words | old_words)
                            similarity_score += similarity
                            total_comparisons += 1
        
        if total_comparisons > 0:
            avg_similarity = similarity_score / total_comparisons
            compatible = avg_similarity > 0.3  # 30% de similaridade mínima
            
            return {
                'compatible': compatible,
                'confidence': avg_similarity,
                'reason': f'Similaridade: {avg_similarity*100:.1f}%'
            }
        
        return {'compatible': True, 'confidence': 0.5, 'reason': 'Sem dados para comparar'}
    
    def analyze_video(self, video_info):
        """Analisar vídeo com validação"""
        video_id = video_info['id']
        
        # Verificar se já analisado
        if video_id in self.knowledge['videos_analyzed']:
            print(f"⏭️ Já analisado: {video_info['title']}")
            return None
        
        print(f"\n🔍 Analisando: {video_info['title']}")
        print(f"📺 Canal: {video_info['channel']} (Prioridade: {video_info['priority']})")
        
        # Extrair transcrição
        transcript = self.get_transcript(video_id)
        if not transcript:
            print("⚠️ Sem legendas disponíveis")
            return None
        
        # Extrair conceitos CRT
        concepts = self.extract_crt_concepts(transcript, video_info)
        
        if not concepts:
            print("⚠️ Nenhum conceito CRT encontrado")
            return None
        
        # VALIDAR cada conceito
        validated_concepts = {}
        for concept, data in concepts.items():
            validation = self.validate_concept_compatibility(concept, data)
            
            if validation['compatible']:
                # Adicionar ao conhecimento
                if concept not in self.knowledge['concepts']:
                    self.knowledge['concepts'][concept] = []
                
                self.knowledge['concepts'][concept].append({
                    'video': video_info['title'],
                    'channel': video_info['channel'],
                    'url': video_info['url'],
                    'priority': video_info['priority'],
                    'count': data['count'],
                    'importance': data['importance'],
                    'context': data['contexts'],
                    'timestamp': datetime.now().isoformat(),
                    'validation': validation
                })
                
                validated_concepts[concept] = {
                    'status': 'VALIDADO ✅',
                    'confidence': validation['confidence']
                }
                
                print(f"  ✅ {concept}: {validation['reason']}")
            else:
                validated_concepts[concept] = {
                    'status': 'CONFLITO ⚠️',
                    'confidence': validation['confidence']
                }
                print(f"  ⚠️ {concept}: Conflito detectado - {validation['reason']}")
        
        # Marcar como analisado
        self.knowledge['videos_analyzed'].append(video_id)
        
        # Calcular score do vídeo
        video_score = sum([d['importance'] * video_info['priority'] for d in concepts.values()])
        
        return {
            'video': video_info,
            'concepts_found': list(concepts.keys()),
            'validated_concepts': validated_concepts,
            'transcript_length': len(transcript),
            'video_score': video_score
        }
    
    def compare_with_real_performance(self):
        """Comparar aprendizado com performance REAL de trading"""
        print("\n📊 COMPARANDO APRENDIZADO COM RESULTADOS REAIS...")
        
        if len(self.performance_data['trades']) < 10:
            print("⚠️ Poucos trades para análise (mínimo 10)")
            return None
        
        # Analisar quais conceitos funcionam melhor
        concept_performance = {}
        
        for trade in self.performance_data['trades']:
            if 'concepts_used' in trade:
                result = 'win' if trade.get('profit', 0) > 0 else 'loss'
                
                for concept in trade['concepts_used']:
                    if concept not in concept_performance:
                        concept_performance[concept] = {'wins': 0, 'losses': 0, 'total_profit': 0}
                    
                    if result == 'win':
                        concept_performance[concept]['wins'] += 1
                    else:
                        concept_performance[concept]['losses'] += 1
                    
                    concept_performance[concept]['total_profit'] += trade.get('profit', 0)
        
        # Calcular win rate por conceito
        concept_scores = {}
        for concept, stats in concept_performance.items():
            total = stats['wins'] + stats['losses']
            if total > 0:
                win_rate = (stats['wins'] / total) * 100
                avg_profit = stats['total_profit'] / total
                
                concept_scores[concept] = {
                    'win_rate': win_rate,
                    'avg_profit': avg_profit,
                    'sample_size': total,
                    'effectiveness': win_rate * avg_profit  # Score combinado
                }
        
        # Comparar com importância no aprendizado
        comparison = {}
        for concept in self.knowledge['concepts'].keys():
            learned_importance = sum([
                entry.get('importance', 5.0) * entry.get('priority', 5.0)
                for entry in self.knowledge['concepts'][concept]
            ]) / len(self.knowledge['concepts'][concept])
            
            real_performance = concept_scores.get(concept, {
                'win_rate': 0,
                'effectiveness': 0,
                'sample_size': 0
            })
            
            # Calcular se teoria bate com prática
            compatibility = 0
            if real_performance['sample_size'] >= 5:
                # Se win rate > 60%, conceito funciona
                if real_performance['win_rate'] >= 60:
                    compatibility = min(100, real_performance['win_rate'] + 20)
                else:
                    compatibility = real_performance['win_rate']
            
            comparison[concept] = {
                'learned_importance': learned_importance,
                'real_win_rate': real_performance['win_rate'],
                'real_effectiveness': real_performance['effectiveness'],
                'sample_size': real_performance['sample_size'],
                'theory_vs_practice': compatibility,
                'status': 'FUNCIONA ✅' if compatibility >= 70 else 
                         'PRECISA MELHORAR ⚠️' if compatibility >= 50 else 
                         'NÃO FUNCIONA ❌'
            }
        
        # Salvar validação
        self.validation_results['validations'].append({
            'timestamp': datetime.now().isoformat(),
            'comparison': comparison,
            'total_trades': len(self.performance_data['trades']),
            'overall_win_rate': self.performance_data['win_rate']
        })
        
        self.validation_results['last_validation'] = datetime.now().isoformat()
        
        print("\n🎯 RESULTADOS DA VALIDAÇÃO:")
        for concept, data in sorted(comparison.items(), key=lambda x: x[1]['theory_vs_practice'], reverse=True):
            print(f"\n  {concept}:")
            print(f"    Teoria: Importância {data['learned_importance']:.1f}")
            print(f"    Prática: Win Rate {data['real_win_rate']:.1f}% ({data['sample_size']} trades)")
            print(f"    Status: {data['status']} (Score: {data['theory_vs_practice']:.1f})")
        
        return comparison
    
    def update_knowledge(self, focus_novo_legacy=True):
        """Atualizar conhecimento com foco em Novo Legacy"""
        print("\n" + "="*70)
        print("🧠 INICIANDO APRENDIZADO AVANÇADO CRT")
        print("="*70)
        print(f"📚 Conhecimento atual: {len(self.knowledge['videos_analyzed'])} vídeos")
        print(f"📊 Performance: {len(self.performance_data['trades'])} trades realizados")
        
        new_videos_count = 0
        
        # 1. FOCO PRINCIPAL: Novo Legacy
        if focus_novo_legacy:
            novo_videos = self.search_novo_legacy_videos(max_results=10)
            
            for video in novo_videos:
                result = self.analyze_video(video)
                if result:
                    new_videos_count += 1
                    print(f"\n  ✅ Score do vídeo: {result['video_score']:.1f}")
                
                time.sleep(2)  # Respeitar rate limit
        
        # 2. Buscar vídeos complementares
        print("\n🔍 Buscando fontes complementares...")
        for term in self.crt_terms[:3]:  # Apenas 3 termos para não sobrecarregar
            comp_videos = self.search_complementary_videos(term, max_results=2)
            
            for video in comp_videos:
                result = self.analyze_video(video)
                if result:
                    new_videos_count += 1
                
                time.sleep(2)
        
        # 3. VALIDAR com performance real
        if len(self.performance_data['trades']) >= 10:
            self.compare_with_real_performance()
        
        # 4. Salvar tudo
        self.save_all()
        
        print("\n" + "="*70)
        print("✅ APRENDIZADO CONCLUÍDO")
        print("="*70)
        print(f"📊 Novos vídeos: {new_videos_count}")
        print(f"💾 Total vídeos: {len(self.knowledge['videos_analyzed'])}")
        print(f"🧩 Conceitos: {len(self.knowledge['concepts'])}")
        print(f"📈 Performance: {self.performance_data.get('win_rate', 0):.1f}% win rate")
        
        return {
            'new_videos': new_videos_count,
            'total_videos': len(self.knowledge['videos_analyzed']),
            'concepts': list(self.knowledge['concepts'].keys()),
            'performance_validated': len(self.performance_data['trades']) >= 10
        }
    
    def get_expert_strategy(self):
        """Compilar estratégia especialista baseada em TUDO que aprendeu"""
        print("\n📖 COMPILANDO ESTRATÉGIA ESPECIALISTA CRT...")
        
        strategy = {
            'name': 'CRT Expert Strategy - Powered by Novo Legacy',
            'source': 'Aprendizado do canal Novo Legacy + Validação Real',
            'confidence': 0,
            'key_concepts': {},
            'validated_by_performance': False
        }
        
        # Para cada conceito, pegar as melhores explicações
        for concept in ['PCC', '4H_Candle', 'Manipulation', 'Distribution', 'Turtle_Soup', 'Entry_Zone']:
            if concept in self.knowledge['concepts']:
                entries = self.knowledge['concepts'][concept]
                
                # Ordenar por prioridade e importância
                sorted_entries = sorted(entries, 
                    key=lambda x: x.get('priority', 0) * x.get('importance', 0), 
                    reverse=True)
                
                best_contexts = []
                for entry in sorted_entries[:3]:
                    if 'context' in entry:
                        best_contexts.extend(entry['context'][:2])
                
                # Pegar dados de performance
                perf_data = {}
                if concept in self.validation_results.get('compatibility_scores', {}):
                    perf_data = self.validation_results['compatibility_scores'][concept]
                
                strategy['key_concepts'][concept] = {
                    'learned_from': [e['channel'] for e in sorted_entries[:3]],
                    'best_explanations': best_contexts[:5],
                    'importance': sorted_entries[0].get('importance', 5) if sorted_entries else 5,
                    'real_performance': perf_data,
                    'times_mentioned': sum([e.get('count', 0) for e in sorted_entries])
                }
        
        # Calcular confidence geral
        total_videos = len(self.knowledge['videos_analyzed'])
        novo_legacy_count = sum([1 for vid in self.knowledge.get('sources', {}).values() 
                                 if vid.get('channel') == 'Novo Legacy'])
        
        strategy['confidence'] = min(100, (total_videos * 5) + (novo_legacy_count * 15))
        strategy['validated_by_performance'] = len(self.performance_data['trades']) >= 10
        
        return strategy

# ==== FUNÇÕES PARA NODE.JS CHAMAR ====

def update_learning():
    """Atualizar aprendizado - chamado por Node.js"""
    learner = AdvancedCRTLearner()
    return learner.update_knowledge(focus_novo_legacy=True)

def get_strategy():
    """Obter estratégia compilada"""
    learner = AdvancedCRTLearner()
    return learner.get_expert_strategy()

def add_trade_result(trade_data):
    """Adicionar resultado de trade para validação"""
    learner = AdvancedCRTLearner()
    learner.performance_data['trades'].append(trade_data)
    
    # Recalcular win rate
    wins = sum([1 for t in learner.performance_data['trades'] if t.get('profit', 0) > 0])
    total = len(learner.performance_data['trades'])
    learner.performance_data['win_rate'] = (wins / total * 100) if total > 0 else 0
    
    learner.save_all()
    
    # Se tiver 10+ trades, validar
    if total >= 10 and total % 5 == 0:  # A cada 5 trades
        learner.compare_with_real_performance()

if __name__ == '__main__':
    # Teste do sistema
    learner = AdvancedCRTLearner()
    learner.update_knowledge(focus_novo_legacy=True)
    
    # Mostrar estratégia
    strategy = learner.get_expert_strategy()
    print("\n" + "="*70)
    print("📖 ESTRATÉGIA ESPECIALISTA CRT")
    print("="*70)
    print(json.dumps(strategy, indent=2, ensure_ascii=False))
