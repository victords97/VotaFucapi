import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const BACKEND_URL = EXPO_PUBLIC_BACKEND_URL?.replace(/\/+$/, '');

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  const takePicture = async () => {
    if (!cameraRef.current) {
      console.log('Camera ref not available');
      Alert.alert('Erro', 'Câmera não está pronta. Tente novamente.');
      return;
    }

    try {
      setLoading(true);
      console.log('Taking picture...');

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });

      console.log('Picture taken, base64 length:', photo.base64?.length);

      if (!photo.base64) {
        throw new Error('Foto não capturada corretamente');
      }

      if (!BACKEND_URL) {
        throw new Error('EXPO_PUBLIC_BACKEND_URL não configurada');
      }

      console.log('Sending to backend:', BACKEND_URL);

      const response = await axios.post(
        `${BACKEND_URL}/api/verify-face`,
        { face_image: photo.base64 },
        { timeout: 60000 }
      );

      console.log('Backend response:', response.data);

      if (response.data.found) {
        const usuario = response.data.usuario;

        if (usuario.ja_votou) {
          Alert.alert('Atenção', 'Você já realizou sua votação!', [
            {
              text: 'OK',
              onPress: () => router.push('/'),
            },
          ]);
        } else {
          router.push({
            pathname: '/voting',
            params: { usuario_id: usuario.id },
          });
        }
      } else {
        router.push({
          pathname: '/register',
          params: { face_image: photo.base64 },
        });
      }
    } catch (error: any) {
      console.error('Error taking picture:', error);
      const message = error.response?.data?.detail || error.message || 'Erro ao processar imagem';
      const isNetworkError = !error.response;
      const details = isNetworkError
        ? `\n\nURL backend: ${BACKEND_URL || '(não configurada)'}\nVerifique se o servidor está online e acessível na mesma rede.`
        : '';
      Alert.alert('Erro', message + details + '\n\nTente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Precisamos de acesso à câmera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Permitir Câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front">
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Posicione seu rosto</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.faceFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <View style={styles.bottomContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            )}
            <Text style={styles.instructionText}>Toque para capturar sua foto</Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  faceFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 60,
  },
  corner: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderColor: '#667eea',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 60,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 60,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 60,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 60,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  bottomContainer: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
