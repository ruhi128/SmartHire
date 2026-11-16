// src/pages/student/MyApplications.jsx
import { useState, useEffect, useCallback } from 'react';
import { applicationsAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { subscribeToApplications } from '../../supabaseClient';
import { Building2, CheckCircle2, Circle, XCircle, Loader2, Briefcase, Clock, RotateCcw } from 'lucide-react';
import { DEMO_JOBS } from '../../data/demoJobs';

const CYAN='#4f46e5', GREEN='#16a34a', RED='#dc2626', MUTED='#64748b';

// Ordered pipeline (must match backend STAGE_ORDER, minus the terminal rejected branch)
const PIPELINE = [
  { key: 'applied',             label: 'Applied' },
  { key: 'oa_cleared',          label: 'OA Cleared' },
  { key: 'interview_1_cleared', label: 'Interview 1' },
  { key: 'interview_2_cleared', label: 'Interview 2' },
  { key: 'selected',            label: 'Selected' },
];
const STAGE_INDEX = { applied:0, oa_cleared:1, interview_1_cleared:2, interview_2_cleared:3, selected:4 };

function normalizeApp(a) {
  let stage = a.stage;
  if (!stage) {
    if (a.status === 'selected') stage = 'selected';
    else if (a.status === 'rejected') stage = 'rejected';
    else if (a.status === 'shortlisted') stage = 'oa_cleared';
    else stage = 'applied';
  }
  return { ...a, stage };
}

export default function MyApplications() {
  const { user } = useAuth();
  const [apps,    setApps]    = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      let apiList = [];
      try {
        const { data } = await applicationsAPI.getMyApps();
        apiList = Array.isArray(data) ? data : (data?.applications || []);
      } catch {
        // Interceptor or backend offline
      }

      // Merge local demo applications so video demo reflects applied jobs (e.g. Deloitte)
      const storedAppliedIds = JSON.parse(localStorage.getItem('smarthire_applied_jobs') || '[]');
      const existingJobIds = new Set(apiList.map(a => a.job_id || a.job_postings?.id));

      const localDemoApps = storedAppliedIds
        .filter(id => !existingJobIds.has(id))
        .map(id => {
          const demoJob = DEMO_JOBS.find(j => j.id === id);
          if (!demoJob) return null;
          return {
            id: `app_${demoJob.id}`,
            job_id: demoJob.id,
            stage: 'applied',
            status: 'applied',
            applied_at: new Date().toISOString(),
            job_postings: demoJob,
            isDemo: true
          };
        })
        .filter(Boolean);

      const combined = [...localDemoApps, ...apiList.map(normalizeApp)];
      setApps(combined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime: update a card the moment a recruiter advances the stage
  useEffect(() => {
    if (!user?.id) return;
    const channel = subscribeToApplications(user.id, (row) => {
      setApps(prev => prev.map(a => a.id === row.id ? normalizeApp({ ...a, ...row }) : a));
    });
    return () => { channel?.unsubscribe?.(); };
  }, [user?.id]);

  const handleRemoveLocalApp = (jobId) => {
    const stored = JSON.parse(localStorage.getItem('smarthire_applied_jobs') || '[]');
    const next = stored.filter(id => id !== jobId);
    localStorage.setItem('smarthire_applied_jobs', JSON.stringify(next));
    setApps(prev => prev.filter(a => a.job_id !== jobId));
  };

  if (loading) {
    return <div style={s.center}><Loader2 size={32} color={CYAN} style={{ animation:'spin 1s linear infinite' }} /></div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={s.h1}>My Applications</h1>
        <p style={s.sub}>{apps.length} active application{apps.length !== 1 ? 's' : ''} · Recruitment pipeline tracking</p>
      </div>

      {apps.length === 0 ? (
        <div style={s.emptyCard}>
          <Briefcase size={32} color={MUTED} style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>No active applications</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
            Explore available campus placement opportunities under the <strong>Jobs</strong> section and apply to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {apps.map(app => (
            <AppCard 
              key={app.id} 
              app={app} 
              onReset={app.isDemo ? () => handleRemoveLocalApp(app.job_id) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AppCard({ app, onReset }) {
  const job = app.job_postings || {};
  const company = job.companies || {};
  const rejected = app.stage === 'rejected';
  const currentIdx = STAGE_INDEX[app.stage] ?? 0;
  const driveDate = app.drive_date || job.drive_date;

  return (
    <div style={{ ...s.card, borderColor: rejected ? 'rgba(220,38,38,0.3)' : 'rgba(79,70,229,0.18)' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
        {/* Company Logo / Monogram */}
        <div style={s.logo}>
          {company.logo_url ? (
            <img 
              src={company.logo_url} 
              alt={company.name} 
              style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }} 
              onError={(e) => { e.currentTarget.style.display = 'none'; if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <span style={{
            display: company.logo_url ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 14,
            color: rejected ? RED : CYAN
          }}>
            {company.name?.slice(0, 2).toUpperCase() || <Building2 size={20} color={rejected ? RED : CYAN} />}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{job.title || 'Role'}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13, color: rejected ? RED : CYAN, fontWeight: 600 }}>{company.name || 'Company'}</p>
            {company.name === 'Deloitte' && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(37,99,235,0.1)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)' }}>
                Campus Drive
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {job.package_lpa != null && (
            <span style={{ fontSize: 16, fontWeight: 800, color: GREEN, fontFamily: "'Sora',sans-serif" }}>
              {job.package_lpa} LPA
            </span>
          )}
          {onReset && (
            <button 
              onClick={onReset}
              title="Reset this application for video re-takes"
              style={{
                background: 'transparent',
                border: '1px dashed #cbd5e1',
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 11,
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <RotateCcw size={10} /> Reset
            </button>
          )}
        </div>
      </div>

      {rejected ? (
        <div style={s.rejectedBanner}>
          <XCircle size={16} color={RED} />
          <span style={{ fontSize: 13, fontWeight: 600, color: RED }}>Not selected for this role</span>
        </div>
      ) : (
        <Stepper currentIdx={currentIdx} />
      )}

      {driveDate && (
        <p style={{ margin: '16px 0 0', fontSize: 12, color: MUTED, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={12} /> Drive Date: <strong style={{ color: 'var(--text-primary)' }}>{new Date(driveDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</strong>
        </p>
      )}
    </div>
  );
}

function Stepper({ currentIdx }) {
  return (
    <div style={s.stepper}>
      {PIPELINE.map((step, i) => {
        const done    = i < currentIdx;
        const current = i === currentIdx;
        const color   = done || current ? (current ? CYAN : GREEN) : MUTED;
        return (
          <div key={step.key} style={s.stepWrap}>
            {i > 0 && <div style={{ ...s.connector, background: i <= currentIdx ? GREEN : 'var(--border)' }} />}
            <div style={s.stepCol}>
              <div style={{ ...s.stepIcon, borderColor: color }}>
                {done
                  ? <CheckCircle2 size={20} color={GREEN} />
                  : current
                    ? <div style={{ width: 10, height: 10, borderRadius: '50%', background: CYAN, boxShadow: `0 0 10px ${CYAN}` }} />
                    : <Circle size={20} color={MUTED} />}
              </div>
              <span style={{ fontSize: 11, fontWeight: current ? 700 : 500, color, textAlign: 'center', maxWidth: 66 }}>{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const s = {
  center:   { minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  h1:       { margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Sora',sans-serif" },
  sub:      { margin: '6px 0 0', fontSize: 13, color: MUTED },
  card:     { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px' },
  logo:     { width: 48, height: 48, borderRadius: 12, background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', padding: 6 },
  stepper:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  stepWrap: { display: 'flex', alignItems: 'flex-start', flex: 1, position: 'relative' },
  stepCol:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0, zIndex: 1, minWidth: 66 },
  stepIcon: { width: 38, height: 38, borderRadius: '50%', border: '2px solid', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  connector:{ position: 'absolute', top: 18, left: '-50%', right: '50%', height: 2, zIndex: 0 },
  rejectedBanner: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10 },
  emptyCard: { textAlign: 'center', padding: '48px 24px', background: 'var(--bg-card-high)', border: '1px solid var(--border)', borderRadius: 16 },
};
