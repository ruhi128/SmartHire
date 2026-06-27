// src/components/StatCard.jsx
// Reusable animated stat/metric card used across all dashboards

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * StatCard
 *
 * Props:
 *  title       string   — metric label e.g. "Total Students"
 *  value       string|number — main display value
 *  subtitle    string   — secondary line e.g. "out of 450"
 *  icon        ReactNode — Lucide icon component
 *  iconColor   string   — hex color for icon background glow
 *  trend       number   — % change (positive=up, negative=down, undefined=none)
 *  trendLabel  string   — text next to trend e.g. "vs last month"
 *  accent      string   — border/glow color (hex). Default: cyan
 *  onClick     fn       — optional click handler
 *  loading     bool     — show skeleton shimmer
 */
export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconColor  = '#00c8f0',
  trend,
  trendLabel,
  accent     = '#00c8f0',
  onClick,
  loading    = false,
}) {
  const hasTrend = trend !== undefined && trend !== null;
  const isUp     = trend > 0;
  const isFlat   = trend === 0;

  const TrendIcon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const trendColor = isFlat ? '#94a3b8' : isUp ? '#10c98a' : '#f04b4b';

  if (loading) {
    return (
      <div style={styles.card(accent)}>
        <div style={styles.shimmer} />
      </div>
    );
  }

  return (
    <div
      style={styles.card(accent)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 40px ${accent}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 2px 20px ${accent}11`; }}
    >
      {/* Top row */}
      <div style={styles.topRow}>
        <p style={styles.title}>{title}</p>
        {icon && (
          <div style={styles.iconWrap(iconColor)}>
            <span style={{ color: iconColor, display: 'flex' }}>{icon}</span>
          </div>
        )}
      </div>

      {/* Main value */}
      <p style={styles.value(accent)}>{value ?? '—'}</p>

      {/* Subtitle */}
      {subtitle && <p style={styles.subtitle}>{subtitle}</p>}

      {/* Trend badge */}
      {hasTrend && (
        <div style={styles.trendRow}>
          <TrendIcon size={14} style={{ color: trendColor, flexShrink: 0 }} />
          <span style={{ ...styles.trendText, color: trendColor }}>
            {isUp ? '+' : ''}{trend}%
          </span>
          {trendLabel && (
            <span style={styles.trendLabel}>{trendLabel}</span>
          )}
        </div>
      )}

      {/* Bottom accent line */}
      <div style={styles.accentBar(accent)} />
    </div>
  );
}

// ── Styles ──
const styles = {
  card: (accent) => ({
    position:       'relative',
    background:     'linear-gradient(135deg, #0b1a2e 0%, #0f2040 100%)',
    border:         `1px solid ${accent}22`,
    borderRadius:   14,
    padding:        '22px 24px 20px',
    cursor:         'default',
    transition:     'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow:      `0 2px 20px ${accent}11`,
    overflow:       'hidden',
    minWidth:       0,
  }),
  topRow: {
    display:        'flex',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    marginBottom:   10,
    gap:            8,
  },
  title: {
    margin:         0,
    fontSize:       12,
    fontWeight:     600,
    color:          '#64748b',
    textTransform:  'uppercase',
    letterSpacing:  '0.08em',
    lineHeight:     1.4,
  },
  iconWrap: (color) => ({
    flexShrink:     0,
    width:          36,
    height:         36,
    borderRadius:   10,
    background:     `${color}18`,
    border:         `1px solid ${color}33`,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
  }),
  value: (accent) => ({
    margin:         '4px 0 2px',
    fontSize:       28,
    fontWeight:     800,
    color:          '#f0f6ff',
    letterSpacing:  '-0.02em',
    lineHeight:     1.1,
    fontFamily:     "'Sora', sans-serif",
  }),
  subtitle: {
    margin:         '4px 0 0',
    fontSize:       12,
    color:          '#475569',
    lineHeight:     1.4,
  },
  trendRow: {
    display:        'flex',
    alignItems:     'center',
    gap:            4,
    marginTop:      10,
  },
  trendText: {
    fontSize:       12,
    fontWeight:     700,
  },
  trendLabel: {
    fontSize:       11,
    color:          '#475569',
    marginLeft:     2,
  },
  accentBar: (accent) => ({
    position:       'absolute',
    bottom:         0,
    left:           0,
    right:          0,
    height:         2,
    background:     `linear-gradient(90deg, ${accent}88, transparent)`,
    borderRadius:   '0 0 14px 14px',
  }),
  shimmer: {
    position:       'absolute',
    inset:          0,
    background:     'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
    animation:      'shimmer 1.5s infinite',
    borderRadius:   14,
  },
};
