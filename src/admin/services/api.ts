// ============================================================
// Admin API Client
// Handles all admin API calls with auth
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL || '';

async function adminFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface SessionListParams {
  page?: number;
  limit?: number;
  risk_rating?: string;
  status?: string;
  sort_by?: string;
  sort_order?: string;
}

export const adminApi = {
  getSessions(token: string, params: SessionListParams = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.risk_rating) query.set('risk_rating', params.risk_rating);
    if (params.status) query.set('status', params.status);
    if (params.sort_by) query.set('sort_by', params.sort_by);
    if (params.sort_order) query.set('sort_order', params.sort_order);
    const qs = query.toString();
    return adminFetch(`/api/admin/sessions${qs ? `?${qs}` : ''}`, token);
  },

  getSessionDetail(token: string, sessionId: string) {
    return adminFetch(`/api/admin/detail?id=${sessionId}`, token);
  },

  override(token: string, body: {
    assessment_id: string;
    decision: string;
    justification: string;
    admin_email: string;
    loan_adjustment?: {
      max_amount?: number;
      duration_months?: number;
      apr_percent?: number;
    };
  }) {
    return adminFetch('/api/admin/override', token, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
