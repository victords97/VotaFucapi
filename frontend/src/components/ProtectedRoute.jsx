import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAdminLoggedIn } from '../lib/storage';

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
