import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageLoader from '../components/PageLoader';
import StatusBanner from '../components/StatusBanner';
import { api } from '../lib/api';
import { fetchTurmas } from '../lib/turmas';

export default function VotingPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTurma, setSelectedTurma] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function loadTurmas() {
      try {
        const response = await fetchTurmas();
        if (!ignore) {
          setTurmas(response || []);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage('Erro ao carregar os projetos.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadTurmas();
    return () => {
      ignore = true;
    };
  }, []);

  function openVoteConfirmation(turma) {
    if (votingId) {
      return;
    }

    setSelectedTurma(turma);
  }

  function closeVoteConfirmation() {
    if (votingId) {
      return;
    }

    setSelectedTurma(null);
  }

  async function handleVote() {
    if (!selectedTurma) {
      return;
    }

    try {
      setVotingId(selectedTurma._id);
      await api.post('/vote', {
        usuario_id: userId,
        turma_id: selectedTurma._id,
      });
      navigate('/success?status=success');
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao registrar voto.';
      navigate(`/success?status=error&message=${encodeURIComponent(message)}`);
    } finally {
      setVotingId('');
      setSelectedTurma(null);
    }
  }

  if (loading) {
    return <PageLoader message="Carregando projetos..." />;
  }

  return (
    <div className="app-shell app-shell-light">
      <section className="vote-header py-5">
        <div className="container">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
            <div>
              <p className="eyebrow text-primary mb-2">Votacao</p>
              <h1 className="display-6 fw-bold mb-2">Escolha seu projeto favorito</h1>
              <p className="text-secondary mb-0">Selecione um projeto e confirme o voto na proxima etapa.</p>
            </div>
            <Link to="/" className="btn btn-outline-dark rounded-pill px-4">
              Cancelar
            </Link>
          </div>
        </div>
      </section>

      <section className="container pb-5">
        <StatusBanner tone="danger">{errorMessage}</StatusBanner>

        {turmas.length === 0 ? (
          <div className="empty-state">
            <h2 className="h4 mb-2">Nenhum projeto disponivel</h2>
            <p className="text-secondary mb-4">Cadastre turmas no painel administrativo para liberar a votacao.</p>
            <Link to="/" className="btn btn-primary rounded-pill px-4">
              Voltar ao inicio
            </Link>
          </div>
        ) : (
          <div className="row g-4">
            {turmas.map((turma) => (
              <div key={turma._id} className="col-12 col-lg-6">
                <button
                  type="button"
                  className="project-card text-start"
                  onClick={() => openVoteConfirmation(turma)}
                  disabled={Boolean(votingId)}
                >
                  <div
                    className={`project-card-image${turma.foto_base64 ? '' : ' project-card-image-placeholder'}`}
                    style={turma.foto_base64 ? { backgroundImage: `url(data:image/jpeg;base64,${turma.foto_base64})` } : undefined}
                  />
                  <div className="project-card-overlay">
                    <div className="project-badge">Barraca {turma.numero_barraca}</div>
                    {!turma.foto_base64 && <div className="image-placeholder-label">Imagem nao informada</div>}
                    <div className="mt-auto">
                      <h2 className="h3 text-white mb-2">{turma.nome_turma}</h2>
                      <p className="text-white-50 mb-3">{turma.nome_projeto}</p>
                      <span className="btn btn-light rounded-pill px-4">
                        {votingId === turma._id ? 'Registrando voto...' : 'Votar neste projeto'}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedTurma && (
        <div className="modal-backdrop-soft">
          <div className="modal-card">
            <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
              <div>
                <p className="eyebrow text-primary mb-2">Confirmar voto</p>
                <h2 className="h4 mb-1">{selectedTurma.nome_turma}</h2>
                <p className="text-secondary mb-0">{selectedTurma.nome_projeto}</p>
              </div>
              <button
                type="button"
                className="btn btn-outline-dark rounded-pill px-4"
                onClick={closeVoteConfirmation}
                disabled={Boolean(votingId)}
              >
                Fechar
              </button>
            </div>

            <div className="confirmation-panel mb-4">
              <div className="small text-secondary mb-2">Barraca {selectedTurma.numero_barraca}</div>
              <div className="fw-semibold">Revise as informações do projeto antes de confirmar seu voto.</div>
              <div className="text-secondary">Após a confirmação, o voto será registrado em definitivo e não poderá ser alterado.</div>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-dark rounded-pill px-4"
                onClick={closeVoteConfirmation}
                disabled={Boolean(votingId)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary rounded-pill px-4"
                onClick={handleVote}
                disabled={Boolean(votingId)}
              >
                {votingId === selectedTurma._id ? 'Registrando voto...' : 'Confirmar voto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
