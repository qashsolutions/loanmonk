// ============================================================
// Admin Override Modal
// Manual decision override with documented justification
// All overrides are audit-logged
// ============================================================

import React, { useState } from 'react';
import { adminApi } from '../../services/api.js';

interface OverrideModalProps {
  assessmentId: string;
  currentDecision: string;
  token: string;
  onClose: () => void;
  onOverridden: () => void;
}

export function OverrideModal({ assessmentId, currentDecision, token, onClose, onOverridden }: OverrideModalProps) {
  const [decision, setDecision] = useState('approve');
  const [justification, setJustification] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [aprPercent, setAprPercent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim() || !adminEmail.trim()) {
      setError('Justification and admin email are required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await adminApi.override(token, {
        assessment_id: assessmentId,
        decision,
        justification: justification.trim(),
        admin_email: adminEmail.trim(),
        loan_adjustment: {
          max_amount: maxAmount ? Number(maxAmount) : undefined,
          duration_months: durationMonths ? Number(durationMonths) : undefined,
          apr_percent: aprPercent ? Number(aprPercent) : undefined,
        },
      });
      onOverridden();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Override failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Override Decision</h3>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Current decision: <strong>{currentDecision}</strong>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Decision</label>
            <select value={decision} onChange={(e) => setDecision(e.target.value)}>
              <option value="approve">Approve</option>
              <option value="decline">Decline</option>
              <option value="manual_review">Manual Review</option>
            </select>
          </div>

          <div className="form-group">
            <label>Admin Email</label>
            <input
              type="email"
              placeholder="admin@creditmind.app"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Justification (required for audit trail)</label>
            <textarea
              placeholder="Document the reason for this override..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, marginTop: 16 }}>
            Loan Adjustment (optional)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div className="form-group">
              <label>Max Amount ($)</label>
              <input
                type="number"
                placeholder="50000"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Duration (months)</label>
              <input
                type="number"
                placeholder="24"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>APR (%)</label>
              <input
                type="number"
                step="0.1"
                placeholder="12.0"
                value={aprPercent}
                onChange={(e) => setAprPercent(e.target.value)}
              />
            </div>
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Confirm Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
