// src/pages/Register.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Briefcase, ShieldCheck, Eye, EyeOff, Loader2, ChevronRight } from 'lucide-react';

const ROLES = [
  { id: 'student',   label: 'Student',          icon: GraduationCap, desc: 'Access tests, jobs & resume tools',   color: '#00c8f0' },
  { id: 'recruiter', label: 'Recruiter',         icon: Briefcase,     desc: 'Post jobs & manage candidates',       color: '#7c5cfc' },
  { id: 'admin',     label: 'Placement Officer', icon: ShieldCheck,   desc: 'Full system access & analytics',      color: '#f5a623' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate      = useNavigate();

  const [step,    setStep]    = useState(1);   // 1=role select, 2=details
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const [form,    setForm]    = useState({
    role: '', email: '', password: '', confirmPassword: '',
    full_name: '', roll_number: '', branch: '', cgpa: '',
    company_name: '',
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── Step 1 validation ──
  const selectRole = (role) => {
    set('role', role);
    setStep(2);
  };

  // ── Step 2 validation ──
  const validate = () => {
    const e = {};
    if (!form.email)        e.email    = 'Email is required';
    if (!form.full_name)    e.full_name = 'Full name is required';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (form.role === 'student') {
      if (!form.roll_number) e.roll_number = 'Roll number is required';
      if (!form.branch)      e.branch      = 'Branch is required';
    }
    if (form.role === 'recruiter' && !form.company_name) e.company_name = 'Company name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await register(form);
    setLoading(false);
    if (result.success) navigate('/login');
  };

  const selectedRole = ROLES.find(r => r.id === form.role);

  return (
    <div style={s.page}>
      <div style={s.grid} />
      <div style={s.glow} />

      <div style={s.card}>
        {/* Logo */}
        <div style={s.logo}>
          <div style={{ ...s.logoIcon, borderColor: selectedRole ? selectedRole.color + '44' : 'rgba(0,200,240,0.25)', background: selectedRole ? selectedRole.color + '18' : 'rgba(0,200,240,0.12)' }}>
            <GraduationCap size={20} color={selectedRole?.color || '#00c8f0'} />
          </div>
          <div>
            <p style={s.logoTitle}>SmartHire</p>
            <p style={{ ...s.logoSub, color: selectedRole?.color || '#00c8f0' }}>Create Account</p>
          </div>
        </div>

        {/* Step indicator */}
        <div style={s.steps}>
          {['Select Role', 'Your Details'].map((label, i) => (
            <div key={i} style={s.stepItem}>
              <div style={s.stepCircle(i + 1 <= step, selectedRole?.color || '#00c8f0')}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 11, color: i + 1 <= step ? (selectedRole?.color || '#00c8f0') : '#334155', fontWeight: 600 }}>{label}</span>
            </div>
          ))}
          <div style={s.stepLine(step > 1, selectedRole?.color || '#00c8f0')} />
        </div>

        {/* ── STEP 1: Role Selection ── */}
        {step === 1 && (
          <div>
            <h2 style={s.h2}>Who are you?</h2>
            <p style={s.subText}>Choose your role to get started</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
              {ROLES.map(role => {
                const Icon = role.icon;
                return (
                  <button key={role.id} style={s.roleCard(role.color)} onClick={() => selectRole(role.id)}>
                    <div style={s.roleIcon(role.color)}><Icon size={20} color={role.color} /></div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{role.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>{role.desc}</p>
                    </div>
                    <ChevronRight size={16} color={role.color} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 2: Details Form ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <button type="button" onClick={() => setStep(1)} style={s.backBtn}>← Back</button>
              <div style={s.rolePill(selectedRole.color)}>
                <selectedRole.icon size={12} />
                {selectedRole.label}
              </div>
            </div>

            <div style={s.grid2}>
              {/* Full Name */}
              <Field label="Full Name" error={errors.full_name}>
                <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                  placeholder="Aarav Kumar" style={s.input(errors.full_name)} />
              </Field>

              {/* Email */}
              <Field label="Email" error={errors.email}>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="you@college.edu" style={s.input(errors.email)} />
              </Field>

              {/* Student-specific fields */}
              {form.role === 'student' && <>
                <Field label="Roll Number" error={errors.roll_number}>
                  <input value={form.roll_number} onChange={e => set('roll_number', e.target.value)}
                    placeholder="21CS001" style={s.input(errors.roll_number)} />
                </Field>
                <Field label="Branch">
                  <select value={form.branch} onChange={e => set('branch', e.target.value)} style={s.input()}>
                    <option value="">Select branch</option>
                    {['CSE','IT','ECE','EEE','MECH','CIVIL','AIDS','AIML','DS'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </Field>
                <Field label="CGPA (optional)">
                  <input type="number" min="0" max="10" step="0.01"
                    value={form.cgpa} onChange={e => set('cgpa', e.target.value)}
                    placeholder="8.5" style={s.input()} />
                </Field>
              </>}

              {/* Recruiter-specific */}
              {form.role === 'recruiter' && (
                <Field label="Company Name" error={errors.company_name}>
                  <input value={form.company_name} onChange={e => set('company_name', e.target.value)}
                    placeholder="Infosys, TCS, etc." style={s.input(errors.company_name)} />
                </Field>
              )}

              {/* Password */}
              <Field label="Password" error={errors.password}>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="Min 8 characters" style={{ ...s.input(errors.password), paddingRight: 44 }} />
                  <button type="button" style={s.eyeBtn} onClick={() => setShowPw(v => !v)}>
                    {showPw ? <EyeOff size={15} color="#475569" /> : <Eye size={15} color="#475569" />}
                  </button>
                </div>
              </Field>

              {/* Confirm password */}
              <Field label="Confirm Password" error={errors.confirmPassword}>
                <input type="password" value={form.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)}
                  placeholder="Repeat password" style={s.input(errors.confirmPassword)} />
              </Field>
            </div>

            <button type="submit" disabled={loading}
              style={{ ...s.submitBtn, background: selectedRole.color, boxShadow: `0 4px 20px ${selectedRole.color}44` }}>
              {loading
                ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                : `Create ${selectedRole.label} Account`}
            </button>
          </form>
        )}

        <p style={s.footer}>
          Already registered? <Link to="/login" style={{ color: '#00c8f0', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      {children}
      {error && <p style={{ margin: 0, fontSize: 11, color: '#f04b4b' }}>{error}</p>}
    </div>
  );
}

const s = {
  page:       { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040c18', padding: '24px 16px', position: 'relative', overflow: 'hidden' },
  grid:       { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,200,240,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,200,240,0.03) 1px,transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' },
  glow:       { position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse,rgba(124,92,252,0.07) 0%,transparent 70%)', pointerEvents: 'none' },
  card:       { background: 'linear-gradient(145deg,#0b1a2e,#0d1f3c)', border: '1px solid rgba(0,200,240,0.12)', borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 500, position: 'relative', zIndex: 1, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' },
  logo:       { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  logoIcon:   { width: 42, height: 42, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid' },
  logoTitle:  { margin: 0, fontSize: 16, fontWeight: 800, color: '#f0f6ff', fontFamily: "'Sora',sans-serif" },
  logoSub:    { margin: '2px 0 0', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' },
  steps:      { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, position: 'relative' },
  stepItem:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 },
  stepCircle: (active, color) => ({ width: 28, height: 28, borderRadius: '50%', background: active ? color : '#0f2040', border: `2px solid ${active ? color : '#1e3a5f'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: active ? '#040c18' : '#334155' }),
  stepLine:   (done, color) => ({ position: 'absolute', top: 14, left: '25%', right: '25%', height: 2, background: done ? color : '#0f2040', transition: 'background 0.3s', zIndex: -1 }),
  h2:         { margin: 0, fontSize: 20, fontWeight: 800, color: '#f0f6ff', fontFamily: "'Sora',sans-serif" },
  subText:    { margin: '6px 0 0', fontSize: 13, color: '#475569' },
  roleCard:   (color) => ({ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: `${color}08`, border: `1px solid ${color}22`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s', width: '100%' }),
  roleIcon:   (color) => ({ width: 40, height: 40, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  backBtn:    { background: 'none', border: 'none', color: '#475569', fontSize: 13, cursor: 'pointer', padding: '4px 0', fontFamily: "'Sora',sans-serif" },
  rolePill:   (color) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: `${color}18`, border: `1px solid ${color}33`, borderRadius: 999, fontSize: 12, fontWeight: 700, color: color }),
  grid2:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 },
  input:      (err) => ({ background: '#071525', border: `1px solid ${err ? '#f04b4b44' : 'rgba(0,200,240,0.15)'}`, borderRadius: 9, padding: '10px 12px', fontSize: 13, color: '#e2e8f0', outline: 'none', width: '100%', fontFamily: "'Sora',sans-serif", boxSizing: 'border-box' }),
  eyeBtn:     { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' },
  submitBtn:  { width: '100%', padding: '13px', color: '#040c18', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, letterSpacing: '-0.01em' },
  footer:     { textAlign: 'center', marginTop: 20, fontSize: 13, color: '#475569' },
};
