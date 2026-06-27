// src/pages/recruiter/PostJob.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsAPI } from '../../api/axios';
import { useTheme } from '../../context/ThemeContext';
import {
  Briefcase, Loader2, CheckCircle, Calendar, Clock,
  DollarSign, Users, AlertCircle, Send
} from 'lucide-react';
import toast from 'react-hot-toast';

const BRANCHES = ['CSE','IT','ECE','EEE','MECH','CIVIL','AIDS','AIML','DS'];

export default function PostJob() {
  const navigate  = useNavigate();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    title:             '',
    description:       '',
    package_lpa:       '',
    job_type:          'full-time',
    min_cgpa:          '6.0',
    max_backlogs:      '0',
    eligible_branches: [],
    required_skills:   '',
    deadline:          '',
    drive_date:        '',
    rounds:            '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleBranch = b => set('eligible_branches',
    form.eligible_branches.includes(b)
      ? form.eligible_branches.filter(x => x !== b)
      : [...form.eligible_branches, b]
  );

  const selectAll = () => set('eligible_branches', BRANCHES);
  const clearAll  = () => set('eligible_branches', []);

  // ── Today's date as min for date inputs ──────────────────────────────────
  const today = new Date().toISOString().split('T')[0];

  const validate = () => {
    if (!form.title.trim())       { toast.error('Job title is required'); return false; }
    if (!form.description.trim()) { toast.error('Job description is required'); return false; }
    if (!form.package_lpa)        { toast.error('Package (LPA) is required'); return false; }
    if (!form.deadline)           { toast.error('Application deadline is required'); return false; }
    if (form.eligible_branches.length === 0) { toast.error('Select at least one eligible branch'); return false; }
    if (form.drive_date && form.drive_date < form.deadline) {
      toast.error('Drive date cannot be before the application deadline'); return false;
    }
    return true;
  };

  const submit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await jobsAPI.create({
        ...form,
        package_lpa:   parseFloat(form.package_lpa),
        min_cgpa:      parseFloat(form.min_cgpa),
        max_backlogs:  parseInt(form.max_backlogs),
        required_skills: form.required_skills.split(',').map(s => s.trim()).filter(Boolean),
        drive_date:    form.drive_date || null,
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to post job');
    } finally { setLoading(false); }
  };

  // ── Theme-aware styles ────────────────────────────────────────────────────
  const T = {
    page:    { padding: 24, maxWidth: 920, margin: '0 auto' },
    card:    {
      background: isDark ? '#0b1a2e' : '#ffffff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: 14, padding: '20px 22px', marginBottom: 16,
    },
    cardTitle: {
      fontSize: 13, fontWeight: 700, color: isDark ? '#7c5cfc' : '#6d28d9',
      textTransform: 'uppercase', letterSpacing: '0.07em',
      marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
    },
    label: {
      display: 'block', marginBottom: 5,
      fontSize: 11, fontWeight: 700, color: isDark ? '#64748b' : '#64748b',
      textTransform: 'uppercase', letterSpacing: '0.07em',
    },
    input: {
      width: '100%', boxSizing: 'border-box',
      background: isDark ? '#071525' : '#f8fafc',
      border: `1px solid ${isDark ? 'rgba(124,92,252,0.2)' : 'rgba(0,0,0,0.15)'}`,
      borderRadius: 9, padding: '10px 12px',
      fontSize: 13, color: isDark ? '#e2e8f0' : '#0f172a',
      outline: 'none', fontFamily: "'Sora',sans-serif",
      transition: 'border-color 0.15s',
    },
    // Date input needs explicit color-scheme for calendar icon
    dateInput: {
      colorScheme: isDark ? 'dark' : 'light',
    },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
    grid1: { display: 'grid', gridTemplateColumns: '1fr', gap: 14 },
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) return (
    <div style={{ ...T.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 500 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,201,138,0.12)',
          border: '2px solid #10c98a', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px' }}>
          <Send size={30} color="#10c98a"/>
        </div>
        <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800,
          color: isDark ? '#f0f6ff' : '#0f172a', fontFamily: "'Sora',sans-serif" }}>
          Job Submitted for Approval!
        </h2>
        <p style={{ color: isDark ? '#94a3b8' : '#475569', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          Your job posting <strong style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>{form.title}</strong> has been
          submitted. The placement officer (admin) has been notified and will review it shortly.
          <br/><br/>
          Once approved, the job will automatically appear in the student job listings and
          an announcement will be sent to all students.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => { setSubmitted(false); setForm({ title:'', description:'', package_lpa:'', job_type:'full-time', min_cgpa:'6.0', max_backlogs:'0', eligible_branches:[], required_skills:'', deadline:'', drive_date:'', rounds:'' }); }}
            style={{ padding: '10px 20px', background: 'rgba(124,92,252,0.12)', border: '1px solid rgba(124,92,252,0.3)',
              borderRadius: 9, color: '#7c5cfc', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Post Another Job
          </button>
          <button onClick={() => navigate('/recruiter/dashboard')}
            style={{ padding: '10px 20px', background: '#7c5cfc', border: 'none',
              borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={T.page}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800,
          color: isDark ? '#f0f6ff' : '#0f172a', fontFamily: "'Sora',sans-serif" }}>
          Post a New Job
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: isDark ? '#475569' : '#64748b' }}>
          Fill in the details — once submitted, the placement officer will review and approve it.
        </p>
        {/* Approval info banner */}
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(245,166,35,0.08)',
          border: '1px solid rgba(245,166,35,0.25)', borderRadius: 9,
          display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <AlertCircle size={15} color="#f5a623" style={{ flexShrink: 0, marginTop: 1 }}/>
          <p style={{ margin: 0, fontSize: 12, color: isDark ? '#94a3b8' : '#475569', lineHeight: 1.5 }}>
            <strong style={{ color: '#f5a623' }}>Approval Required:</strong> Jobs are reviewed by the placement officer
            before going live. Approved jobs are automatically announced to students.
          </p>
        </div>
      </div>

      <form onSubmit={submit}>

        {/* Basic Info */}
        <div style={T.card}>
          <div style={T.cardTitle}><Briefcase size={14}/>Basic Information</div>
          <div style={T.grid2}>
            <div>
              <label style={T.label}>Job Title <span style={{ color: '#f04b4b' }}>*</span></label>
              <input style={T.input} value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="e.g. Software Engineer" required/>
            </div>
            <div>
              <label style={T.label}>Package (LPA) <span style={{ color: '#f04b4b' }}>*</span></label>
              <input style={T.input} type="number" min="0" step="0.1" value={form.package_lpa}
                onChange={e => set('package_lpa', e.target.value)} placeholder="e.g. 7.5" required/>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={T.label}>Job Description <span style={{ color: '#f04b4b' }}>*</span></label>
            <textarea style={{ ...T.input, resize: 'vertical', minHeight: 100 }}
              value={form.description} onChange={e => set('description', e.target.value)}
              rows={4} placeholder="Describe the role, responsibilities, and what you're looking for..." required/>
          </div>
          <div style={{ ...T.grid2, marginTop: 14 }}>
            <div>
              <label style={T.label}>Job Type</label>
              <select style={T.input} value={form.job_type} onChange={e => set('job_type', e.target.value)}>
                <option value="full-time">Full Time</option>
                <option value="internship">Internship</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <div>
              <label style={T.label}>Interview Rounds</label>
              <input style={T.input} value={form.rounds} onChange={e => set('rounds', e.target.value)}
                placeholder="e.g. Aptitude → Technical → HR"/>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={T.label}>Required Skills</label>
            <input style={T.input} value={form.required_skills}
              onChange={e => set('required_skills', e.target.value)}
              placeholder="e.g. Java, DSA, SQL, Problem Solving  (comma separated)"/>
          </div>
        </div>

        {/* Eligibility */}
        <div style={T.card}>
          <div style={T.cardTitle}><Users size={14}/>Eligibility Criteria</div>
          <div style={T.grid2}>
            <div>
              <label style={T.label}>Minimum CGPA</label>
              <input style={T.input} type="number" min="0" max="10" step="0.1"
                value={form.min_cgpa} onChange={e => set('min_cgpa', e.target.value)} placeholder="6.0"/>
            </div>
            <div>
              <label style={T.label}>Max Backlogs Allowed</label>
              <input style={T.input} type="number" min="0" value={form.max_backlogs}
                onChange={e => set('max_backlogs', e.target.value)} placeholder="0"/>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ ...T.label, marginBottom: 0 }}>
                Eligible Branches <span style={{ color: '#f04b4b' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={selectAll} style={{ fontSize: 11, color: '#7c5cfc',
                  background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Select All</button>
                <button type="button" onClick={clearAll} style={{ fontSize: 11, color: '#f04b4b',
                  background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Clear</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {BRANCHES.map(b => {
                const sel = form.eligible_branches.includes(b);
                return (
                  <button type="button" key={b} onClick={() => toggleBranch(b)} style={{
                    padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                    background: sel ? 'rgba(124,92,252,0.18)' : (isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'),
                    border: `1px solid ${sel ? '#7c5cfc' : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0')}`,
                    color: sel ? '#7c5cfc' : (isDark ? '#64748b' : '#94a3b8'),
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {sel && <CheckCircle size={11}/>}{b}
                  </button>
                );
              })}
            </div>
            {form.eligible_branches.length > 0 && (
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#7c5cfc' }}>
                {form.eligible_branches.length} branch{form.eligible_branches.length > 1 ? 'es' : ''} selected
              </p>
            )}
          </div>
        </div>

        {/* Schedule — date inputs with proper styling */}
        <div style={T.card}>
          <div style={T.cardTitle}><Calendar size={14}/>Schedule & Dates</div>
          <div style={T.grid2}>
            <div>
              <label style={T.label}>
                Application Deadline <span style={{ color: '#f04b4b' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  style={{ ...T.input, ...T.dateInput, paddingRight: 36 }}
                  value={form.deadline}
                  min={today}
                  onChange={e => set('deadline', e.target.value)}
                  required
                />
                <Calendar size={14} color={isDark ? '#475569' : '#94a3b8'}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}/>
              </div>
              {form.deadline && (
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#10c98a' }}>
                  📅 {new Date(form.deadline + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                </p>
              )}
            </div>
            <div>
              <label style={T.label}>Drive / Test Date <span style={{ color: isDark ? '#475569' : '#94a3b8' }}>(optional)</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  style={{ ...T.input, ...T.dateInput, paddingRight: 36 }}
                  value={form.drive_date}
                  min={form.deadline || today}
                  onChange={e => set('drive_date', e.target.value)}
                />
                <Clock size={14} color={isDark ? '#475569' : '#94a3b8'}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}/>
              </div>
              {form.drive_date && (
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#10c98a' }}>
                  📅 {new Date(form.drive_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                </p>
              )}
              {!form.drive_date && (
                <p style={{ margin: '4px 0 0', fontSize: 11, color: isDark ? '#334155' : '#cbd5e1' }}>
                  Leave blank if not scheduled yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => navigate('/recruiter/dashboard')} style={{
            padding: '11px 22px', background: 'transparent',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'}`,
            borderRadius: 9, fontSize: 13, fontWeight: 600,
            color: isDark ? '#64748b' : '#94a3b8', cursor: 'pointer',
          }}>Cancel</button>
          <button type="submit" disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 28px', background: '#7c5cfc', color: '#fff',
            border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.75 : 1,
            boxShadow: '0 4px 14px rgba(124,92,252,0.4)',
          }}>
            {loading
              ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }}/> Submitting...</>
              : <><Send size={15}/> Submit for Approval</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
