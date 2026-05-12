import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StatusBanner from '../components/StatusBanner';
import { api } from '../lib/api';

export default function AdminChangePasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('danger');

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setTone('danger');
      setMessage('Preencha todos os campos.');
      return;
    }

    if (form.newPassword.length < 6) {
      setTone('danger');
      setMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setTone('danger');
      setMessage('As senhas não coincidem.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/admin/change-password', {
        current_password: form.currentPassword,
        new_password: form.newPassword,
      });
      setTone('success');
      setMessage('Senha alterada com sucesso.');
      window.setTimeout(() => navigate('/admin/dashboard'), 1200);
    } catch (error) {
      const detail = error.response?.data?.detail || 'Erro ao alterar senha.';
      setTone('danger');
      setMessage(detail);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-auth-shell">
      <div className="container py-5">
        <div className="row justify-content-center min-vh-100 align-items-center">
          <div className="col-12 col-lg-7">
            <div className="glass-card p-4 p-lg-5">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <Link to="/admin/dashboard" className="btn btn-outline-light rounded-pill px-4">
                  Voltar
                </Link>
                <h1 className="h3 text-white mb-0">Alterar senha</h1>
                <div style={{ width: 94 }} />
              </div>

              <p className="text-white-50 mb-4">Escolha uma nova senha para o painel administrativo.</p>
              <StatusBanner tone={tone}>{message}</StatusBanner>

              <form className="row g-3" onSubmit={handleSubmit}>
                <div className="col-12">
                  <label className="form-label text-white-50">Senha atual</label>
                  <input
                    type="password"
                    className="form-control form-control-lg"
                    value={form.currentPassword}
                    onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label text-white-50">Nova senha</label>
                  <input
                    type="password"
                    className="form-control form-control-lg"
                    value={form.newPassword}
                    onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label text-white-50">Confirmar nova senha</label>
                  <input
                    type="password"
                    className="form-control form-control-lg"
                    value={form.confirmPassword}
                    onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  />
                </div>

                <div className="col-12 d-grid">
                  <button type="submit" className="btn btn-primary btn-lg rounded-pill py-3" disabled={loading}>
                    {loading ? 'Alterando...' : 'Alterar senha'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
