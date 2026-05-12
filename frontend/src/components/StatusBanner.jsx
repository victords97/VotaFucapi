import React from 'react';

export default function StatusBanner({ tone = 'info', children }) {
  if (!children) {
    return null;
  }

  const toneClass = {
    danger: 'alert-danger',
    success: 'alert-success',
    warning: 'alert-warning',
    info: 'alert-light',
  }[tone] || 'alert-light';

  return (
    <div className={`alert ${toneClass} border-0 shadow-sm`} role="alert">
      {children}
    </div>
  );
}
