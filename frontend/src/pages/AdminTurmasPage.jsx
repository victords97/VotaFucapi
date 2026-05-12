import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageLoader from '../components/PageLoader';
import StatusBanner from '../components/StatusBanner';
import { api } from '../lib/api';
import { fileToBase64 } from '../lib/utils';

const initialForm = {
  nome_turma: '',
  nome_projeto: '',
  numero_barraca: '',
  foto_base64: '',
};

const initialFieldErrors = {
  nome_turma: '',
  nome_projeto: '',
  numero_barraca: '',
};

export default function AdminTurmasPage() {
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState(initialFieldErrors);

  useEffect(() => {
    loadTurmas();
  }, []);

  async function loadTurmas() {
    try {
      setLoading(true);
      const response = await api.get('/admin/turmas');
      setTurmas(response.data || []);
    } catch (error) {
      setErrorMessage('Erro ao carregar as turmas.');
    } finally {
      setLoading(false);
    }
  }

  function resetModalState() {
    setFieldErrors(initialFieldErrors);
    setErrorMessage('');
  }

  function openCreateModal() {
    setEditingId('');
    setForm(initialForm);
    resetModalState();
    setModalOpen(true);
  }

  function openEditModal(turma) {
    setEditingId(turma._id);
    setForm({
      nome_turma: turma.nome_turma || '',
      nome_projeto: turma.nome_projeto || '',
      numero_barraca: turma.numero_barraca || '',
      foto_base64: turma.foto_base64 || '',
    });
    resetModalState();
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModalOpen(false);
  }

  function validateForm(values) {
    return {
      nome_turma: values.nome_turma.trim() ? '' : 'Informe o nome da turma.',
      nome_projeto: values.nome_projeto.trim() ? '' : 'Informe o nome do projeto.',
      numero_barraca: values.numero_barraca.trim() ? '' : 'Informe o numero da barraca.',
    };
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const value = await fileToBase64(file);
      setForm((current) => ({ ...current, foto_base64: value }));
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');

    const nextFieldErrors = validateForm(form);
    setFieldErrors(nextFieldErrors);

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setErrorMessage('Preencha os campos obrigatorios destacados antes de salvar.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        nome_turma: form.nome_turma.trim(),
        nome_projeto: form.nome_projeto.trim(),
        numero_barraca: form.numero_barraca.trim(),
        foto_base64: form.foto_base64 || '',
      };

      if (editingId) {
        await api.put(`/admin/turmas/${editingId}`, payload);
      } else {
        await api.post('/admin/turmas', payload);
      }

      setModalOpen(false);
      setForm(initialForm);
      setEditingId('');
      resetModalState();
      await loadTurmas();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao salvar a turma.';
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(turma) {
    const confirmed = window.confirm(`Deseja realmente excluir "${turma.nome_turma}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/admin/turmas/${turma._id}`);
      await loadTurmas();
    } catch (error) {
      setErrorMessage('Erro ao excluir a turma.');
    }
  }

  if (loading) {
    return <PageLoader message="Carregando turmas..." />;
  }

  return (
    <div className="app-shell app-shell-light">
      <section className="admin-subheader py-4">
        <div className="container d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
          <div>
            <p className="eyebrow text-primary mb-2">Administracao</p>
            <h1 className="display-6 fw-bold mb-1">Gerenciar turmas</h1>
            <p className="text-secondary mb-0">Cadastre, edite e remova projetos da feira.</p>
          </div>
          <div className="d-flex gap-2">
            <Link to="/admin/dashboard" className="btn btn-outline-dark rounded-pill px-4">
              Voltar
            </Link>
            <button type="button" className="btn btn-primary rounded-pill px-4" onClick={openCreateModal}>
              Nova turma
            </button>
          </div>
        </div>
      </section>

      <section className="container pb-5">
        <StatusBanner tone="danger">{errorMessage}</StatusBanner>

        {turmas.length === 0 ? (
          <div className="empty-state">
            <h2 className="h4 mb-2">Nenhuma turma cadastrada</h2>
            <p className="text-secondary mb-4">Use o botao acima para cadastrar o primeiro projeto.</p>
            <button type="button" className="btn btn-primary rounded-pill px-4" onClick={openCreateModal}>
              Adicionar turma
            </button>
          </div>
        ) : (
          <div className="row g-4">
            {turmas.map((turma) => (
              <div key={turma._id} className="col-12 col-xl-6">
                <div className="admin-project-card">
                  <div
                    className={`admin-project-image${turma.foto_base64 ? '' : ' admin-project-image-placeholder'}`}
                    style={turma.foto_base64 ? { backgroundImage: `url(data:image/jpeg;base64,${turma.foto_base64})` } : undefined}
                  >
                    {!turma.foto_base64 && <span className="image-placeholder-label">Sem imagem</span>}
                  </div>
                  <div className="admin-project-body">
                    <div className="d-flex justify-content-between gap-3">
                      <div>
                        <h2 className="h4 mb-1">{turma.nome_turma}</h2>
                        <p className="text-secondary mb-1">{turma.nome_projeto}</p>
                        <div className="small text-secondary">Barraca {turma.numero_barraca}</div>
                        <div className="small fw-semibold mt-2">{turma.votos_count} votos</div>
                      </div>
                      <div className="d-flex flex-column gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-dark rounded-pill px-3"
                          onClick={() => openEditModal(turma)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger rounded-pill px-3"
                          onClick={() => handleDelete(turma)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="modal-backdrop-soft">
          <div className="modal-card modal-card-wide">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="h4 mb-0">{editingId ? 'Editar turma' : 'Nova turma'}</h2>
              <button type="button" className="btn btn-dark rounded-pill px-4" onClick={closeModal} disabled={saving}>
                Fechar
              </button>
            </div>

            <form className="row g-3" onSubmit={handleSubmit}>
              <div className="col-12 col-md-6">
                <label className="form-label">Nome da turma</label>
                <input
                  className={`form-control${fieldErrors.nome_turma ? ' is-invalid' : ''}`}
                  value={form.nome_turma}
                  onChange={(event) => updateField('nome_turma', event.target.value)}
                />
                {fieldErrors.nome_turma && <div className="invalid-feedback d-block">{fieldErrors.nome_turma}</div>}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Nome do projeto</label>
                <input
                  className={`form-control${fieldErrors.nome_projeto ? ' is-invalid' : ''}`}
                  value={form.nome_projeto}
                  onChange={(event) => updateField('nome_projeto', event.target.value)}
                />
                {fieldErrors.nome_projeto && <div className="invalid-feedback d-block">{fieldErrors.nome_projeto}</div>}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Numero da barraca</label>
                <input
                  className={`form-control${fieldErrors.numero_barraca ? ' is-invalid' : ''}`}
                  value={form.numero_barraca}
                  onChange={(event) => updateField('numero_barraca', event.target.value)}
                />
                {fieldErrors.numero_barraca && <div className="invalid-feedback d-block">{fieldErrors.numero_barraca}</div>}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">
                  Imagem do projeto <span className="text-secondary">(opcional)</span>
                </label>
                <input className="form-control" type="file" accept="image/*" onChange={handleImageChange} />
                <div className="form-text">Se quiser, voce pode salvar o projeto sem foto.</div>
              </div>
              {form.foto_base64 && (
                <div className="col-12">
                  <div className="preview-block">
                    <img
                      src={`data:image/jpeg;base64,${form.foto_base64}`}
                      alt="Preview do projeto"
                      className="preview-image"
                    />
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary rounded-pill px-4"
                      onClick={() => setForm((current) => ({ ...current, foto_base64: '' }))}
                    >
                      Remover imagem
                    </button>
                  </div>
                </div>
              )}
              <div className="col-12 d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-dark rounded-pill px-4" onClick={closeModal} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary rounded-pill px-4" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
