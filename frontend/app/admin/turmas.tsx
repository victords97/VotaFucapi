import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const EXPO_PUBLIC_BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.100.100:8001').replace(/\/+$/, '');

interface Turma {
  _id: string;
  nome_turma: string;
  nome_projeto: string;
  numero_barraca: string;
  foto_base64: string;
  votos_count: number;
}

export default function AdminTurmasScreen() {
  const router = useRouter();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [nomeTurma, setNomeTurma] = useState('');
  const [nomeProjeto, setNomeProjeto] = useState('');
  const [numeroBarraca, setNumeroBarraca] = useState('');
  const [fotoBase64, setFotoBase64] = useState('');

  useEffect(() => {
    checkAuth();
    loadTurmas();
  }, []);

  const checkAuth = async () => {
    const isLogged = await AsyncStorage.getItem('admin_logged');
    if (isLogged !== 'true') {
      router.replace('/admin/login');
    }
  };

  const loadTurmas = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/admin/turmas`);
      setTurmas(response.data);
    } catch (error) {
      console.error('Error loading turmas:', error);
      Alert.alert('Erro', 'Erro ao carregar turmas');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('PermissÃ£o Negada', 'Ã‰ necessÃ¡rio permitir acesso Ã  galeria');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setFotoBase64(result.assets[0].base64);
    }
  };

  const handleCreateTurma = async () => {
    if (!nomeTurma.trim() || !nomeProjeto.trim() || !numeroBarraca.trim()) {
      Alert.alert('AtenÃ§Ã£o', 'Preencha todos os campos');
      return;
    }

    if (!fotoBase64) {
      Alert.alert('AtenÃ§Ã£o', 'Selecione uma foto do projeto');
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        // Update existing turma
        await axios.put(`${EXPO_PUBLIC_BACKEND_URL}/api/admin/turmas/${editingId}`, {
          nome_turma: nomeTurma.trim(),
          nome_projeto: nomeProjeto.trim(),
          numero_barraca: numeroBarraca.trim(),
          foto_base64: fotoBase64,
        });
        Alert.alert('Sucesso', 'Turma atualizada com sucesso!');
      } else {
        // Create new turma
        await axios.post(`${EXPO_PUBLIC_BACKEND_URL}/api/admin/turmas`, {
          nome_turma: nomeTurma.trim(),
          nome_projeto: nomeProjeto.trim(),
          numero_barraca: numeroBarraca.trim(),
          foto_base64: fotoBase64,
        });
        Alert.alert('Sucesso', 'Turma cadastrada com sucesso!');
      }

      setModalVisible(false);
      resetForm();
      loadTurmas();
    } catch (error: any) {
      console.error('Error saving turma:', error);
      const message = error.response?.data?.detail || 'Erro ao salvar turma';
      Alert.alert('Erro', message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditTurma = (turma: Turma) => {
    setEditingId(turma._id);
    setNomeTurma(turma.nome_turma);
    setNomeProjeto(turma.nome_projeto);
    setNumeroBarraca(turma.numero_barraca);
    setFotoBase64(turma.foto_base64);
    setModalVisible(true);
  };

  const handleDeleteTurma = (turmaId: string, nomeTurma: string) => {
    Alert.alert(
      'Confirmar ExclusÃ£o',
      `Deseja realmente excluir "${nomeTurma}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${EXPO_PUBLIC_BACKEND_URL}/api/admin/turmas/${turmaId}`);
              Alert.alert('Sucesso', 'Turma excluÃ­da com sucesso!');
              loadTurmas();
            } catch (error) {
              console.error('Error deleting turma:', error);
              Alert.alert('Erro', 'Erro ao excluir turma');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setNomeTurma('');
    setNomeProjeto('');
    setNumeroBarraca('');
    setFotoBase64('');
  };

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
          <Text style={styles.headerTitle}>Gerenciar Turmas</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Adicionar Nova Turma</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#667eea" style={{ marginTop: 40 }} />
        ) : turmas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma turma cadastrada</Text>
          </View>
        ) : (
          turmas.map((turma) => (
            <View key={turma._id} style={styles.turmaCard}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${turma.foto_base64}` }}
                style={styles.turmaImage}
              />
              <View style={styles.turmaInfo}>
                <Text style={styles.turmaNome}>{turma.nome_turma}</Text>
                <Text style={styles.turmaProjeto}>{turma.nome_projeto}</Text>
                <Text style={styles.turmaBarraca}>Barraca {turma.numero_barraca}</Text>
                <Text style={styles.turmaVotos}>{turma.votos_count} votos</Text>
              </View>
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditTurma(turma)}
                >
                  <Ionicons name="create-outline" size={24} color="#667eea" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTurma(turma._id, turma.nome_turma)}
                >
                  <Ionicons name="trash-outline" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Editar Turma' : 'Nova Turma'}</Text>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                resetForm();
              }}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.input}
                placeholder="Nome da Turma"
                value={nomeTurma}
                onChangeText={setNomeTurma}
                placeholderTextColor="#999"
              />

              <TextInput
                style={styles.input}
                placeholder="Nome do Projeto"
                value={nomeProjeto}
                onChangeText={setNomeProjeto}
                placeholderTextColor="#999"
              />

              <TextInput
                style={styles.input}
                placeholder="NÃºmero da Barraca"
                value={numeroBarraca}
                onChangeText={setNumeroBarraca}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />

              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={pickImage}
              >
                <Ionicons name="image-outline" size={24} color="#667eea" />
                <Text style={styles.imagePickerText}>
                  {fotoBase64 ? 'Foto Selecionada âœ“' : 'Selecionar Foto do Projeto'}
                </Text>
              </TouchableOpacity>

              {fotoBase64 ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${fotoBase64}` }}
                  style={styles.previewImage}
                />
              ) : null}

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleCreateTurma}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Salvando...' : 'Salvar Turma'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  turmaCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  turmaImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  turmaInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  turmaNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  turmaProjeto: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  turmaBarraca: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  turmaVotos: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f0f4ff',
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4ff',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#667eea',
    borderStyle: 'dashed',
  },
  imagePickerText: {
    fontSize: 16,
    color: '#667eea',
    marginLeft: 8,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});


