import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const EXPO_PUBLIC_BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.100.100:8001').replace(/\/+$/, '');
const { width } = Dimensions.get('window');

interface TurmaResult {
  _id: string;
  nome_turma: string;
  nome_projeto: string;
  numero_barraca: string;
  votos_count: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [results, setResults] = useState<TurmaResult[]>([]);
  const [totalVotos, setTotalVotos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    checkAuth();
    loadResults();

    // Auto refresh every 5 seconds
    const interval = setInterval(() => {
      loadResults(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const checkAuth = async () => {
    const isLogged = await AsyncStorage.getItem('admin_logged');
    if (isLogged !== 'true') {
      router.replace('/admin/login');
    }
  };

  const loadResults = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/admin/results`);
      setTotalVotos(response.data.total_votos);
      setResults(response.data.turmas);
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadResults();
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('admin_logged');
    router.replace('/');
  };

  const handleResetSystem = async () => {
    try {
      setResetting(true);
      
      const response = await axios.delete(`${EXPO_PUBLIC_BACKEND_URL}/api/admin/reset-all`);
      
      if (response.data.success) {
        Alert.alert(
          'Sistema Resetado!',
          `Foram removidos:\n• ${response.data.deleted.usuarios} usuários\n• ${response.data.deleted.votos} votos\n• ${response.data.deleted.turmas} turmas`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowResetModal(false);
                loadResults();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error resetting system:', error);
      Alert.alert('Erro', 'Erro ao resetar sistema');
    } finally {
      setResetting(false);
    }
  };

  const confirmReset = () => {
    Alert.alert(
      '⚠️ ATENÇÃO: Ação Irreversível',
      'Isso irá DELETAR PERMANENTEMENTE:\n\n• Todos os usuários cadastrados\n• Todos os votos registrados\n• Todas as turmas cadastradas\n\nEsta ação NÃO PODE ser desfeita!\n\nDeseja realmente continuar?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => setShowResetModal(false),
        },
        {
          text: 'SIM, ZERAR TUDO',
          style: 'destructive',
          onPress: handleResetSystem,
        },
      ]
    );
  };

  const getPercentage = (votos: number) => {
    if (totalVotos === 0) return 0;
    return ((votos / totalVotos) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1f2937', '#111827']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Resultados em Tempo Real</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setShowResetModal(true)}
            >
              <Ionicons name="trash-bin" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Ionicons name="people" size={32} color="#667eea" />
            <Text style={styles.statNumber}>{totalVotos}</Text>
            <Text style={styles.statLabel}>Total de Votos</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="trophy" size={32} color="#f59e0b" />
            <Text style={styles.statNumber}>{results.length}</Text>
            <Text style={styles.statLabel}>Projetos</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/admin/turmas')}
        >
          <Ionicons name="apps" size={24} color="#667eea" />
          <Text style={styles.actionButtonText}>Gerenciar Turmas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => router.push('/admin/reports')}
        >
          <Ionicons name="stats-chart" size={24} color="#10b981" />
          <Text style={[styles.actionButtonText, { color: '#10b981' }]}>Relatórios</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => router.push('/admin/change-password')}
        >
          <Ionicons name="key" size={24} color="#f59e0b" />
          <Text style={[styles.actionButtonText, { color: '#f59e0b' }]}>Trocar Senha</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.resultsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Classificação</Text>

        {results.map((turma, index) => (
          <View key={turma._id} style={styles.resultCard}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{index + 1}º</Text>
            </View>

            <View style={styles.resultInfo}>
              <Text style={styles.turmaName}>{turma.nome_turma}</Text>
              <Text style={styles.projetoName}>{turma.nome_projeto}</Text>
              <Text style={styles.barracaInfo}>Barraca {turma.numero_barraca}</Text>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressFill,
                      { width: `${getPercentage(turma.votos_count)}%` },
                    ]}
                  />
                </View>
                <View style={styles.votesInfo}>
                  <Text style={styles.votesText}>{turma.votos_count} votos</Text>
                  <Text style={styles.percentageText}>{getPercentage(turma.votos_count)}%</Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        {results.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhum resultado disponível</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de Confirmação de Reset */}
      {showResetModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="warning" size={64} color="#ef4444" />
            <Text style={styles.modalTitle}>Zerar Sistema</Text>
            <Text style={styles.modalText}>
              Esta ação irá DELETAR PERMANENTEMENTE:
            </Text>
            <View style={styles.modalList}>
              <Text style={styles.modalListItem}>• Todos os usuários cadastrados</Text>
              <Text style={styles.modalListItem}>• Todos os votos registrados</Text>
              <Text style={styles.modalListItem}>• Todas as turmas cadastradas</Text>
            </View>
            <Text style={[styles.modalText, { fontWeight: 'bold', color: '#ef4444' }]}>
              Esta ação NÃO PODE ser desfeita!
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowResetModal(false)}
                disabled={resetting}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmReset}
                disabled={resetting}
              >
                {resetting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Zerar Tudo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  resetButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  buttonsRow: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  resultInfo: {
    flex: 1,
  },
  turmaName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  projetoName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  barracaInfo: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  votesInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  votesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalList: {
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  modalListItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#ef4444',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});





