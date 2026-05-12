import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export default function SuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') || 'success';
  const message = searchParams.get('message') || 'Não foi possível registrar seu voto.';
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => {
      navigate('/', { replace: true });
    }, 5000);

    const countdownTimer = window.setInterval(() => {
      setSecondsLeft((current) => (current > 1 ? current - 1 : 1));
    }, 1000);

    return () => {
      window.clearTimeout(redirectTimer);
      window.clearInterval(countdownTimer);
    };
  }, [navigate]);

  const success = status === 'success';

  return (
    <div className={`success-shell ${success ? 'success-shell-positive' : 'success-shell-negative'}`}>
      <div className="success-card text-center">
        <div className="success-mark mb-4">{success ? 'OK' : 'ERRO'}</div>
        <h1 className="display-5 fw-bold text-white mb-3">{success ? 'Voto registrado' : 'Ops'}</h1>
        <p className="lead text-white-50 mb-4">
          {success ? 'Seu voto foi registrado com sucesso. Obrigado por participar.' : message}
        </p>
        <div className="countdown-wrap mb-4">
          <div className="countdown-ring">
            <span>{secondsLeft}</span>
          </div>
          <p className="text-white-50 mb-0">Redirecionando para a tela inicial em {secondsLeft} segundos...</p>
        </div>
        <Link to="/" className="btn btn-light rounded-pill px-5 py-3">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
