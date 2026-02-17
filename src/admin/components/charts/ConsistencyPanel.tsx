// ============================================================
// Phase 1 vs Phase 2 Consistency Panel
// Side-by-side comparison with traffic light indicators
// ============================================================

import React from 'react';

interface ConsistencyPanelProps {
  phase1Scores: Record<string, number>;
  phase2Scores: Record<string, number>;
  consistency: Record<string, number> | null;
}

const TRAITS = [
  { key: 'C', label: 'Conscientiousness', color: 'var(--success)' },
  { key: 'N', label: 'Neuroticism', color: 'var(--danger)' },
  { key: 'A', label: 'Agreeableness', color: '#a855f7' },
  { key: 'O', label: 'Openness', color: 'var(--warning)' },
  { key: 'E', label: 'Extraversion', color: 'var(--info)' },
];

export function ConsistencyPanel({ phase1Scores, phase2Scores, consistency }: ConsistencyPanelProps) {
  const overall = consistency?.overall ?? 0;
  const flag = getFlag(overall);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Phase 1 vs Phase 2 Consistency</span>
        <div className="consistency-indicator">
          <div className={`consistency-dot ${getDotColor(flag)}`} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>{overall.toFixed(2)}</span>
        </div>
      </div>

      {/* Overall consistency badge */}
      <div style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 6, background: getBgColor(flag), textAlign: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: getTextColor(flag) }}>
          {flag.replace(/_/g, ' ').toUpperCase()}
        </span>
      </div>

      {/* Per-trait comparison */}
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 60px', gap: 4, marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>TRAIT</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>SELF-REPORT</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>BEHAVIORAL</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>GAP</div>
        </div>

        {TRAITS.map(({ key, label, color }) => {
          const p1 = phase1Scores[key] ?? 3;
          const p2raw = phase2Scores[key] ?? 0.5;
          const p2display = 1 + p2raw * 4; // Convert 0-1 to 1-5 scale for display
          const gap = consistency?.[key] ?? Math.abs((p1 - 1) / 4 - p2raw);
          const gapFlag = getFlag(gap);

          return (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 60px', gap: 4, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(30,41,59,0.3)' }}>
              <div style={{ fontSize: 12, color }}>{label.slice(0, 14)}</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: 'rgba(99,102,241,0.1)', borderRadius: 4, padding: '3px 8px', display: 'inline-block' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{p1.toFixed(1)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: 'rgba(139,92,246,0.1)', borderRadius: 4, padding: '3px 8px', display: 'inline-block' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{p2display.toFixed(1)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className={`consistency-dot ${getDotColor(gapFlag)}`} style={{ display: 'inline-block', width: 8, height: 8, marginRight: 4 }} />
                <span style={{ fontSize: 11 }}>{gap.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getFlag(value: number): string {
  if (value < 0.20) return 'highly_consistent';
  if (value < 0.40) return 'normal_variance';
  if (value < 0.60) return 'moderate_discrepancy';
  return 'high_discrepancy';
}

function getDotColor(flag: string): string {
  return { highly_consistent: 'green', normal_variance: 'green', moderate_discrepancy: 'amber', high_discrepancy: 'red' }[flag] || 'amber';
}

function getBgColor(flag: string): string {
  return {
    highly_consistent: 'rgba(34,197,94,0.1)',
    normal_variance: 'rgba(34,197,94,0.05)',
    moderate_discrepancy: 'rgba(245,158,11,0.1)',
    high_discrepancy: 'rgba(239,68,68,0.1)',
  }[flag] || 'rgba(148,163,184,0.1)';
}

function getTextColor(flag: string): string {
  return {
    highly_consistent: 'var(--success)',
    normal_variance: 'var(--success)',
    moderate_discrepancy: 'var(--warning)',
    high_discrepancy: 'var(--danger)',
  }[flag] || 'var(--text-muted)';
}
