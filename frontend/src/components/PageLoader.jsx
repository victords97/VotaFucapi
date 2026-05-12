import React from 'react';

export default function PageLoader({ message = 'Carregando...' }) {
  return (
    <div className="app-shell app-shell-dark d-flex align-items-center justify-content-center">
      <div className="text-center text-white">
        <div className="spinner-border mb-3" role="status" aria-hidden="true" />
        <div>{message}</div>
      </div>
    </div>
  );
}
