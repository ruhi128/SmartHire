// src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, GraduationCap, Loader2, Briefcase, ShieldCheck, LineChart } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || null;

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    const result = await login(form.email, form.password);
    setLoading(false);
    if (result.needsVerification) {
      navigate('/verify', { state: { email: result.email || form.email } });
      return;
    }
    if (result.success) {
      const dest = from || { student: '/student/dashboard', recruiter: '/recruiter/dashboard', admin: '/admin/dashboard' }[result.role] || '/';
      navigate(dest, { replace: true });
    }
  };

  const FEATURES = [
    { icon: Briefcase,     text: 'Apply to on-campus drives & track every stage' },
    { icon: GraduationCap, text: 'Mock OA & AI-driven interview practice' },
    { icon: LineChart,     text: 'Live placement statistics & analytics' },
    { icon: ShieldCheck,   text: 'Secure email-verified access' },
  ];

  return (
    <div style={s.page}>
      {/* ── Left brand hero ── */}
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

      {/* ── Right form panel ── */}
      <div style={s.formPanel}>
        <div style={s.card}>
          <div style={s.logo}>
            <div style={s.logoIcon}><GraduationCap size={22} color="#4f46e5" /></div>
            <div>
              <p style={s.logoTitle}>SmartHire</p>
              <p style={s.logoSub}>Training and Placement Portal</p>
            </div>
          </div>

          <h1 style={s.h1}>Welcome back</h1>
          <p style={s.sub}>Sign in to your placement portal</p>

          <form onSubmit={handleSubmit} style={{ marginTop: 28 }}>
            <div style={s.field}>
              <label style={s.label}>Email Address</label>
              <input name="email" type="email" value={form.email}
                onChange={handleChange} placeholder="you@college.edu"
                required style={s.input} autoComplete="email" />
            </div>

            <div style={{ ...s.field, marginTop: 16 }}>
              <label style={s.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input name="password" type={show ? 'text' : 'password'}
                  value={form.password} onChange={handleChange}
                  placeholder="••••••••" required style={{ ...s.input, paddingRight: 44 }}
                  autoComplete="current-password" />
                <button type="button" style={s.eyeBtn} onClick={() => setShow(v => !v)}>
                  {show ? <EyeOff size={16} color="#475569" /> : <Eye size={16} color="#475569" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={s.submitBtn}>
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sign In'}
            </button>
          </form>

          <p style={s.footer}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#4f46e5', fontWeight: 600 }}>Register here</Link>
          </p>
        </div>
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
  formPanel:   { flex: '1 1 54%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', background: '#ffffff' },
  card:        { width: '100%', maxWidth: 400 },
  logo:        { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  logoIcon:    { width: 44, height: 44, borderRadius: 12, background: 'rgba(79,70,229,0.09)', border: '1px solid rgba(79,70,229,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoTitle:   { margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a', fontFamily: "'Sora',sans-serif" },
  logoSub:     { margin: '2px 0 0', fontSize: 11, color: '#4f46e5', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' },
  h1:          { margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', fontFamily: "'Sora',sans-serif" },
  sub:         { margin: '8px 0 0', fontSize: 14, color: '#64748b' },
  field:       { display: 'flex', flexDirection: 'column', gap: 6 },
  label:       { fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input:       { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#0f172a', outline: 'none', width: '100%', fontFamily: "'Sora',sans-serif", boxSizing: 'border-box' },
  eyeBtn:      { position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' },
  submitBtn:   { marginTop: 24, width: '100%', padding: '13px', background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(79,70,229,0.25)', letterSpacing: '-0.01em' },
  footer:      { textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748b' },
};
