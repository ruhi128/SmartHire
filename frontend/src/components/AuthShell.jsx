// src/components/AuthShell.jsx
// Shared split-screen auth layout: branded indigo hero (left) + form panel (right).
import { GraduationCap, Briefcase, ShieldCheck, LineChart } from 'lucide-react';

const FEATURES = [
  { icon: Briefcase,     text: 'Apply to on-campus drives & track every stage' },
  { icon: GraduationCap, text: 'Mock OA & AI-driven interview practice' },
  { icon: LineChart,     text: 'Live placement statistics & analytics' },
  { icon: ShieldCheck,   text: 'Secure email-verified access' },
];

export default function AuthShell({ children }) {
  return (
    <div style={s.page}>
      <div className="hidden lg:flex" style={s.hero}>
        <div style={s.heroPattern} />
        <div style={s.heroContent}>
          <div style={s.heroLogo}>
            <div style={s.heroLogoIcon}><GraduationCap size={24} color="#ffffff" /></div>
            <span style={s.heroBrand}>SmartHire</span>
          </div>
          <h1 style={s.heroTitle}>Your campus placement journey, all in one place.</h1>
          <p style={s.heroSub}>
            Applications, mock assessments, AI interviews and real-time status — a single
            professional portal for students, recruiters and placement officers.
          </p>
          <div style={s.featureList}>
            {FEATURES.map((f, i) => (
              <div key={i} style={s.featureItem}>
                <div style={s.featureIcon}><f.icon size={16} color="#ffffff" /></div>
                <span style={s.featureText}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={s.formPanel}>
        {children}
      </div>
    </div>
  );
}

const s = {
  page:        { minHeight: '100vh', display: 'flex', background: '#ffffff' },
  hero:        { flex: '1 1 46%', position: 'relative', background: 'linear-gradient(150deg, #4f46e5 0%, #4338ca 55%, #3730a3 100%)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 48 },
  heroPattern: { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' },
  heroContent: { position: 'relative', zIndex: 1, maxWidth: 440 },
  heroLogo:    { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 },
  heroLogoIcon:{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  heroBrand:   { fontSize: 20, fontWeight: 800, color: '#ffffff', fontFamily: "'Sora',sans-serif", letterSpacing: '-0.02em' },
  heroTitle:   { fontSize: 34, lineHeight: 1.2, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', margin: 0, fontFamily: "'Sora',sans-serif" },
  heroSub:     { fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.82)', margin: '18px 0 34px' },
  featureList: { display: 'flex', flexDirection: 'column', gap: 16 },
  featureItem: { display: 'flex', alignItems: 'center', gap: 12 },
  featureIcon: { width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureText: { fontSize: 14, color: 'rgba(255,255,255,0.92)', fontWeight: 500 },
  formPanel:   { flex: '1 1 54%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', background: '#ffffff', overflowY: 'auto' },
};
