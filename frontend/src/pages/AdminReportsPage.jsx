import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageLoader from '../components/PageLoader';
import StatusBanner from '../components/StatusBanner';
import { api } from '../lib/api';
import { formatHour } from '../lib/utils';

export default function AdminReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadReports() {
      try {
        const response = await api.get('/admin/reports');
        if (!ignore) {
          setData(response.data);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage('Não foi possível carregar os relatórios.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadReports();
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return <PageLoader message="Carregando relatórios..." />;
  }

  const peakVotes = Math.max(data?.horario_pico?.total_votos || 0, 1);

  return (
    <div className="app-shell app-shell-light">
      <section className="admin-subheader py-4">
        <div className="container d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
          <div>
            <p className="eyebrow text-primary mb-2">Análise</p>
            <h1 className="display-6 fw-bold mb-1">Relatórios</h1>
            <p className="text-secondary mb-0">Indicadores consolidados da votação.</p>
          </div>
          <Link to="/admin/dashboard" className="btn btn-outline-dark rounded-pill px-4">
            Voltar
          </Link>
        </div>
      </section>

      <section className="container pb-5">
        <StatusBanner tone="danger">{errorMessage}</StatusBanner>

        <div className="row g-4 mb-4">
          <div className="col-12 col-md-6">
            <div className="metric-card">
              <div className="metric-label">Usuários cadastrados</div>
              <div className="metric-value">{data?.total_usuarios || 0}</div>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="metric-card">
              <div className="metric-label">Total de votos</div>
              <div className="metric-value">{data?.total_votos || 0}</div>
            </div>
          </div>
        </div>

        {data?.horario_pico && (
          <div className="report-card mb-4">
            <div className="eyebrow text-warning mb-2">Horário de pico</div>
            <h2 className="h3 mb-1">{formatHour(data.horario_pico.hora)}</h2>
            <p className="text-secondary mb-0">{data.horario_pico.total_votos} votos nesse horário</p>
          </div>
        )}

        <div className="row g-4">
          <div className="col-12 col-xl-6">
            <div className="report-card h-100">
              <h2 className="h4 mb-4">Votos por horário</h2>
              {(data?.votos_por_hora || []).length === 0 ? (
                <p className="text-secondary mb-0">Sem dados de votos por horário.</p>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {data.votos_por_hora.map((item) => (
                    <div key={item._id}>
                      <div className="d-flex justify-content-between small mb-1">
                        <span>{formatHour(item._id)}</span>
                        <span>{item.count} votos</span>
                      </div>
                      <div className="progress metric-progress">
                        <div className="progress-bar" style={{ width: `${(item.count / peakVotes) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-12 col-xl-6">
            <div className="report-card h-100">
              <h2 className="h4 mb-4">Top 5 projetos</h2>
              {(data?.top_projetos || []).length === 0 ? (
                <p className="text-secondary mb-0">Sem ranking disponível.</p>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {data.top_projetos.map((projeto, index) => (
                    <div key={projeto._id} className="ranking-row">
                      <div className="ranking-index">{index + 1}</div>
                      <div className="flex-grow-1">
                        <div className="fw-semibold">{projeto.nome_projeto}</div>
                        <div className="text-secondary small">{projeto.nome_turma}</div>
                      </div>
                      <div className="fw-semibold">{projeto.votos_count} votos</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
