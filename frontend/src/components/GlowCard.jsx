// src/components/GlowCard.jsx
// Versatile glass-morphism container card used throughout the portal

/**
 * GlowCard
 *
 * Props:
 *  children      ReactNode
 *  title         string       — optional card heading
 *  subtitle      string       — optional subheading under title
 *  headerRight   ReactNode    — slot for buttons/badges in card header
 *  accent        string       — glow/border color (hex). Default: cyan
 *  padding       string|num   — inner padding. Default: '24px'
 *  style         object       — extra inline styles on the card wrapper
 *  className     string       — extra CSS classes
 *  noPadding     bool         — remove inner padding (for full-bleed content)
 *  loading       bool         — show skeleton shimmer overlay
 *  onClick       fn           — make card clickable
 *  hoverable     bool         — apply lift hover effect even without onClick
 */
export default function GlowCard({
  children,
  title,
  subtitle,
  headerRight,
  accent     = '#00c8f0',
  padding    = '24px',
  style      = {},
  className  = '',
  noPadding  = false,
  loading    = false,
  onClick,
  hoverable  = false,
}) {
  const isClickable = !!onClick || hoverable;

  return (
    <div
      className={className}
      style={{
        position:      'relative',
        background:    'linear-gradient(145deg, #0b1a2e 0%, #0d1f3c 50%, #0b1a2e 100%)',
        border:        `1px solid ${accent}20`,
        borderRadius:  16,
        boxShadow:     `0 4px 24px ${accent}0d`,
        overflow:      'hidden',
        transition:    isClickable ? 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease' : 'none',
        cursor:        onClick ? 'pointer' : 'default',
        ...style,
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onMouseEnter={isClickable ? (e) => {
        e.currentTarget.style.transform    = 'translateY(-2px)';
        e.currentTarget.style.boxShadow    = `0 12px 40px ${accent}1a`;
        e.currentTarget.style.borderColor  = `${accent}44`;
      } : undefined}
      onMouseLeave={isClickable ? (e) => {
        e.currentTarget.style.transform    = 'translateY(0)';
        e.currentTarget.style.boxShadow    = `0 4px 24px ${accent}0d`;
        e.currentTarget.style.borderColor  = `${accent}20`;
      } : undefined}
    >
      {/* Ambient top glow */}
      <div style={{
        position:       'absolute',
        top:            0,
        left:           '50%',
        transform:      'translateX(-50%)',
        width:          '60%',
        height:         1,
        background:     `linear-gradient(90deg, transparent, ${accent}44, transparent)`,
        pointerEvents:  'none',
      }} />

      {/* Card header */}
      {(title || headerRight) && (
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        noPadding ? '20px 24px 16px' : `${typeof padding === 'number' ? padding + 'px' : padding} ${typeof padding === 'number' ? padding + 'px' : padding} 16px`,
          borderBottom:   `1px solid ${accent}12`,
          gap:            12,
        }}>
          <div>
            {title && (
              <h3 style={{
                margin:        0,
                fontSize:      15,
                fontWeight:    700,
                color:         '#e2e8f0',
                letterSpacing: '-0.01em',
                fontFamily:    "'Sora', sans-serif",
              }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p style={{
                margin:     '3px 0 0',
                fontSize:   12,
                color:      '#475569',
                lineHeight: 1.4,
              }}>
                {subtitle}
              </p>
            )}
          </div>
          {headerRight && (
            <div style={{ flexShrink: 0 }}>{headerRight}</div>
          )}
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: noPadding ? 0 : (title || headerRight ? `16px ${typeof padding === 'number' ? padding + 'px' : padding} ${typeof padding === 'number' ? padding + 'px' : padding}` : padding) }}>
        {loading ? <ShimmerLines /> : children}
      </div>

      {/* Bottom accent */}
      <div style={{
        position:       'absolute',
        bottom:         0,
        left:           0,
        right:          0,
        height:         1,
        background:     `linear-gradient(90deg, transparent, ${accent}22, transparent)`,
        pointerEvents:  'none',
      }} />
    </div>
  );
}

// ── Shimmer skeleton for loading state ──
function ShimmerLines() {
  return (
    <div style={{ padding: '8px 0' }}>
      {[1, 0.7, 0.85, 0.5].map((w, i) => (
        <div
          key={i}
          style={{
            height:        12,
            width:         `${w * 100}%`,
            background:    'linear-gradient(90deg, #1e3a5f22, #1e3a5f44, #1e3a5f22)',
            borderRadius:  6,
            marginBottom:  10,
            animation:     `shimmer 1.5s ease-in-out ${i * 0.1}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── Badge sub-component (used frequently alongside GlowCard) ──
export function Badge({ children, color = '#00c8f0', size = 'sm' }) {
  const sizes = { xs: '10px', sm: '11px', md: '12px', lg: '13px' };
  const pads  = { xs: '2px 7px', sm: '3px 10px', md: '4px 12px', lg: '5px 14px' };

  return (
    <span style={{
      display:        'inline-flex',
      alignItems:     'center',
      padding:        pads[size],
      background:     `${color}18`,
      color:          color,
      border:         `1px solid ${color}33`,
      borderRadius:   999,
      fontSize:       sizes[size],
      fontWeight:     700,
      letterSpacing:  '0.04em',
      whiteSpace:     'nowrap',
      lineHeight:     1.4,
    }}>
      {children}
    </span>
  );
}

// ── Divider sub-component ──
export function CardDivider({ accent = '#00c8f0' }) {
  return (
    <div style={{
      height:     1,
      background: `linear-gradient(90deg, transparent, ${accent}22, transparent)`,
      margin:     '16px 0',
    }} />
  );
}

// ── Section label ──
export function SectionLabel({ children, accent = '#00c8f0' }) {
  return (
    <div style={{
      display:       'flex',
      alignItems:    'center',
      gap:           8,
      marginBottom:  12,
    }}>
      <div style={{
        width:        3,
        height:       14,
        background:   accent,
        borderRadius: 2,
        flexShrink:   0,
      }} />
      <span style={{
        fontSize:      11,
        fontWeight:    700,
        color:         accent,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        {children}
      </span>
    </div>
  );
}
