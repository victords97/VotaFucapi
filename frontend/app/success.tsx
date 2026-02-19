import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function SuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const success = params.success === 'true';
  const message = params.message as string;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRedirectTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const goHome = () => {
    clearRedirectTimer();
    router.replace('/');
  };

  useEffect(() => {
    // Auto redirect after 5 seconds.
    timerRef.current = setTimeout(() => {
      router.replace('/');
    }, 5000);

    return () => {
      clearRedirectTimer();
    };
  }, [router]);

  return (
    <LinearGradient
      colors={success ? ['#667eea', '#764ba2'] : ['#ef4444', '#dc2626']}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, success ? styles.successIcon : styles.errorIcon]}>
          <Ionicons
            name={success ? 'checkmark-circle' : 'close-circle'}
            size={100}
            color="#fff"
          />
        </View>

        <Text style={styles.title}>{success ? 'Voto Registrado!' : 'Ops!'}</Text>

        <Text style={styles.message}>
          {success
            ? 'Seu voto foi registrado com sucesso.\nObrigado por participar!'
            : message || 'Não foi possível registrar seu voto.'}
        </Text>

        <View style={styles.divider} />

        <Text style={styles.redirectText}>Redirecionando em 5 segundos...</Text>

        <TouchableOpacity style={styles.button} onPress={goHome}>
          <Text style={styles.buttonText}>Voltar ao Início</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    marginBottom: 32,
  },
  successIcon: {
    opacity: 1,
  },
  errorIcon: {
    opacity: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
    opacity: 0.95,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: '#fff',
    marginVertical: 24,
    opacity: 0.5,
  },
  redirectText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 24,
    opacity: 0.8,
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
