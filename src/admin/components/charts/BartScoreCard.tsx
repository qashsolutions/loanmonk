// ============================================================
// BART Score Card
// Shows cargo stacking distribution, average score, percentile
// ============================================================

import React from 'react';

interface BartScoreCardProps {
  cargoLoads: Array<{ crates: number; tipped: boolean }>;
  bartScore: number;
}

export function BartScoreCard({ cargoLoads, bartScore }: BartScoreCardProps) {
  // Build distribution: count of each crate level
  const distribution: Record<number, { count: number; tipped: number }> = {};
  for (const load of cargoLoads) {
    if (!distribution[load.crates]) {
      distribution[load.crates] = { count: 0, tipped: 0 };
    }
    distribution[load.crates].count++;
    if (load.tipped) distribution[load.crates].tipped++;
  }

  const maxCrates = Math.max(...Object.keys(distribution).map(Number), 1);
  const maxCount = Math.max(...Object.values(distribution).map(d => d.count), 1);

  // Risk interpretation
  const riskLevel = bartScore < 0.3 ? 'Low' : bartScore < 0.5 ? 'Moderate' : bartScore < 0.7 ? 'High' : 'Very High';
  const riskColor = bartScore < 0.3 ? 'var(--success)' : bartScore < 0.5 ? 'var(--warning)' : 'var(--danger)';

  // Percentile estimate (based on normal distribution assumptions)
  const percentile = Math.round(bartScore * 100);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">BART Score (Cargo Stacking)</span>
      </div>

      {/* Main score */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 36, fontWeight: 700, color: riskColor }}>
          {bartScore.toFixed(3)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Avg crates on successful deliveries (normalized)
        </div>
        <div style={{ marginTop: 4 }}>
          <span className={`badge ${bartScore < 0.3 ? 'badge-success' : bartScore < 0.5 ? 'badge-warning' : 'badge-danger'}`}>
            {riskLevel} Risk-Taking
          </span>
        </div>
      </div>

      {/* Distribution chart */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Cargo Load Distribution</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, marginBottom: 8 }}>
        {Array.from({ length: Math.max(maxCrates, 6) }, (_, i) => i + 1).map(crates => {
          const data = distribution[crates] || { count: 0, tipped: 0 };
          const height = maxCount > 0 ? (data.count / maxCount) * 70 : 0;
          const tippedHeight = maxCount > 0 ? (data.tipped / maxCount) * 70 : 0;
          const successHeight = height - tippedHeight;

          return (
            <div key={crates} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 70 }}>
                {tippedHeight > 0 && (
                  <div style={{ height: tippedHeight, background: 'var(--danger)', borderRadius: '2px 2px 0 0', opacity: 0.7 }} />
                )}
                {successHeight > 0 && (
                  <div style={{ height: successHeight, background: 'var(--accent)', borderRadius: tippedHeight > 0 ? '0' : '2px 2px 0 0' }} />
                )}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{crates}</div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, fontSize: 10, color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 10, height: 10, background: 'var(--accent)', borderRadius: 2 }} />
          Successful
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 10, height: 10, background: 'var(--danger)', borderRadius: 2, opacity: 0.7 }} />
          Tipped Over
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Total Deliveries: <strong style={{ color: 'var(--text-primary)' }}>{cargoLoads.length}</strong>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Tip-overs: <strong style={{ color: 'var(--danger)' }}>{cargoLoads.filter(c => c.tipped).length}</strong>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Percentile: <strong style={{ color: 'var(--text-primary)' }}>{percentile}th</strong>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Risk Signal: <strong style={{ color: riskColor }}>{riskLevel}</strong>
        </div>
      </div>
    </div>
  );
}
