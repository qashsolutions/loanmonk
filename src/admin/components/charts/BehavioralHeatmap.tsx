// ============================================================
// Behavioral Signal Heatmap
// Visual grid: 10 signals (rows) x 60s timeline (columns)
// Color intensity represents signal magnitude
// ============================================================

import React from 'react';

interface BehavioralHeatmapProps {
  signals: Record<string, unknown>;
  duration: number;
}

const SIGNAL_LABELS = [
  { key: 'tap_velocities', label: 'Tap Speed', color: [99, 102, 241] },
  { key: 'path_efficiency', label: 'Path Efficiency', color: [34, 197, 94] },
  { key: 'banking_freq', label: 'Banking Frequency', color: [245, 158, 11] },
  { key: 'cargo_risk', label: 'Cargo Risk Level', color: [239, 68, 68] },
  { key: 'loss_reaction', label: 'Loss Reaction', color: [168, 85, 247] },
  { key: 'sharing', label: 'Sharing Behavior', color: [59, 130, 246] },
  { key: 'exploration', label: 'Exploration', color: [6, 182, 212] },
  { key: 'crowd_pref', label: 'Crowd Preference', color: [236, 72, 153] },
  { key: 'multi_order', label: 'Multi-Orders', color: [132, 204, 22] },
  { key: 'hesitation', label: 'Hesitation', color: [251, 146, 60] },
];

const TIME_SEGMENTS = 12; // 5-second segments for 60s

export function BehavioralHeatmap({ signals, duration }: BehavioralHeatmapProps) {
  // Generate heatmap data from signals
  // Each cell represents a signal's intensity during a 5-second window
  const heatmapData = SIGNAL_LABELS.map(({ key, label, color }) => {
    const rawData = signals[key];
    const segments = generateSegments(key, rawData, signals, TIME_SEGMENTS);
    return { label, color, segments };
  });

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header">
        <span className="card-title">Behavioral Signal Heatmap</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>60-second timeline (5s segments)</span>
      </div>

      {/* Time axis labels */}
      <div style={{ display: 'grid', gridTemplateColumns: `100px repeat(${TIME_SEGMENTS}, 1fr)`, gap: 2, marginBottom: 4 }}>
        <div />
        {Array.from({ length: TIME_SEGMENTS }, (_, i) => (
          <div key={i} style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>
            {i * 5}s
          </div>
        ))}
      </div>

      {/* Heatmap rows */}
      {heatmapData.map(({ label, color, segments }, rowIdx) => (
        <div key={rowIdx} style={{
          display: 'grid',
          gridTemplateColumns: `100px repeat(${TIME_SEGMENTS}, 1fr)`,
          gap: 2,
          marginBottom: 2,
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
            {label}
          </div>
          {segments.map((intensity, colIdx) => (
            <div
              key={colIdx}
              className="heatmap-cell"
              style={{
                background: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.1 + intensity * 0.8})`,
                borderRadius: 2,
                minHeight: 20,
              }}
              title={`${label} at ${colIdx * 5}s: ${(intensity * 100).toFixed(0)}%`}
            />
          ))}
        </div>
      ))}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Intensity:</span>
        <div style={{ display: 'flex', gap: 1 }}>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((v, i) => (
            <div key={i} style={{
              width: 20, height: 12,
              background: `rgba(99, 102, 241, ${v})`,
              borderRadius: 2,
            }} />
          ))}
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Low → High</span>
      </div>
    </div>
  );
}

/**
 * Generate time-segmented intensity values for a signal.
 * Returns array of 0-1 values for each time segment.
 */
function generateSegments(
  key: string,
  rawData: unknown,
  allSignals: Record<string, unknown>,
  segmentCount: number,
): number[] {
  // Distribute available data points across time segments
  if (Array.isArray(rawData) && rawData.length > 0) {
    const segments: number[] = [];
    const pointsPerSegment = Math.max(1, Math.floor(rawData.length / segmentCount));

    for (let i = 0; i < segmentCount; i++) {
      const start = i * pointsPerSegment;
      const end = Math.min(start + pointsPerSegment, rawData.length);
      const slice = rawData.slice(start, end);

      if (slice.length === 0) {
        segments.push(0);
      } else if (typeof slice[0] === 'number') {
        // Numeric array (e.g., tap velocities)
        const avg = slice.reduce((s: number, v: number) => s + v, 0) / slice.length;
        const maxPossible = Math.max(...(rawData as number[]), 1);
        segments.push(Math.min(1, avg / maxPossible));
      } else if (typeof slice[0] === 'object') {
        // Object array — use count as intensity
        segments.push(Math.min(1, slice.length / pointsPerSegment));
      } else {
        segments.push(0.5);
      }
    }
    return segments;
  }

  // For scalar values, generate a flat pattern with slight variation
  if (typeof rawData === 'number') {
    const base = Math.min(1, Math.max(0, rawData / 100));
    return Array.from({ length: segmentCount }, (_, i) =>
      Math.min(1, Math.max(0, base + (Math.sin(i * 0.8) * 0.15)))
    );
  }

  // Default: empty pattern
  return new Array(segmentCount).fill(0);
}
