// ============================================================
// Admin Dashboard Layout — Sidebar + Content Area
// ============================================================

import React from 'react';
import { NavLink } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

export function AdminLayout({ children, onLogout }: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">CreditMind Admin</div>
        <nav className="admin-sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
            Sessions
          </NavLink>
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}
