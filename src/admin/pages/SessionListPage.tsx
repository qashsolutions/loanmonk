// ============================================================
// Session List Page — All assessments with filters and sorting
// ============================================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api.js';

interface SessionListPageProps {
  token: string;
}

interface SessionItem {
  session_id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  duration_sec: number | null;
  status: string;
  pd_blended: number | null;
  risk_rating: string | null;
  decision: string;
  money_profile: string | null;
  consistency_flag: string | null;
}

interface SessionsResponse {
  sessions: SessionItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export function SessionListPage({ token }: SessionListPageProps) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchSessions = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getSessions(token, {
        page,
        limit: 25,
        risk_rating: riskFilter || undefined,
        status: statusFilter || undefined,
        sort_by: 'started_at',
        sort_order: 'desc',
      }) as SessionsResponse;
      setSessions(data.sessions);
      setPagination({ page: data.pagination.page, total_pages: data.pagination.total_pages, total: data.pagination.total });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, [riskFilter, statusFilter]);

  const getRiskBadge = (rating: string | null) => {
    if (!rating) return <span className="badge badge-neutral">N/A</span>;
    const classes: Record<string, string> = {
      low: 'badge-success',
      moderate: 'badge-warning',
      elevated: 'badge-danger',
    };
    return <span className={`badge ${classes[rating] || 'badge-neutral'}`}>{rating}</span>;
  };

  const getDecisionBadge = (decision: string) => {
    const classes: Record<string, string> = {
      approved: 'badge-success',
      pending_approval: 'badge-info',
      manual_review: 'badge-warning',
      declined: 'badge-danger',
      pending: 'badge-neutral',
    };
    return <span className={`badge ${classes[decision] || 'badge-neutral'}`}>{decision.replace('_', ' ')}</span>;
  };

  const getConsistencyDot = (flag: string | null) => {
    if (!flag) return null;
    const colors: Record<string, string> = {
      highly_consistent: 'green',
      normal_variance: 'green',
      moderate_discrepancy: 'amber',
      high_discrepancy: 'red',
    };
    return (
      <div className="consistency-indicator">
        <div className={`consistency-dot ${colors[flag] || 'amber'}`} />
        <span style={{ fontSize: 11 }}>{flag.replace(/_/g, ' ')}</span>
      </div>
    );
  };

  return (
    <div>
      <div className="admin-header">
        <h1>Assessment Sessions</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} style={{ width: 140 }}>
            <option value="">All Risk Levels</option>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="elevated">Elevated</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 140 }}>
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="phase1_complete">Phase 1 Only</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{pagination.total}</div>
          <div className="stat-label">Total Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {sessions.filter(s => s.decision === 'approved').length}
          </div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--warning)' }}>
            {sessions.filter(s => s.decision === 'manual_review' || s.decision === 'pending_approval').length}
          </div>
          <div className="stat-label">Pending Review</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {sessions.filter(s => s.consistency_flag === 'high_discrepancy').length}
          </div>
          <div className="stat-label">Flagged</div>
        </div>
      </div>

      {error && <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>{error}</div>}

      <div className="card">
        <div className="table-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading sessions...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>PD Score</th>
                  <th>Risk</th>
                  <th>Decision</th>
                  <th>Profile</th>
                  <th>Consistency</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr
                    key={s.session_id}
                    onClick={() => navigate(`/session/${s.session_id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{s.user_id.slice(0, 16)}...</td>
                    <td>{new Date(s.started_at).toLocaleDateString()}</td>
                    <td>{s.duration_sec ? `${Math.floor(s.duration_sec / 60)}:${String(s.duration_sec % 60).padStart(2, '0')}` : '-'}</td>
                    <td style={{ fontWeight: 600 }}>{s.pd_blended != null ? `${(s.pd_blended * 100).toFixed(1)}%` : '-'}</td>
                    <td>{getRiskBadge(s.risk_rating)}</td>
                    <td>{getDecisionBadge(s.decision)}</td>
                    <td style={{ fontSize: 12 }}>{s.money_profile || '-'}</td>
                    <td>{getConsistencyDot(s.consistency_flag)}</td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No sessions found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button
              className="btn btn-outline"
              disabled={pagination.page <= 1}
              onClick={() => fetchSessions(pagination.page - 1)}
            >
              Previous
            </button>
            <span style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <button
              className="btn btn-outline"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => fetchSessions(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
