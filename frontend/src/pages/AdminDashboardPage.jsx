import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageLoader from '../components/PageLoader';
import StatusBanner from '../components/StatusBanner';
import { api } from '../lib/api';
import { clearAdminLoggedIn } from '../lib/storage';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ total_votos: 0, turmas: [] });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load(silent = false) {
      try {
        if (!silent) {
          setLoading(true);
        }
        const response = await api.get('/admin/results');
        if (!ignore) {
          setData(response.data);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage('Não foi possível carregar os resultados.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();
    const timer = window.setInterval(() => load(true), 5000);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, []);

  const topProject = useMemo(() => data.turmas[0] || null, [data.turmas]);

  async function handleReset() {
    const confirmed = window.confirm(
      'Isso vai apagar usuários, votos e turmas cadastradas. Essa ação não pode ser desfeita. Deseja continuar?'
    );

    if (!confirmed) {
      return;
    }

    try {
      setResetting(true);
      await api.delete('/admin/reset-all');
      const response = await api.get('/admin/results');
      setData(response.data);
    } catch (error) {
      setErrorMessage('Erro ao resetar o sistema.');
    } finally {
      setResetting(false);
    }
  }

  function handleLogout() {
    clearAdminLoggedIn();
    navigate('/', { replace: true });
  }

  if (loading) {
    return <PageLoader message="Carregando dashboard..." />;
  }

  return (
    <div className="app-shell app-shell-light">
      <section className="admin-topbar py-4">
        <div className="container">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
            <div>
              <p className="eyebrow text-info mb-2">Painel administrativo</p>
              <h1 className="display-6 fw-bold text-white mb-1">Dashboard</h1>
              <p className="text-white-50 mb-0">Resultados em tempo real da votação.</p>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-outline-light rounded-pill px-4"
                onClick={handleReset}
                disabled={resetting}
              >
                {resetting ? 'Zerando...' : 'Zerar sistema'}
              </button>
              <button type="button" className="btn btn-light rounded-pill px-4" onClick={handleLogout}>
                Sair
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-4">
        <StatusBanner tone="danger">{errorMessage}</StatusBanner>

        <div className="row g-4 mb-4">
          <div className="col-12 col-md-4">
            <div className="metric-card">
              <div className="metric-label">Total de votos</div>
              <div className="metric-value">{data.total_votos}</div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="metric-card">
              <div className="metric-label">Projetos ativos</div>
              <div className="metric-value">{data.turmas.length}</div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="metric-card">
              <div className="metric-label">Líder atual</div>
              <div className="metric-value small">{topProject ? topProject.nome_turma : 'Sem votos'}</div>
            </div>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-3 mb-4">
          <Link to="/admin/turmas" className="btn btn-primary rounded-pill px-4">
            Gerenciar turmas
          </Link>
          <Link to="/admin/reports" className="btn btn-outline-dark rounded-pill px-4">
            Relatórios
          </Link>
          <Link to="/admin/change-password" className="btn btn-outline-dark rounded-pill px-4">
            Trocar senha
          </Link>
        </div>

        <div className="row g-3">
          {data.turmas.length === 0 ? (
            <div className="col-12">
              <div className="empty-state">
                <h2 className="h4 mb-2">Nenhum resultado disponível</h2>
                <p className="text-secondary mb-0">As turmas aparecerão aqui conforme forem cadastradas.</p>
              </div>
            </div>
          ) : (
            data.turmas.map((turma, index) => {
              const percentage = data.total_votos ? ((turma.votos_count / data.total_votos) * 100).toFixed(1) : '0.0';

              return (
                <div key={turma._id} className="col-12">
                  <div className="result-card">
                    <div className="result-rank">{index + 1}</div>
                    <div className="flex-grow-1">
                      <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-2">
                        <div>
                          <h2 className="h4 mb-1">{turma.nome_turma}</h2>
                          <p className="text-secondary mb-0">{turma.nome_projeto}</p>
                        </div>
                        <div className="text-lg-end">
                          <div className="fw-semibold">{turma.votos_count} votos</div>
                          <div className="text-secondary">Barraca {turma.numero_barraca}</div>
                        </div>
                      </div>
                      <div className="progress metric-progress">
                        <div className="progress-bar" style={{ width: `${percentage}%` }} />
                      </div>
                      <div className="text-secondary small mt-2">{percentage}% do total</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
