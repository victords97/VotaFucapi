import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200' }}
      style={styles.container}
      blurRadius={3}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
        style={styles.overlay}
      >
        <View style={styles.content}>
          <Text style={styles.title}>XXI Feira</Text>
          <Text style={styles.title}>Tecnológica</Text>
          <Text style={styles.subtitle}>Fucapi</Text>
          
          <View style={styles.divider} />
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/camera')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>INICIAR VOTAÇÃO</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => router.push('/admin/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.adminButtonText}>Painel Administrativo</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 32,
    fontWeight: '300',
    color: '#ffffff',
    marginTop: 8,
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  divider: {
    width: 80,
    height: 4,
    backgroundColor: '#667eea',
    marginVertical: 40,
    borderRadius: 2,
  },
  button: {
    width: width * 0.7,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  adminButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  adminButtonText: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.8,
    textDecorationLine: 'underline',
  },
});
