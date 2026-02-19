import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const EXPO_PUBLIC_BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.100.100:8001').replace(/\/+$/, '');
const BACKEND_URL = EXPO_PUBLIC_BACKEND_URL?.replace(/\/+$/, '');

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const faceImage = params.face_image as string;

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCPF = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return cpf;
  };

  const formatPhone = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return telefone;
  };

  const handleRegister = async () => {
    setFormError('');

    if (!nome.trim() || !cpf.trim() || !telefone.trim()) {
      const message = 'Por favor, preencha todos os campos';
      setFormError(message);
      if (Platform.OS !== 'web') {
        Alert.alert('Atenção', message);
      }
      return;
    }

    if (cpf.replace(/\D/g, '').length !== 11) {
      const message = 'CPF inválido';
      setFormError(message);
      if (Platform.OS !== 'web') {
        Alert.alert('Atenção', message);
      }
      return;
    }

    if (!lgpdAccepted) {
      const message = 'Você precisa aceitar o termo LGPD para continuar.';
      setFormError(message);
      if (Platform.OS !== 'web') {
        Alert.alert('Atenção', message);
      }
      return;
    }

    try {
      setLoading(true);

      if (!BACKEND_URL) {
        throw new Error('EXPO_PUBLIC_BACKEND_URL não configurada');
      }

      const response = await axios.post(
        `${BACKEND_URL}/api/register`,
        {
          nome: nome.trim(),
          cpf: cpf.replace(/\D/g, ''),
          telefone: telefone.replace(/\D/g, ''),
          face_image: faceImage,
          lgpd_aceito: true,
        },
        { timeout: 30000 }
      );

      if (response.data.success) {
        Alert.alert('Sucesso', 'Cadastro realizado com sucesso!', [
          {
            text: 'OK',
            onPress: () => {
              router.push({
                pathname: '/voting',
                params: { usuario_id: response.data.usuario_id },
              });
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error('Error registering:', error);
      const message = error.response?.data?.detail || error.message || 'Erro ao cadastrar. Tente novamente.';
      setFormError(message);
      if (Platform.OS !== 'web') {
        Alert.alert('Erro', message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Pré-Cadastro</Text>
            <View style={styles.backButtonPlaceholder} />
          </View>

          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-add" size={48} color="#667eea" />
            </View>

            <Text style={styles.subtitle}>Complete seu cadastro</Text>

            {!!formError && <Text style={styles.errorText}>{formError}</Text>}

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nome Completo"
                value={nome}
                onChangeText={(text) => {
                  setNome(text);
                  if (formError) {
                    setFormError('');
                  }
                }}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="card-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="CPF"
                value={cpf}
                onChangeText={(text) => {
                  setCpf(formatCPF(text));
                  if (formError) {
                    setFormError('');
                  }
                }}
                keyboardType="numeric"
                maxLength={14}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Telefone"
                value={telefone}
                onChangeText={(text) => {
                  setTelefone(formatPhone(text));
                  if (formError) {
                    setFormError('');
                  }
                }}
                keyboardType="phone-pad"
                maxLength={15}
                placeholderTextColor="#999"
              />
            </View>

            <TouchableOpacity
              style={styles.lgpdRow}
              onPress={() => {
                setLgpdAccepted((prev) => !prev);
                if (formError) {
                  setFormError('');
                }
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, lgpdAccepted && styles.checkboxChecked]}>
                {lgpdAccepted ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </View>
              <Text style={styles.lgpdText}>
                Li e aceito o termo de tratamento de dados pessoais conforme a LGPD (Lei 13.709/2018).
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.lgpdLinkButton} onPress={() => setShowTermsModal(true)}>
              <Text style={styles.lgpdLinkText}>Ler termo de aceite</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Cadastrando...' : 'Concluir Cadastro'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal
          visible={showTermsModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTermsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Termo de Aceite LGPD</Text>
                <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                  <Ionicons name="close" size={24} color="#334155" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                <Text style={styles.modalText}>
                  Ao continuar, você concorda com a coleta e o tratamento dos dados informados neste cadastro
                  (nome, CPF, telefone e biometria facial), exclusivamente para identificação do participante,
                  validação de autenticidade e controle de votação durante o evento.
                </Text>
                <Text style={styles.modalText}>
                  Seus dados serão armazenados com medidas de segurança adequadas e utilizados apenas para as
                  finalidades deste sistema, em conformidade com a Lei Geral de Proteção de Dados (Lei
                  13.709/2018).
                </Text>
                <Text style={styles.modalText}>
                  Você pode solicitar revisão, correção ou exclusão dos dados, quando aplicável, junto a
                  organização responsável pelo evento.
                </Text>
              </ScrollView>

              <TouchableOpacity style={styles.modalButton} onPress={() => setShowTermsModal(false)}>
                <Text style={styles.modalButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 40,
    marginBottom: 20,
    width: '100%',
    maxWidth: 520,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPlaceholder: {
    width: 40,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    width: '100%',
    maxWidth: 520,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    marginBottom: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  lgpdRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  lgpdText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  lgpdLinkButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  lgpdLinkText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: '#667eea',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 700,
    maxHeight: '82%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalBody: {
    maxHeight: 360,
  },
  modalBodyContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
    marginBottom: 12,
  },
  modalButton: {
    margin: 16,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});




