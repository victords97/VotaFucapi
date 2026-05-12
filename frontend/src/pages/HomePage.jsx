import React from 'react';
import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="hero-shell">
      <div className="hero-overlay" />
      <div className="container position-relative">
        <div className="row min-vh-100 align-items-center justify-content-center">
          <div className="col-12 col-lg-7 text-center text-white">
            <div className="eyebrow mb-3">Votação com biometria facial</div>
            <h1 className="display-2 fw-bold text-uppercase hero-title">XXI Feira Tecnológica</h1>
            <p className="hero-subtitle mb-5">Fucapi</p>
            <div className="d-grid gap-3 col-12 col-md-8 mx-auto">
              <Link to="/camera" className="btn btn-primary btn-lg rounded-pill py-3 shadow-lg">
                Iniciar votação
              </Link>
              <Link to="/admin/login" className="btn btn-link text-white text-decoration-none">
                Painel administrativo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
