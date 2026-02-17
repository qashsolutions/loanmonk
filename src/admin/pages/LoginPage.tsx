// ============================================================
// Admin Login Page
// ============================================================

import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (token: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Admin token is required');
      return;
    }
    onLogin(token.trim());
  };

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>CreditMind Admin</h2>
        <div className="form-group">
          <label>Admin Token</label>
          <input
            type="password"
            placeholder="Enter admin secret"
            value={token}
            onChange={(e) => { setToken(e.target.value); setError(''); }}
          />
        </div>
        {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <button type="submit" className="btn btn-primary">Login</button>
      </form>
    </div>
  );
}
