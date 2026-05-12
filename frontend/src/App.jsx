import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminChangePasswordPage from './pages/AdminChangePasswordPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminTurmasPage from './pages/AdminTurmasPage';
import CameraPage from './pages/CameraPage';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import SuccessPage from './pages/SuccessPage';
import VotingPage from './pages/VotingPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/camera" element={<CameraPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/voting/:userId" element={<VotingPage />} />
      <Route path="/success" element={<SuccessPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/turmas"
        element={
          <ProtectedRoute>
            <AdminTurmasPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute>
            <AdminReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/change-password"
        element={
          <ProtectedRoute>
            <AdminChangePasswordPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
