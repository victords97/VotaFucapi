import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StatusBanner from '../components/StatusBanner';
import { api } from '../lib/api';
import { clearPendingFaceImage, getPendingFaceImage } from '../lib/storage';
import { formatCpf, formatPhone } from '../lib/utils';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [faceImage, setFaceImage] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const value = getPendingFaceImage();
    if (!value) {
      navigate('/camera', { replace: true });
      return;
    }

    setFaceImage(value);
  }, [navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');

    if (!nome.trim() || !cpf.trim() || !telefone.trim()) {
      setErrorMessage('Preencha todos os campos.');
      return;
    }

    if (cpf.replace(/\D/g, '').length !== 11) {
      setErrorMessage('CPF inválido.');
      return;
    }

    if (!lgpdAccepted) {
      setErrorMessage('Você precisa aceitar o termo LGPD.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/register', {
        nome: nome.trim(),
        cpf: cpf.replace(/\D/g, ''),
        telefone: telefone.replace(/\D/g, ''),
        face_image: faceImage,
        lgpd_aceito: true,
      });

      clearPendingFaceImage();
      navigate(`/voting/${response.data.usuario_id}`);
    } catch (error) {
      const message = error.response?.data?.detail || error.message || 'Erro ao cadastrar.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-7">
            <div className="glass-card p-4 p-lg-5">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <Link to="/camera" className="btn btn-outline-light rounded-pill px-4">
                  Voltar
                </Link>
                <h1 className="h3 text-white mb-0">Pré-cadastro</h1>
                <div style={{ width: 94 }} />
              </div>

              <p className="text-white-50 mb-4">Complete seus dados para concluir a identificação.</p>
              <StatusBanner tone="danger">{errorMessage}</StatusBanner>

              <form className="row g-3" onSubmit={handleSubmit}>
                <div className="col-12">
                  <label className="form-label text-white-50">Nome completo</label>
                  <input
                    className="form-control form-control-lg"
                    value={nome}
                    onChange={(event) => setNome(event.target.value)}
                    placeholder="Digite seu nome"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label text-white-50">CPF</label>
                  <input
                    className="form-control form-control-lg"
                    value={cpf}
                    onChange={(event) => setCpf(formatCpf(event.target.value))}
                    maxLength={14}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label text-white-50">Telefone</label>
                  <input
                    className="form-control form-control-lg"
                    value={telefone}
                    onChange={(event) => setTelefone(formatPhone(event.target.value))}
                    maxLength={15}
                    placeholder="(92) 99999-9999"
                  />
                </div>

                <div className="col-12">
                  <div className="form-check form-switch text-white">
                    <input
                      id="lgpd"
                      className="form-check-input"
                      type="checkbox"
                      checked={lgpdAccepted}
                      onChange={(event) => setLgpdAccepted(event.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="lgpd">
                      Aceito o uso dos meus dados e biometria facial para identificação do participante.
                    </label>
                  </div>
                  <button
                    type="button"
                    className="btn btn-link px-0 text-info text-decoration-none mt-2"
                    onClick={() => setShowTerms(true)}
                  >
                    Ler termo LGPD
                  </button>
                </div>

                <div className="col-12 d-grid">
                  <button type="submit" className="btn btn-primary btn-lg rounded-pill py-3" disabled={loading}>
                    {loading ? 'Cadastrando...' : 'Concluir cadastro'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {showTerms && (
        <div className="modal-backdrop-soft">
          <div className="modal-card">
            <h2 className="h4 mb-3">Termo LGPD</h2>
            <p className="text-secondary">
              Autorizo o tratamento dos dados pessoais informados neste sistema, incluindo nome, CPF,
              telefone e biometria facial, exclusivamente para identificação do participante, controle
              de voto único e geração de relatórios internos da votação.
            </p>
            <p className="text-secondary mb-4">
              Os dados não serão usados para outra finalidade e poderão ser removidos conforme as políticas
              definidas pela organização.
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
