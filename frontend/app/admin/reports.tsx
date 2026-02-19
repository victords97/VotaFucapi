import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const EXPO_PUBLIC_BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.100.100:8001').replace(/\/+$/, '');

export default function ReportsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    loadReports();
  }, []);

  const checkAuth = async () => {
    const isLogged = await AsyncStorage.getItem('admin_logged');
    if (isLogged !== 'true') {
      router.replace('/admin/login');
    }
  };

  const loadReports = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/admin/reports`);
      setData(response.data);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const formatHora = (hora: number) => {
    return `${hora.toString().padStart(2, '0')}:00`;
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>RelatÃ³rios</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Cards de Resumo */}
        <View style={styles.summaryCards}>
          <View style={[styles.card, { backgroundColor: '#667eea' }]}>
            <Ionicons name="people" size={40} color="#fff" />
            <Text style={styles.cardNumber}>{data?.total_usuarios || 0}</Text>
            <Text style={styles.cardLabel}>UsuÃ¡rios Cadastrados</Text>
          </View>

          <View style={[styles.card, { backgroundColor: '#10b981' }]}>
            <Ionicons name="checkmark-circle" size={40} color="#fff" />
            <Text style={styles.cardNumber}>{data?.total_votos || 0}</Text>
            <Text style={styles.cardLabel}>Total de Votos</Text>
          </View>
        </View>

        {/* HorÃ¡rio de Pico */}
        {data?.horario_pico && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>â° HorÃ¡rio de Pico</Text>
            <View style={styles.peakCard}>
              <Ionicons name="trending-up" size={32} color="#f59e0b" />
              <View style={styles.peakInfo}>
                <Text style={styles.peakHour}>{formatHora(data.horario_pico.hora)}</Text>
                <Text style={styles.peakVotes}>{data.horario_pico.total_votos} votos</Text>
              </View>
            </View>
          </View>
        )}

        {/* Votos por Hora */}
        {data?.votos_por_hora && data.votos_por_hora.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ðŸ“Š Votos por HorÃ¡rio</Text>
            {data.votos_por_hora.map((item: any) => (
              <View key={item._id} style={styles.hourRow}>
                <Text style={styles.hourLabel}>{formatHora(item._id)}</Text>
                <View style={styles.hourBarContainer}>
                  <View 
                    style={[
                      styles.hourBar,
                      { width: `${(item.count / data.horario_pico.total_votos) * 100}%` }
                    ]}
                  />
                </View>
                <Text style={styles.hourCount}>{item.count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Top Projetos */}
        {data?.top_projetos && data.top_projetos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ðŸ† Top 5 Projetos</Text>
            {data.top_projetos.map((projeto: any, index: number) => (
              <View key={projeto._id} style={styles.projectRow}>
                <View style={[styles.rankBadge, index === 0 && styles.firstPlace]}>
                  <Text style={styles.rankText}>{index + 1}Âº</Text>
                </View>
                <View style={styles.projectInfo}>
                  <Text style={styles.projectName}>{projeto.nome_projeto}</Text>
                  <Text style={styles.projectTurma}>{projeto.nome_turma}</Text>
                </View>
                <Text style={styles.projectVotes}>{projeto.votos_count} votos</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  cardLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  peakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  peakInfo: {
    marginLeft: 16,
  },
  peakHour: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  peakVotes: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  hourLabel: {
    width: 60,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  hourBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  hourBar: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 4,
  },
  hourCount: {
    width: 40,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
    textAlign: 'right',
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  firstPlace: {
    backgroundColor: '#f59e0b',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  projectTurma: {
    fontSize: 14,
    color: '#666',
  },
  projectVotes: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
});


