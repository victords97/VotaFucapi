import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const EXPO_PUBLIC_BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.100.100:8001').replace(/\/+$/, '');
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

interface Turma {
  _id: string;
  nome_turma: string;
  nome_projeto: string;
  numero_barraca: string;
  foto_base64: string;
  votos_count: number;
}

export default function VotingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const usuarioId = params.usuario_id as string;

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    loadTurmas();
  }, []);

  const loadTurmas = async () => {
    try {
      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/turmas`);
      setTurmas(response.data);
    } catch (error) {
      console.error('Error loading turmas:', error);
      Alert.alert('Erro', 'Erro ao carregar turmas');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (turmaId: string) => {
    try {
      setVoting(true);

      const response = await axios.post(`${EXPO_PUBLIC_BACKEND_URL}/api/vote`, {
        usuario_id: usuarioId,
        turma_id: turmaId,
      });

      if (response.data.success) {
        router.push({
          pathname: '/success',
          params: { success: 'true' },
        });
      }
    } catch (error: any) {
      console.error('Error voting:', error);
      const message = error.response?.data?.detail || 'Erro ao registrar voto';
      router.push({
        pathname: '/success',
        params: { success: 'false', message },
      });
    } finally {
      setVoting(false);
    }
  };

  const renderTurmaCard = ({ item }: { item: Turma }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleVote(item._id)}
      disabled={voting}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: `data:image/jpeg;base64,${item.foto_base64}` }}
        style={styles.cardImage}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.cardOverlay}
      >
        <View style={styles.barracaContainer}>
          <View style={styles.barracaBadge}>
            <Ionicons name="location" size={16} color="#fff" />
            <Text style={styles.barracaText}>Barraca {item.numero_barraca}</Text>
          </View>
        </View>
        
        <View style={styles.cardInfo}>
          <Text style={styles.turmaText}>{item.nome_turma}</Text>
          <Text style={styles.projetoText}>{item.nome_projeto}</Text>
          
          <View style={styles.voteButton}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.voteButtonText}>VOTAR NESTE PROJETO</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Carregando projetos...</Text>
      </View>
    );
  }

  if (turmas.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-open-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>Nenhum projeto disponÃ­vel</Text>
        <TouchableOpacity
          style={styles.backHomeButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.backHomeButtonText}>Voltar ao InÃ­cio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Escolha seu Projeto Favorito</Text>
        <Text style={styles.headerSubtitle}>Toque no card para votar</Text>
      </LinearGradient>

      <FlatList
        data={turmas}
        renderItem={renderTurmaCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {voting && (
        <View style={styles.votingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.votingText}>Registrando voto...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  listContent: {
    padding: 24,
  },
  card: {
    width: CARD_WIDTH,
    height: 300,
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 20,
  },
  barracaContainer: {
    alignItems: 'flex-end',
  },
  barracaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  barracaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cardInfo: {
    gap: 8,
  },
  turmaText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  projetoText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  voteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  backHomeButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  backHomeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  votingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  votingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
  },
});


