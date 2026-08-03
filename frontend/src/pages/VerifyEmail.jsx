// src/pages/VerifyEmail.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../api/axios';
import { MailCheck, Loader2, ArrowLeft } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import toast from 'react-hot-toast';

const CODE_LEN = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const email    = location.state?.email || '';

  const [digits,   setDigits]   = useState(Array(CODE_LEN).fill(''));
  const [loading,  setLoading]  = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef([]);

  // Redirect back to register if no email in state
  useEffect(() => {
    if (!email) navigate('/register', { replace: true });
  }, [email, navigate]);

  // Resend cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const code = digits.join('');

  const setDigit = (i, v) => {
    const clean = v.replace(/\D/g, '');
    setDigits(prev => {
      const next = [...prev];
      if (clean.length > 1) {
        // Paste of multiple chars
        const chars = clean.slice(0, CODE_LEN).split('');
        for (let k = 0; k < CODE_LEN; k++) next[k] = chars[k] || '';
        const focusIdx = Math.min(chars.length, CODE_LEN - 1);
        setTimeout(() => inputs.current[focusIdx]?.focus(), 0);
      } else {
        next[i] = clean;
        if (clean && i < CODE_LEN - 1) inputs.current[i + 1]?.focus();
      }
      return next;
    });
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (code.length !== CODE_LEN) {
      toast.error('Enter the full 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await authAPI.verifyEmail(email, code);
      toast.success('Email verified! You can now sign in.');
      navigate('/login', { replace: true, state: { email } });
    } catch (err) {
      const msg = err.response?.data?.error || 'Verification failed';
      toast.error(msg);
      setDigits(Array(CODE_LEN).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      await authAPI.resendCode(email);
      toast.success('A new code has been sent to your email.');
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not resend code';
      toast.error(msg);
      if (err.response?.data?.retryAfter) setCooldown(err.response.data.retryAfter);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoIcon}><MailCheck size={22} color="#4f46e5" /></div>
          <div>
            <p style={s.logoTitle}>SmartHire</p>
            <p style={s.logoSub}>Verify your email</p>
          </div>
        </div>

        <h1 style={s.h1}>Check your inbox</h1>
        <p style={s.sub}>
          We sent a 6-digit verification code to{' '}
          <span style={{ color: '#4f46e5', fontWeight: 600 }}>{email}</span>.
        </p>

        <form onSubmit={submit} style={{ marginTop: 28 }}>
          <div style={s.codeRow}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => (inputs.current[i] = el)}
                value={d}
                onChange={e => setDigit(i, e.target.value)}
                onKeyDown={e => onKeyDown(i, e)}
                inputMode="numeric"
                maxLength={CODE_LEN}
                autoFocus={i === 0}
                style={s.codeInput}
              />
            ))}
          </div>

          <button type="submit" disabled={loading} style={s.submitBtn}>
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Verify Email'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#475569' }}>
          Didn't get it?{' '}
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0 || resending}
            style={{ ...s.linkBtn, opacity: cooldown > 0 || resending ? 0.5 : 1, cursor: cooldown > 0 ? 'default' : 'pointer' }}
          >
            {resending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>

        <p style={s.footer}>
          <Link to="/login" style={{ color: '#4f46e5', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

const s = {
  page:      { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f7f9', padding: 16, position: 'relative', overflow: 'hidden' },
  grid:      { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(15,23,42,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.02) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' },
  glow:      { position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 420, background: 'radial-gradient(ellipse, rgba(79,70,229,0.05) 0%, transparent 70%)', pointerEvents: 'none' },
  card:      { width: '100%', maxWidth: 400 },
  logo:      { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  logoIcon:  { width: 44, height: 44, borderRadius: 12, background: 'rgba(79,70,229,0.09)', border: '1px solid rgba(79,70,229,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoTitle: { margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a', fontFamily: "'Sora',sans-serif" },
  logoSub:   { margin: '2px 0 0', fontSize: 11, color: '#4f46e5', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' },
  h1:        { margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', fontFamily: "'Sora',sans-serif" },
  sub:       { margin: '8px 0 0', fontSize: 14, color: '#64748b', lineHeight: 1.5 },
  codeRow:   { display: 'flex', gap: 10, justifyContent: 'space-between' },
  codeInput: { width: 48, height: 56, textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 22, fontWeight: 700, color: '#0f172a', outline: 'none', fontFamily: "'Sora',sans-serif" },
  submitBtn: { marginTop: 24, width: '100%', padding: '13px', background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(79,70,229,0.25)' },
  linkBtn:   { background: 'none', border: 'none', color: '#4f46e5', fontWeight: 600, fontSize: 13, fontFamily: "'Sora',sans-serif", padding: 0 },
  footer:    { textAlign: 'center', marginTop: 22, fontSize: 13, color: '#64748b' },
};
