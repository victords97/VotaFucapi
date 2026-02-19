import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const BACKEND_URL = EXPO_PUBLIC_BACKEND_URL?.replace(/\/+$/, '');

export default function AdminLoginScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    setErrorMessage('');

    if (!password.trim()) {
      const message = 'Digite a senha';
      setErrorMessage(message);
      if (Platform.OS !== 'web') {
        Alert.alert('Atenção', message);
      }
      return;
    }

    setLoading(true);

    try {
      if (!BACKEND_URL) {
        throw new Error('EXPO_PUBLIC_BACKEND_URL não configurada');
      }

      const response = await axios.post(
        `${BACKEND_URL}/api/admin/login`,
        { password: password.trim() },
        { timeout: 30000 }
      );

      if (response.data.success) {
        await AsyncStorage.setItem('admin_logged', 'true');
        router.replace('/admin/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.response?.data?.detail || error.message || 'Falha na conexão';
      const isNetworkError = !error.response;
      const details = isNetworkError ? `\n\nURL backend: ${BACKEND_URL || '(não configurada)'}` : '';
      setErrorMessage(message);
      if (Platform.OS !== 'web') {
        Alert.alert('Erro', message + details);
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
      <LinearGradient
        colors={['#1f2937', '#111827']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={64} color="#667eea" />
            </View>
            <Text style={styles.title}>Painel Administrativo</Text>
            <Text style={styles.subtitle}>XXI Feira Tecnológica Fucapi</Text>
          </View>

          <View style={styles.loginBox}>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha de Administrador"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errorMessage) {
                    setErrorMessage('');
                  }
                }}
                secureTextEntry
                placeholderTextColor="#999"
                onSubmitEditing={handleLogin}
              />
            </View>

            {!!errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 48,
    width: '100%',
    maxWidth: 440,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  loginBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    maxWidth: 440,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginBottom: 24,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  errorText: {
    color: '#fca5a5',
    marginBottom: 14,
    marginTop: -6,
    fontSize: 14,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  button: {
    backgroundColor: '#667eea',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
