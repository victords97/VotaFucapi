import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import StatusBanner from '../components/StatusBanner';
import { api } from '../lib/api';
import { setAdminLoggedIn } from '../lib/storage';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');

    if (!password.trim()) {
      setErrorMessage('Digite a senha de administrador.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/admin/login', { password: password.trim() });
      setAdminLoggedIn(true);
      navigate(location.state?.from || '/admin/dashboard', { replace: true });
    } catch (error) {
      const message = error.response?.data?.detail || error.message || 'Falha no login.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-auth-shell">
      <div className="container py-5">
        <div className="row justify-content-center min-vh-100 align-items-center">
          <div className="col-12 col-md-8 col-xl-5">
            <div className="glass-card p-4 p-lg-5">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <Link to="/" className="btn btn-outline-light rounded-pill px-4">
                  Voltar
                </Link>
                <div className="text-center text-white">
                  <h1 className="h3 mb-1">Painel administrativo</h1>
                  <p className="mb-0 text-white-50">XXI Feira Tecnológica Fucapi</p>
                </div>
                <div style={{ width: 94 }} />
              </div>

              <StatusBanner tone="danger">{errorMessage}</StatusBanner>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="form-label text-white-50">Senha</label>
                  <input
                    type="password"
                    className="form-control form-control-lg"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Digite a senha"
                  />
                </div>
                <div className="d-grid">
                  <button type="submit" className="btn btn-primary btn-lg rounded-pill py-3" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
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
