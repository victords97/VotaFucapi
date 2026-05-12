import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

import { BACKEND_URL } from '@/utils/backend';

const IS_WEB = Platform.OS === 'web';
const GUIDANCE_INTERVAL_MS = IS_WEB ? 400 : 750;
const HOLD_REQUIRED_MS = IS_WEB ? 1200 : 800;
const CENTERED_STREAK_REQUIRED = IS_WEB ? 4 : 2;
const AUTO_CAPTURE_FACE_RATIO_MIN = IS_WEB ? 0.12 : 0.06;
const AUTO_CAPTURE_FACE_RATIO_MAX = IS_WEB ? 0.35 : 0.50;
const MOBILE_CENTER_OFFSET_X_MAX = 0.20;
const MOBILE_CENTER_OFFSET_Y_MAX = 0.22;
const MOBILE_CENTER_RATIO_MIN = 0.03;
const MOBILE_CENTER_RATIO_MAX = 0.55;
const GUIDANCE_RATIO_LOW_HINT = IS_WEB ? 0.08 : 0.05;
const GUIDANCE_RATIO_HIGH_HINT = IS_WEB ? 0.45 : 0.55;
const MOBILE_DETECTED_STREAK_FOR_CENTERED = 2;
const MOBILE_CAPTURE_FACE_RATIO_MIN = 0.02;
const MOBILE_CAPTURE_FACE_RATIO_MAX = 0.70;
const GUIDANCE_CAPTURE_QUALITY = IS_WEB ? 0.2 : 0.45;
const GUIDANCE_SKIP_PROCESSING = IS_WEB;
const GUIDANCE_TIMEOUT_MS = IS_WEB ? 5000 : 15000;
const VERIFY_TIMEOUT_MS = IS_WEB ? 60000 : 120000;
const VERIFY_CAPTURE_QUALITY = IS_WEB ? 0.7 : 0.45;
const VERIFY_SKIP_PROCESSING = !IS_WEB;
const MOBILE_MANUAL_CAPTURE_BYPASS_HOLD = true;

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [frameStatus, setFrameStatus] = useState<'neutral' | 'ok' | 'warn'>('neutral');
  const [challengeMessage, setChallengeMessage] = useState('Centralize seu rosto na moldura');
  const [holdProgress, setHoldProgress] = useState(0);

  const cameraRef = useRef<any>(null);
  const guidanceBusyRef = useRef(false);
  const guidanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSpokenRef = useRef('');
  const noFaceStreakRef = useRef(0);
  const centeredStreakRef = useRef(0);
  const detectedStreakRef = useRef(0);
  const lastDetectedRef = useRef(false);
  const lastFaceRatioRef = useRef(0);
  const holdStartedAtRef = useRef<number | null>(null);
  const holdCompletedRef = useRef(false);
  const isCapturingRef = useRef(false);
  const isMountedRef = useRef(true);
  const isFocusedRef = useRef(false);
  const loadingRef = useRef(false);
  const autoCaptureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const takePictureRef = useRef<(autoCapture?: boolean) => Promise<void>>(async () => {});

  const router = useRouter();
  const isFocused = useIsFocused();

  const resetHoldState = () => {
    centeredStreakRef.current = 0;
    holdStartedAtRef.current = null;
    holdCompletedRef.current = false;
    setHoldProgress(0);
  };

  const clearAutoCaptureTimeout = () => {
    if (autoCaptureTimeoutRef.current) {
      clearTimeout(autoCaptureTimeoutRef.current);
      autoCaptureTimeoutRef.current = null;
    }
  };

  const canUseCamera = () => isMountedRef.current && isFocusedRef.current && !!cameraRef.current;

  const stopSpeech = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    lastSpokenRef.current = '';
  };

  const speak = (text: string) => {
    if (lastSpokenRef.current === text) return;
    lastSpokenRef.current = text;
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  useEffect(() => {
    isMountedRef.current = true;
    isFocusedRef.current = isFocused;

    return () => {
      isMountedRef.current = false;
      isFocusedRef.current = false;
      clearAutoCaptureTimeout();
      stopSpeech();
    };
  }, [isFocused]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    isFocusedRef.current = isFocused;
    if (isFocused) return;

    clearAutoCaptureTimeout();
    stopSpeech();
    guidanceBusyRef.current = false;
    isCapturingRef.current = false;
    noFaceStreakRef.current = 0;
    detectedStreakRef.current = 0;
    lastDetectedRef.current = false;
    lastFaceRatioRef.current = 0;
    resetHoldState();
    setLoading(false);
    setFrameStatus('neutral');
    setChallengeMessage('Centralize seu rosto na moldura');
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused || !permission?.granted) return;

    const runGuidanceCheck = async () => {
      if (loadingRef.current || isCapturingRef.current || guidanceBusyRef.current || !canUseCamera()) return;

      try {
        guidanceBusyRef.current = true;

        const snap = await cameraRef.current.takePictureAsync({
          quality: GUIDANCE_CAPTURE_QUALITY,
          base64: true,
          skipProcessing: GUIDANCE_SKIP_PROCESSING,
        });

        if (!isMountedRef.current || !isFocusedRef.current) {
          return;
        }

        if (!snap?.base64) {
          setFrameStatus('warn');
          setChallengeMessage('Nao foi possivel ler a camera. Tente novamente.');
          resetHoldState();
          return;
        }

        const response = await axios.post(
          `${BACKEND_URL}/api/face-guidance`,
          { face_image: snap.base64 },
          { timeout: GUIDANCE_TIMEOUT_MS }
        );

        const detected = !!response.data?.detected;
        const centered = !!response.data?.centered;
        const offsetX = Number(response.data?.offset_x ?? 1);
        const offsetY = Number(response.data?.offset_y ?? 1);
        const faceRatio = Number(response.data?.face_ratio ?? 0);
        lastFaceRatioRef.current = faceRatio;
        const backendGuidance = String(response.data?.message || '').trim();
        if (detected) {
          detectedStreakRef.current += 1;
          lastDetectedRef.current = true;
        } else {
          detectedStreakRef.current = 0;
          lastDetectedRef.current = false;
        }
        const mobileLooseCentered =
          !IS_WEB &&
          detected &&
          offsetX <= MOBILE_CENTER_OFFSET_X_MAX &&
          offsetY <= MOBILE_CENTER_OFFSET_Y_MAX &&
          faceRatio >= MOBILE_CENTER_RATIO_MIN &&
          faceRatio <= MOBILE_CENTER_RATIO_MAX;
        const mobileDetectedFallback =
          !IS_WEB &&
          detected &&
          detectedStreakRef.current >= MOBILE_DETECTED_STREAK_FOR_CENTERED &&
          faceRatio >= MOBILE_CAPTURE_FACE_RATIO_MIN &&
          faceRatio <= MOBILE_CAPTURE_FACE_RATIO_MAX;
        const centeredForCapture = centered || mobileLooseCentered || mobileDetectedFallback;
        const now = Date.now();

        if (!detected) {
          noFaceStreakRef.current += 1;
          resetHoldState();
          setFrameStatus('warn');
          setChallengeMessage(
            noFaceStreakRef.current >= 3
              ? (IS_WEB
                ? 'Rosto fora do foco. Ajuste e tente novamente.'
                : 'Deteccao instavel no celular. Se ja estiver enquadrado, toque no botao para capturar.')
              : 'Nenhum rosto detectado. Entre na moldura.'
          );
          speak('Enquadre seu rosto na moldura.');
          return;
        }
        noFaceStreakRef.current = 0;

        if (centeredForCapture) {
          centeredStreakRef.current += 1;
          if (holdStartedAtRef.current === null) {
            holdStartedAtRef.current = now;
          }

          const elapsedMs = now - (holdStartedAtRef.current ?? now);
          const progress = Math.min(100, Math.round((elapsedMs / HOLD_REQUIRED_MS) * 100));
          setHoldProgress(progress);
          setFrameStatus('ok');

          const faceRatioGoodForCapture = IS_WEB
            ? faceRatio >= AUTO_CAPTURE_FACE_RATIO_MIN && faceRatio <= AUTO_CAPTURE_FACE_RATIO_MAX
            : faceRatio >= MOBILE_CAPTURE_FACE_RATIO_MIN && faceRatio <= MOBILE_CAPTURE_FACE_RATIO_MAX;
          const holdFinished = elapsedMs >= HOLD_REQUIRED_MS;
          const stableCentered = centeredStreakRef.current >= CENTERED_STREAK_REQUIRED;

          if (holdFinished && stableCentered && faceRatioGoodForCapture) {
            holdCompletedRef.current = true;
            setChallengeMessage('Rosto validado. Capturando automaticamente.');
            speak('Rosto validado. Capturando automaticamente.');
            clearAutoCaptureTimeout();
            autoCaptureTimeoutRef.current = setTimeout(() => {
              autoCaptureTimeoutRef.current = null;
              if (isMountedRef.current && isFocusedRef.current && !loadingRef.current && !isCapturingRef.current) {
                void takePictureRef.current(true);
              }
            }, 150);
            return;
          }

          if (!faceRatioGoodForCapture && holdFinished) {
            if (faceRatio < AUTO_CAPTURE_FACE_RATIO_MIN) {
              setChallengeMessage('Aproxime um pouco o rosto da camera.');
              speak('Aproxime um pouco o rosto da camera.');
            } else {
              setChallengeMessage('Afaste um pouco o rosto da camera.');
              speak('Afaste um pouco o rosto da camera.');
            }
            return;
          }

          const remainingMs = Math.max(0, HOLD_REQUIRED_MS - elapsedMs);
          const remainingSeconds = (remainingMs / 1000).toFixed(1);
          const holdMessage = `Rosto centralizado. Mantenha por ${remainingSeconds}s`;
          setChallengeMessage(holdMessage);
          speak('Rosto centralizado. Mantenha-se parado.');
          return;
        }

        resetHoldState();
        setFrameStatus('warn');
        if (faceRatio < GUIDANCE_RATIO_LOW_HINT) {
          setChallengeMessage('Enquadre o rosto e aproxime-se um pouco da camera.');
          speak('Enquadre o rosto na moldura e aproxime-se um pouco.');
        } else if (faceRatio > GUIDANCE_RATIO_HIGH_HINT) {
          setChallengeMessage('Enquadre o rosto e afaste-se um pouco da camera.');
          speak('Enquadre o rosto na moldura e afaste-se um pouco.');
        } else if (backendGuidance) {
          setChallengeMessage(backendGuidance);
          speak(backendGuidance);
        } else {
          setChallengeMessage('Ajuste o rosto para o centro da moldura.');
          speak('Enquadre o rosto no centro da moldura.');
        }
      } catch {
        resetHoldState();
        setFrameStatus('warn');
        setChallengeMessage('Falha na validacao em tempo real.');
      } finally {
        guidanceBusyRef.current = false;
      }
    };

    guidanceTimerRef.current = setInterval(runGuidanceCheck, GUIDANCE_INTERVAL_MS);

    return () => {
      clearAutoCaptureTimeout();
      if (guidanceTimerRef.current) {
        clearInterval(guidanceTimerRef.current);
        guidanceTimerRef.current = null;
      }
      guidanceBusyRef.current = false;
      resetHoldState();
      stopSpeech();
    };
  }, [isFocused, permission?.granted]);

  const takePicture = async (autoCapture = false) => {
    if (!canUseCamera()) {
      const msg = 'Camera nao esta pronta. Tente novamente.';
      if (Platform.OS === 'web') {
        window.alert(`Erro\n\n${msg}`);
      } else {
        Alert.alert('Erro', msg);
      }
      return;
    }

    if (loading || isCapturingRef.current) {
      return;
    }

    if (!holdCompletedRef.current) {
      const mobileFallbackAllowed =
        !IS_WEB &&
        lastDetectedRef.current &&
        lastFaceRatioRef.current >= MOBILE_CAPTURE_FACE_RATIO_MIN &&
        lastFaceRatioRef.current <= MOBILE_CAPTURE_FACE_RATIO_MAX;

      if (mobileFallbackAllowed || (!IS_WEB && MOBILE_MANUAL_CAPTURE_BYPASS_HOLD && !autoCapture)) {
        holdCompletedRef.current = true;
      } else {
        const msg = `Centralize o rosto com precisao e mantenha por ${(HOLD_REQUIRED_MS / 1000).toFixed(1)}s para continuar.`;
        if (Platform.OS === 'web') {
          window.alert(`Atencao\n\n${msg}`);
        } else {
          Alert.alert('Atencao', msg);
        }
        speak(msg);
        return;
      }
    }

    let didNavigate = false;
    try {
      isCapturingRef.current = true;
      setLoading(true);
      setFrameStatus('neutral');
      stopSpeech();

      if (!canUseCamera()) {
        throw new Error('Camera unmounted during taking photo process');
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: VERIFY_CAPTURE_QUALITY,
        base64: true,
        skipProcessing: VERIFY_SKIP_PROCESSING,
      });

      if (!photo.base64) {
        throw new Error('Foto nao capturada corretamente');
      }

      if (!BACKEND_URL) {
        throw new Error('BACKEND_URL nao configurada');
      }

      const response = await axios.post(
        `${BACKEND_URL}/api/verify-face`,
        { face_image: photo.base64 },
        { timeout: VERIFY_TIMEOUT_MS }
      );

      if (response.data.found) {
        setFrameStatus('ok');
        const usuario = response.data.usuario;

        if (usuario.ja_votou) {
          const goHome = () => {
            stopSpeech();
            didNavigate = true;
            router.replace('/');
          };
          if (Platform.OS === 'web') {
            window.alert('Atencao\n\nVoce ja realizou sua votacao!');
            goHome();
          } else {
            Alert.alert('Atencao', 'Voce ja realizou sua votacao!', [
              {
                text: 'OK',
                onPress: goHome,
              },
            ]);
          }
        } else {
          stopSpeech();
          didNavigate = true;
          router.push({
            pathname: '/voting',
            params: { usuario_id: usuario.id },
          });
        }
      } else {
        setFrameStatus('warn');
        stopSpeech();
        didNavigate = true;
        router.push({
          pathname: '/register',
          params: { face_image: photo.base64 },
        });
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || error.message || 'Erro ao processar imagem';
      const lowerMessage = String(message).toLowerCase();
      const isCameraLifecycleError =
        lowerMessage.includes('camera unmounted') ||
        lowerMessage.includes('camera is not running') ||
        lowerMessage.includes('camera not ready');

      if (isCameraLifecycleError) {
        resetHoldState();
        setFrameStatus('warn');
        setChallengeMessage('Camera reiniciando. Posicione o rosto novamente.');
        return;
      }

      const isNetworkError = !error.response;
      const details = isNetworkError
        ? `\n\nURL backend: ${BACKEND_URL || '(nao configurada)'}\nVerifique se o servidor esta online e acessivel na mesma rede.`
        : '';
      const retryText = autoCapture ? '\n\nAjuste o rosto e tente novamente.' : '\n\nTente novamente.';
      const errorText = message + details + retryText;

      if ((message || '').toLowerCase().includes('nenhum rosto detectado')) {
        setFrameStatus('warn');
      }

      if (Platform.OS === 'web') {
        window.alert(`Erro\n\n${errorText}`);
      } else {
        Alert.alert('Erro', errorText);
      }
    } finally {
      isCapturingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
      if (!didNavigate && isMountedRef.current && isFocusedRef.current) {
        resetHoldState();
        setTimeout(() => setFrameStatus('neutral'), 1200);
        setChallengeMessage('Centralize seu rosto na moldura');
      }
    }
  };
  takePictureRef.current = takePicture;

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
        <Text style={styles.permissionText}>Precisamos de acesso a camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Permitir camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" active={isFocused} />
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                stopSpeech();
                router.back();
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Posicione seu rosto</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.faceFrame}>
            <View
              style={[
                styles.headGuide,
                frameStatus === 'ok' && styles.headGuideOk,
                frameStatus === 'warn' && styles.headGuideWarn,
              ]}
            >
              <View style={styles.eyesGuide} />
              <Text style={styles.headHint}>{challengeMessage}</Text>
              <Text style={styles.progressText}>{holdProgress}%</Text>
            </View>
          </View>

          <View style={styles.bottomContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            )}
            <Text style={styles.instructionText}>
              {IS_WEB
                ? `A foto sera capturada automaticamente apos ${(HOLD_REQUIRED_MS / 1000).toFixed(1)}s com o rosto bem centralizado`
                : `No celular, tente enquadrar e aguarde ${(HOLD_REQUIRED_MS / 1000).toFixed(1)}s; se nao disparar, toque no botao`}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
  headGuide: {
    width: 406,
    height: 530,
    borderRadius: 250,
    borderWidth: 4,
    borderColor: 'rgba(148, 163, 184, 0.95)',
    backgroundColor: 'rgba(148, 163, 184, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 26,
  },
  headGuideOk: {
    borderColor: 'rgba(34, 197, 94, 0.98)',
    backgroundColor: 'rgba(34, 197, 94, 0.20)',
  },
  headGuideWarn: {
    borderColor: 'rgba(239, 68, 68, 0.98)',
    backgroundColor: 'rgba(239, 68, 68, 0.20)',
  },
  eyesGuide: {
    width: 130,
    borderTopWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    marginBottom: 14,
  },
  headHint: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 260,
  },
  progressText: {
    marginTop: 12,
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
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
    paddingHorizontal: 18,
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
