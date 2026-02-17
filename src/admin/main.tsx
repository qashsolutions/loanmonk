// ============================================================
// Admin Dashboard Entry Point
// React SPA for reviewing assessments, OCEAN scores, overrides
// ============================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout.js';
import { LoginPage } from './pages/LoginPage.js';
import { SessionListPage } from './pages/SessionListPage.js';
import { SessionDetailPage } from './pages/SessionDetailPage.js';
import './styles/admin.css';

function App() {
  const [adminToken, setAdminToken] = React.useState<string | null>(
    localStorage.getItem('creditmind_admin_token')
  );

  const handleLogin = (token: string) => {
    localStorage.setItem('creditmind_admin_token', token);
    setAdminToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('creditmind_admin_token');
    setAdminToken(null);
  };

  if (!adminToken) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter basename="/admin">
      <AdminLayout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<SessionListPage token={adminToken} />} />
          <Route path="/session/:id" element={<SessionDetailPage token={adminToken} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminLayout>
    </BrowserRouter>
  );
}

const root = document.getElementById('admin-root');
if (root) {
  ReactDOM.createRoot(root).render(<App />);
}
