import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StatusBanner from '../components/StatusBanner';
import { api } from '../lib/api';
import { prefetchTurmas } from '../lib/turmas';

const GUIDANCE_INTERVAL_MS = 900;
const HOLD_REQUIRED_MS = 1400;
const CENTER_RATIO_MIN = 0.08;
const CENTER_RATIO_MAX = 0.42;

function captureFrame(video, quality = 0.65, targetWidth = 720) {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, targetWidth / video.videoWidth);
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality).split(',')[1];
}

function speakOnce(message, ref) {
  if (!message || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  if (ref.current === message) {
    return;
  }

  ref.current = message;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(message));
}

export default function CameraPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const guidanceBusyRef = useRef(false);
  const captureBusyRef = useRef(false);
  const holdStartedAtRef = useRef(null);
  const lastSpokenRef = useRef('');

  const [permissionState, setPermissionState] = useState('pending');
  const [cameraReady, setCameraReady] = useState(false);
  const [frameTone, setFrameTone] = useState('neutral');
  const [challengeMessage, setChallengeMessage] = useState('Centralize seu rosto na moldura.');
  const [holdProgress, setHoldProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastDetection, setLastDetection] = useState({ detected: false, ratio: 0 });
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [cameraConsentGranted, setCameraConsentGrantedState] = useState(false);

  const canCapture = useMemo(
    () => lastDetection.detected && lastDetection.ratio >= CENTER_RATIO_MIN && lastDetection.ratio <= 0.65,
    [lastDetection]
  );

  useEffect(() => {
    prefetchTurmas();
  }, []);

  useEffect(() => {
    if (!cameraConsentGranted) {
      return undefined;
    }

    let cancelled = false;

    async function enableCamera() {
      try {
        setPermissionState('pending');
        setStatusMessage('');

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        setPermissionState('granted');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        if (!cancelled) {
          setPermissionState('denied');
          setStatusMessage('Nao foi possivel acessar a camera. Verifique a permissao do navegador.');
        }
      }
    }

    enableCamera();

    return () => {
      cancelled = true;
      window.speechSynthesis?.cancel();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraConsentGranted]);

  useEffect(() => {
    if (!cameraReady || permissionState !== 'granted') {
      return undefined;
    }

    const timer = window.setInterval(async () => {
      if (!videoRef.current || guidanceBusyRef.current || captureBusyRef.current || loading) {
        return;
      }

      try {
        guidanceBusyRef.current = true;
        const faceImage = captureFrame(videoRef.current, 0.42, 640);
        const response = await api.post('/face-guidance', { face_image: faceImage }, { timeout: 12000 });
        const detected = Boolean(response.data?.detected);
        const centered = Boolean(response.data?.centered);
        const faceRatio = Number(response.data?.face_ratio ?? 0);
        const message = String(response.data?.message || '').trim();

        setLastDetection({ detected, ratio: faceRatio });

        if (!detected) {
          holdStartedAtRef.current = null;
          setHoldProgress(0);
          setFrameTone('warn');
          setChallengeMessage('Nenhum rosto detectado. Entre na moldura.');
          speakOnce('Enquadre seu rosto na moldura.', lastSpokenRef);
          return;
        }

        if (centered && faceRatio >= CENTER_RATIO_MIN && faceRatio <= CENTER_RATIO_MAX) {
          const now = Date.now();
          if (!holdStartedAtRef.current) {
            holdStartedAtRef.current = now;
          }

          const elapsed = now - holdStartedAtRef.current;
          const progress = Math.min(100, Math.round((elapsed / HOLD_REQUIRED_MS) * 100));
          setHoldProgress(progress);
          setFrameTone('ok');

          if (elapsed >= HOLD_REQUIRED_MS) {
            setChallengeMessage('Rosto validado. Capturando automaticamente.');
            speakOnce('Rosto validado. Capturando automaticamente.', lastSpokenRef);
            await handleCapture(true);
            return;
          }

          setChallengeMessage(`Rosto centralizado. Mantenha-se parado por ${((HOLD_REQUIRED_MS - elapsed) / 1000).toFixed(1)}s.`);
          speakOnce('Rosto centralizado. Mantenha-se parado.', lastSpokenRef);
          return;
        }

        holdStartedAtRef.current = null;
        setHoldProgress(0);
        setFrameTone('warn');
        setChallengeMessage(message || 'Ajuste o rosto para o centro da moldura.');
        speakOnce(message || 'Ajuste o rosto para o centro da moldura.', lastSpokenRef);
      } catch (error) {
        holdStartedAtRef.current = null;
        setHoldProgress(0);
        setFrameTone('warn');
        setChallengeMessage('Falha na validacao em tempo real.');
      } finally {
        guidanceBusyRef.current = false;
      }
    }, GUIDANCE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [cameraReady, loading, permissionState]);

  function handleConsentContinue() {
    setCameraConsentGrantedState(true);
    setStatusMessage('');
  }

  async function handleCapture(autoCapture = false) {
    if (!videoRef.current || captureBusyRef.current || !cameraReady) {
      return;
    }

    if (!autoCapture && !canCapture) {
      setStatusMessage('Centralize o rosto com mais precisao antes de capturar.');
      return;
    }

    try {
      captureBusyRef.current = true;
      setLoading(true);
      setStatusMessage('');
      const faceImage = captureFrame(videoRef.current, 0.72, 960);
      const response = await api.post('/verify-face', { face_image: faceImage }, { timeout: 120000 });

      if (response.data?.found) {
        const usuario = response.data.usuario;

        if (usuario?.ja_votou) {
          window.alert('Voce ja realizou sua votacao.');
          navigate('/', { replace: true });
          return;
        }

        navigate(`/voting/${usuario.id}`);
        return;
      }

      throw new Error('A verificacao nao retornou um usuario valido.');
    } catch (error) {
      const message = error.response?.data?.detail || error.message || 'Erro ao processar imagem.';
      setStatusMessage(message);
      setFrameTone('warn');
      holdStartedAtRef.current = null;
      setHoldProgress(0);
    } finally {
      captureBusyRef.current = false;
      setLoading(false);
    }
  }

  if (!cameraConsentGranted) {
    return (
      <div className="auth-shell">
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8">
              <div className="glass-card p-4 p-lg-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <Link to="/" className="btn btn-outline-light rounded-pill px-4">
                    Voltar
                  </Link>
                  <h1 className="h3 text-white mb-0">Autorização de biometria</h1>
                  <div style={{ width: 94 }} />
                </div>

                <p className="text-white-50 mb-4">
                  Antes de liberar a câmera, precisamos da sua autorização para usar a imagem e a biometria facial
                  exclusivamente na identificação do participante durante a votação.
                </p>

                <div className="glass-consent-panel mb-4">
                  <div className="text-white fw-semibold mb-2">Finalidade do tratamento</div>
                  <div className="text-white-50">
                    A captura facial será utilizada apenas para validar a identidade do participante, impedir votos em
                    duplicidade e registrar a participação no processo de votação.
                  </div>
                </div>

                <div className="form-check text-white mb-3">
                  <input
                    id="camera-lgpd"
                    className="form-check-input"
                    type="checkbox"
                    checked={lgpdAccepted}
                    onChange={(event) => setLgpdAccepted(event.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="camera-lgpd">
                    Li e autorizo o tratamento da minha imagem e biometria facial para identificação no sistema de
                    votacao, nos termos da LGPD.
                  </label>
                </div>

                <button
                  type="button"
                  className="btn btn-link px-0 text-info text-decoration-none mb-4"
                  onClick={() => setShowTerms(true)}
                >
                  Ler termo completo
                </button>

                <div className="d-grid">
                  <button
                    type="button"
                    className="btn btn-primary btn-lg rounded-pill py-3"
                    onClick={handleConsentContinue}
                    disabled={!lgpdAccepted}
                  >
                    Continuar para a câmera
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showTerms && (
          <div className="modal-backdrop-soft">
            <div className="modal-card">
              <h2 className="h4 mb-3">Termo de autorização LGPD</h2>
              <p className="text-secondary">
                Autorizo o tratamento dos dados pessoais informados neste sistema, incluindo imagem, biometria facial,
                nome, CPF e telefone, exclusivamente para identificação do participante, prevenção de votos em
                duplicidade e geração de registros internos do processo de votação.
              </p>
              <p className="text-secondary mb-4">
                Os dados não serão utilizados para finalidades estranhas ao processo de votação e observarão as
                políticas definidas pela organização, em conformidade com a LGPD.
              </p>
              <div className="d-flex justify-content-end">
                <button type="button" className="btn btn-dark rounded-pill px-4" onClick={() => setShowTerms(false)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="camera-shell">
      <div className="camera-video-wrap">
        <video
          ref={videoRef}
          className="camera-video"
          playsInline
          muted
          onLoadedMetadata={() => setCameraReady(true)}
        />
        <div className="camera-overlay" />

        <div className="camera-ui container py-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <Link to="/" className="btn btn-outline-light rounded-pill px-4">
              Voltar
            </Link>
            <span className="text-white fw-semibold">Posicione seu rosto</span>
            <div style={{ width: 94 }} />
          </div>

          <div className="camera-stage">
            <div className={`face-guide face-guide-${frameTone}`}>
              <div className="face-guide-eyes" />
              <div className="face-guide-message">{challengeMessage}</div>
              <div className="face-guide-progress">{holdProgress}%</div>
            </div>
          </div>

          <div className="camera-bottom text-center">
            <button
              type="button"
              className="capture-button"
              onClick={() => handleCapture(false)}
              disabled={loading || permissionState !== 'granted'}
            >
              <span className="capture-button-inner" />
            </button>
            <p className="camera-instruction text-white-50 mb-3">
              A foto sera capturada automaticamente quando o rosto estiver centralizado.
            </p>
            {permissionState === 'denied' && (
              <StatusBanner tone="danger">Permita o uso da camera no navegador para continuar.</StatusBanner>
            )}
            {statusMessage && <StatusBanner tone="warning">{statusMessage}</StatusBanner>}
            {loading && (
              <div className="text-white mt-3">
                <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Processando imagem...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
