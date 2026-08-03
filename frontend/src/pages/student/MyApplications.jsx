// src/pages/student/MyApplications.jsx
import { useState, useEffect, useCallback } from 'react';
import { applicationsAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { subscribeToApplications } from '../../supabaseClient';
import { Building2, CheckCircle2, Circle, XCircle, Loader2, Briefcase, Clock } from 'lucide-react';

const CYAN='#4f46e5', GREEN='#16a34a', RED='#dc2626', MUTED='#475569';

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
  // Backend may not have populated `stage` for legacy rows — fall back to status
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
      const { data } = await applicationsAPI.getMyApps();
      const list = Array.isArray(data) ? data : (data?.applications || []);
      setApps(list.map(normalizeApp));
    } catch { /* interceptor handles */ }
    finally { setLoading(false); }
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

  if (loading) {
    return <div style={s.center}><Loader2 size={32} color={CYAN} style={{ animation:'spin 1s linear infinite' }} /></div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={s.h1}>My Applications</h1>
        <p style={s.sub}>{apps.length} application{apps.length !== 1 ? 's' : ''} · live status updates</p>
      </div>

      {apps.length === 0 ? (
        <div style={s.emptyCard}>
          <Briefcase size={28} color={MUTED} style={{ marginBottom: 10 }} />
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>You haven't applied to any jobs yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {apps.map(app => <AppCard key={app.id} app={app} />)}
        </div>
      )}
    </div>
  );
}

function AppCard({ app }) {
  const job = app.job_postings || {};
  const company = job.companies || {};
  const rejected = app.stage === 'rejected';
  const currentIdx = STAGE_INDEX[app.stage] ?? 0;

  return (
    <div style={{ ...s.card, borderColor: rejected ? 'rgba(220,38,38,0.3)' : 'rgba(79,70,229,0.15)' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={s.logo}><Building2 size={20} color={rejected ? RED : CYAN} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{job.title || 'Role'}</p>
          <p style={{ margin: 0, fontSize: 13, color: rejected ? RED : CYAN, fontWeight: 600 }}>{company.name || 'Company'}</p>
        </div>
        {job.package_lpa != null && (
          <span style={{ fontSize: 15, fontWeight: 800, color: GREEN, fontFamily: "'Sora',sans-serif" }}>{job.package_lpa} LPA</span>
        )}
      </div>

      {rejected ? (
        <div style={s.rejectedBanner}>
          <XCircle size={16} color={RED} />
          <span style={{ fontSize: 13, fontWeight: 600, color: RED }}>Not selected for this role</span>
        </div>
      ) : (
        <Stepper currentIdx={currentIdx} />
      )}

      {app.drive_date || job.drive_date ? (
        <p style={{ margin: '14px 0 0', fontSize: 12, color: MUTED, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={12} /> Drive: {new Date(job.drive_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
        </p>
      ) : null}
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
  logo:     { width: 48, height: 48, borderRadius: 12, background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepper:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  stepWrap: { display: 'flex', alignItems: 'flex-start', flex: 1, position: 'relative' },
  stepCol:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0, zIndex: 1, minWidth: 66 },
  stepIcon: { width: 38, height: 38, borderRadius: '50%', border: '2px solid', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  connector:{ position: 'absolute', top: 18, left: '-50%', right: '50%', height: 2, zIndex: 0 },
  rejectedBanner: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10 },
  emptyCard: { textAlign: 'center', padding: '48px 24px', background: 'var(--bg-card-high)', border: '1px solid var(--border)', borderRadius: 16 },
};
