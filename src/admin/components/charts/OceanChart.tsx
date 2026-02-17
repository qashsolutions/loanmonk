// ============================================================
// OCEAN Trait Horizontal Bar Chart
// Color-coded: C=green, N=red, A=purple, O=amber, E=blue
// ============================================================

import React from 'react';

interface OceanChartProps {
  scores: Record<string, number>;
}

const TRAIT_CONFIG = [
  { key: 'C', label: 'Conscientiousness', color: 'var(--success)', description: 'Planning discipline' },
  { key: 'N', label: 'Neuroticism', color: 'var(--danger)', description: 'Emotional reactivity' },
  { key: 'A', label: 'Agreeableness', color: '#a855f7', description: 'Social orientation' },
  { key: 'O', label: 'Openness', color: 'var(--warning)', description: 'Risk appetite' },
  { key: 'E', label: 'Extraversion', color: 'var(--info)', description: 'Social energy' },
];

const WEIGHT_LABELS: Record<string, string> = {
  C: '35%', N: '25%', A: '18%', O: '12%', E: '10%',
};

export function OceanChart({ scores }: OceanChartProps) {
  return (
    <div>
      {TRAIT_CONFIG.map(({ key, label, color, description }) => {
        const score = scores[key] ?? 3;
        const percentage = ((score - 1) / 4) * 100;
        const interpretation = getInterpretation(key, score);

        return (
          <div key={key} className={`ocean-bar-container trait-${key}`} style={{ marginBottom: 16 }}>
            <div className="ocean-bar-label">
              <span>
                <strong style={{ color }}>{label}</strong>
                <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)' }}>
                  (weight: {WEIGHT_LABELS[key]})
                </span>
              </span>
              <span style={{ fontWeight: 700, color }}>{score.toFixed(1)}/5</span>
            </div>
            <div className="ocean-bar-track">
              <div className="ocean-bar-fill" style={{ width: `${percentage}%`, background: color }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{interpretation}</div>
          </div>
        );
      })}
    </div>
  );
}

function getInterpretation(trait: string, score: number): string {
  const level = score >= 4 ? 'Strong' : score >= 3 ? 'Moderate' : score >= 2 ? 'Low' : 'Very low';

  const descriptions: Record<string, Record<string, string>> = {
    C: {
      Strong: 'Strong planning discipline, low impulsivity risk',
      Moderate: 'Adequate organizational skills',
      Low: 'May lack financial planning discipline',
      'Very low': 'High impulsivity risk, poor planning habits',
    },
    N: {
      Strong: 'High emotional reactivity, stress-driven decisions likely',
      Moderate: 'Normal stress response',
      Low: 'Emotionally stable, measured decision-making',
      'Very low': 'Very stable, resilient under pressure',
    },
    A: {
      Strong: 'Highly cooperative, may over-commit to social obligations',
      Moderate: 'Balanced social orientation',
      Low: 'Independent, may undervalue relationships',
      'Very low': 'Highly self-oriented',
    },
    O: {
      Strong: 'High risk appetite, seeks novel opportunities',
      Moderate: 'Balanced approach to risk and novelty',
      Low: 'Conservative, prefers proven approaches',
      'Very low': 'Very risk-averse, resistant to change',
    },
    E: {
      Strong: 'Highly social, energized by interaction',
      Moderate: 'Balanced social engagement',
      Low: 'Prefers independent work',
      'Very low': 'Strongly introverted',
    },
  };

  return descriptions[trait]?.[level] || '';
}
