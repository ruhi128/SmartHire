// src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, GraduationCap, Loader2 } from 'lucide-react';

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
    if (result.success) {
      const dest = from || { student: '/student/dashboard', recruiter: '/recruiter/dashboard', admin: '/admin/dashboard' }[result.role] || '/';
      navigate(dest, { replace: true });
    }
  };

  return (
    <div style={s.page}>
      {/* Background grid */}
      <div style={s.grid} />
      {/* Ambient glow */}
      <div style={s.glow} />

      <div style={s.card}>
        {/* Logo */}
        <div style={s.logo}>
          <div style={s.logoIcon}><GraduationCap size={22} color="#00c8f0" /></div>
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
          <Link to="/register" style={{ color: '#00c8f0', fontWeight: 600 }}>Register here</Link>
        </p>

        
      </div>
    </div>
  );
}

const s = {
  page:      { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040c18', padding: 16, position: 'relative', overflow: 'hidden' },
  grid:      { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,200,240,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,240,0.03) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' },
  glow:      { position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(0,200,240,0.08) 0%, transparent 70%)', pointerEvents: 'none' },
  card:      { background: 'linear-gradient(145deg,#0b1a2e,#0d1f3c)', border: '1px solid rgba(0,200,240,0.15)', borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 420, position: 'relative', zIndex: 1, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' },
  logo:      { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  logoIcon:  { width: 44, height: 44, borderRadius: 12, background: 'rgba(0,200,240,0.12)', border: '1px solid rgba(0,200,240,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoTitle: { margin: 0, fontSize: 17, fontWeight: 800, color: '#f0f6ff', fontFamily: "'Sora',sans-serif" },
  logoSub:   { margin: '2px 0 0', fontSize: 11, color: '#00c8f0', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' },
  h1:        { margin: 0, fontSize: 26, fontWeight: 800, color: '#f0f6ff', letterSpacing: '-0.02em', fontFamily: "'Sora',sans-serif" },
  sub:       { margin: '8px 0 0', fontSize: 14, color: '#475569' },
  field:     { display: 'flex', flexDirection: 'column', gap: 6 },
  label:     { fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input:     { background: '#071525', border: '1px solid rgba(0,200,240,0.15)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#e2e8f0', outline: 'none', width: '100%', fontFamily: "'Sora',sans-serif", boxSizing: 'border-box' },
  eyeBtn:    { position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' },
  submitBtn: { marginTop: 24, width: '100%', padding: '13px', background: '#00c8f0', color: '#040c18', border: 'none', borderRadius: 11, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(0,200,240,0.35)', letterSpacing: '-0.01em' },
  footer:    { textAlign: 'center', marginTop: 20, fontSize: 13, color: '#475569' },
  demo:      { marginTop: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' },
};
