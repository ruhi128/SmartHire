// src/pages/recruiter/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { jobsAPI } from '../../api/axios';
import api from '../../api/axios';
import GlowCard from '../../components/GlowCard';
import StatCard from '../../components/StatCard';
import {
  Briefcase, Users, PlusCircle, ChevronRight, Clock,
  CheckCircle, XCircle, Eye, Upload, FileQuestion,
  AlertCircle, CheckSquare, X, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const VIOLET = '#7c5cfc', GREEN = '#10c98a', AMBER = '#f5a623',
      RED = '#f04b4b', CYAN = '#00c8f0';

const STATUS_COLOR = {
  applied: CYAN, shortlisted: AMBER, selected: GREEN, rejected: RED,
};

const STATUS_BADGE = {
  pending:  { color: AMBER,  bg: 'rgba(245,166,35,0.12)',  label: '⏳ Pending Review' },
  approved: { color: GREEN,  bg: 'rgba(16,201,138,0.12)',  label: '✅ Approved & Live' },
  rejected: { color: RED,    bg: 'rgba(240,75,75,0.12)',   label: '❌ Rejected' },
};

const emptyQuestion = () => ({
  questionText: '',
  questionType: 'mcq',
  options: ['', '', '', ''],
  correctAnswer: 0,
  marks: 4,
});

// ── Upload OA Modal ────────────────────────────────────────────────────────
function UploadOAModal({ companyId, onClose, onSuccess }) {
  const [title, setTitle]         = useState('');
  const [testType, setTestType]   = useState('technical');
  const [duration, setDuration]   = useState(60);
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep]           = useState(1); // 1=details, 2=questions

  const updateQuestion = (idx, field, value) =>
    setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, [field]: value } : q));

  const updateOption = (qIdx, optIdx, value) =>
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[optIdx] = value;
      return { ...q, options: opts };
    }));

  const handleSubmit = async () => {
  if (!title.trim()) { toast.error('Enter a test title'); return; }
  const incomplete = questions.findIndex(q =>
    !q.questionText.trim() || 
    (q.questionType === 'mcq' && q.options.some(o => !o.trim()))
  );
  if (incomplete !== -1) { 
    toast.error(`Q${incomplete + 1} is incomplete`); 
    return; 
  }

  setSubmitting(true);
  try {
    // ✅ Fix: use companyoa/submit instead of mockoa/upload
    await api.post('/api/companyoa/submit', {
      title,
      description: '',
      test_type: testType,        // ✅ renamed to match backend
      duration: duration,         // ✅ renamed to match backend
      target_branches: [],
      min_cgpa: 0,
      instructions: 'Do not switch tabs during the assessment.',
      questions: questions.map((q, idx) => ({
        ordering: idx + 1,
        section: 'General',
        question_type: q.questionType,   // ✅ renamed
        question_text: q.questionText,   // ✅ renamed
        options: q.options,
        correct_index: q.correctAnswer,  // ✅ renamed
        marks: q.marks,
        negative_marks: 0.25,
        explanation: '',
        placeholder: '',
        word_limit: 200,
      })),
    });
    toast.success('OA submitted for admin review!');
    onSuccess();
    onClose();
  } catch (err) {
    toast.error(err.response?.data?.error || 'Submission failed');
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div style={m.overlay}>
      <div style={m.modal}>
        {/* Header */}
        <div style={m.mHeader}>
          <div>
            <h2 style={m.mTitle}>Upload Mock OA Test</h2>
            <p style={m.mSub}>Questions will be reviewed by admin before going live</p>
          </div>
          <button onClick={onClose} style={m.closeBtn}><X size={18}/></button>
        </div>

        {/* Step tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
          {[{ n: 1, l: 'Test Details' }, { n: 2, l: `Questions (${questions.length})` }].map(({ n, l }) => (
            <button key={n} onClick={() => setStep(n)} style={{
              padding: '10px 20px', background: 'none', border: 'none',
              borderBottom: step === n ? `2px solid ${VIOLET}` : '2px solid transparent',
              color: step === n ? VIOLET : '#475569', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Sora',sans-serif",
            }}>{n}. {l}</button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 180px)', paddingRight: 4 }}>
          {/* Step 1: Details */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={m.label}>Test Title *</label>
                <input style={m.input} placeholder="e.g. TCS NQT Technical Round 2025"
                  value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={m.label}>Test Type *</label>
                  <select style={m.input} value={testType} onChange={e => setTestType(e.target.value)}>
                    <option value="technical">Technical</option>
                    <option value="aptitude">Aptitude</option>
                    <option value="behavioural">Behavioural</option>
                  </select>
                </div>
                <div>
                  <label style={m.label}>Duration (minutes)</label>
                  <input type="number" style={m.input} value={duration}
                    onChange={e => setDuration(Number(e.target.value))} min={10} max={180} />
                </div>
              </div>
              <div style={{ background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.2)', borderRadius: 10, padding: 14 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                  <span style={{ color: VIOLET, fontWeight: 700 }}>📋 Review Process: </span>
                  After submission, the placement officer will review your questions. Once approved, the test automatically becomes available to all students on the platform.
                </p>
              </div>
              <button onClick={() => setStep(2)} style={{ ...m.primaryBtn, alignSelf: 'flex-end' }}>
                Next: Add Questions →
              </button>
            </div>
          )}

          {/* Step 2: Questions */}
          {step === 2 && (
            <div>
              {questions.map((q, qi) => (
                <div key={qi} style={m.questionCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: VIOLET }}>Question {qi + 1}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select style={{ ...m.input, padding: '4px 10px', fontSize: 11, width: 'auto' }}
                        value={q.questionType} onChange={e => updateQuestion(qi, 'questionType', e.target.value)}>
                        <option value="mcq">MCQ</option>
                        <option value="text">Descriptive</option>
                      </select>
                      <input type="number" style={{ ...m.input, padding: '4px 10px', width: 70, fontSize: 11 }}
                        value={q.marks} min={1} max={20}
                        onChange={e => updateQuestion(qi, 'marks', Number(e.target.value))} />
                      <span style={{ fontSize: 11, color: '#475569' }}>marks</span>
                      {questions.length > 1 && (
                        <button onClick={() => setQuestions(qs => qs.filter((_, i) => i !== qi))}
                          style={{ background: 'rgba(240,75,75,0.1)', border: '1px solid rgba(240,75,75,0.2)', borderRadius: 6, padding: '4px 8px', color: RED, cursor: 'pointer' }}>
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea style={{ ...m.input, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }}
                    placeholder="Enter your question here..."
                    value={q.questionText}
                    onChange={e => updateQuestion(qi, 'questionText', e.target.value)} />

                  {q.questionType === 'mcq' && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>Options — click the radio button to mark the correct answer</p>
                      {q.options.map((opt, oi) => (
                        <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="radio" name={`correct-${qi}`} checked={q.correctAnswer === oi}
                            onChange={() => updateQuestion(qi, 'correctAnswer', oi)}
                            style={{ accentColor: GREEN, width: 16, height: 16, cursor: 'pointer' }} />
                          <input style={{ ...m.input, flex: 1, padding: '8px 12px' }}
                            placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                            value={opt} onChange={e => updateOption(qi, oi, e.target.value)} />
                          <span style={{ fontSize: 11, color: q.correctAnswer === oi ? GREEN : '#475569', fontWeight: 700, width: 60, textAlign: 'right' }}>
                            {q.correctAnswer === oi ? '✓ Correct' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.questionType === 'text' && (
                    <p style={{ margin: '10px 0 0', fontSize: 11, color: '#475569' }}>
                      📝 Descriptive question — students will write a text response. Full marks awarded for sufficient answers.
                    </p>
                  )}
                </div>
              ))}

              <button onClick={() => setQuestions(qs => [...qs, emptyQuestion()])}
                style={{ width: '100%', padding: '11px', background: 'rgba(124,92,252,0.06)', border: '1px dashed rgba(124,92,252,0.3)', borderRadius: 10, color: VIOLET, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora',sans-serif", marginBottom: 16 }}>
                + Add Question
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16, marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#475569' }}>{questions.length} question{questions.length !== 1 ? 's' : ''} · {questions.reduce((s, q) => s + q.marks, 0)} total marks</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={m.secondaryBtn}>Cancel</button>
            {step === 2 && (
              <button onClick={handleSubmit} disabled={submitting} style={{ ...m.primaryBtn, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Submitting...' : '📤 Submit for Review'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function RecruiterDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);

  // OA Upload state
  const [showUpload,     setShowUpload]     = useState(false);
  const [myUploads,      setMyUploads]      = useState([]);
  const [uploadsLoading, setUploadsLoading] = useState(true);
  const [showUploads,    setShowUploads]    = useState(true);

  // FIX: companyId fetched from the companies table via dedicated call.
  // Never falls back to a string placeholder — stays null until confirmed.
  const [companyId,      setCompanyId]      = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  // ── Fetch recruiter's company id ──────────────────────────────────────
  // The backend verifies ownership via: companies.eq('recruiter_id', req.user.id)
  // so we must send the real UUID from that table row.
  // ✅ Fix: read from companyoa/my instead of mockoa/my-uploads
useEffect(() => {
  api.get('/api/companies/mine')
    .then(r => {
      const id = r.data?.company?.id || r.data?.id || null;
      setCompanyId(id);
    })
    .catch(() => setCompanyId(null))
    .finally(() => setCompanyLoading(false));

  jobsAPI.getAll()
    .then(r => setJobs(r.data?.jobs || DEMO_JOBS))
    .catch(() => setJobs(DEMO_JOBS))
    .finally(() => setLoading(false));

  // ✅ Changed from /api/mockoa/my-uploads
  api.get('/api/companyoa/my')
    .then(r => {
      const tests = r.data?.tests || [];
      setMyUploads(tests);
    })
    .catch(() => setMyUploads([]))
    .finally(() => setUploadsLoading(false));
}, []);

  const refreshUploads = () => {
  setUploadsLoading(true);
  // ✅ Changed from /api/mockoa/my-uploads
  api.get('/api/companyoa/my')
    .then(r => setMyUploads(r.data?.tests || []))
    .catch(() => {})
    .finally(() => setUploadsLoading(false));
};

  // ── Guard: open modal only when companyId is a real UUID ─────────────
  const handleOpenUpload = () => {
    if (companyLoading) {
      toast('Loading company info, please wait…', { icon: '⏳' });
      return;
    }
    if (!companyId) {
      toast.error('No company linked to your account. Contact admin.');
      return;
    }
    setShowUpload(true);
  };

  const totalApplicants  = jobs.reduce((s, j) => s + (j.applicant_count || 0), 0);
  const activeJobs       = jobs.filter(j => j.status === 'active').length;
// ✅ Fix: use approval_status instead of status
const pendingOAs  = myUploads.filter(t => t.approval_status === 'pending').length;
const approvedOAs = myUploads.filter(t => t.approval_status === 'approved').length;

  return (
    <div style={s.page}>
      {/* Upload Modal — only rendered when companyId is a confirmed UUID */}
      {showUpload && companyId && (
        <UploadOAModal
          companyId={companyId}
          onClose={() => setShowUpload(false)}
          onSuccess={refreshUploads}
        />
      )}

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.h1}>Recruiter Dashboard</h1>
          <p style={s.sub}>Welcome back, {user?.name || 'Recruiter'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={s.uploadBtn} onClick={handleOpenUpload}>
            <Upload size={15} /> Upload OA Test
          </button>
          <button style={s.postBtn} onClick={() => navigate('/recruiter/post-job')}>
            <PlusCircle size={16} /> Post New Job
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard title="Active Jobs"      value={activeJobs}      icon={<Briefcase size={18}/>}    iconColor={VIOLET} accent={VIOLET} loading={loading} />
        <StatCard title="Total Applicants" value={totalApplicants} icon={<Users size={18}/>}        iconColor={CYAN}   accent={CYAN}   loading={loading} />
        <StatCard title="Shortlisted"      value={jobs.reduce((s,j)=>s+(j.shortlisted_count||0),0)} icon={<CheckCircle size={18}/>} iconColor={GREEN} accent={GREEN} loading={loading} />
        <StatCard title="OA Tests Uploaded" value={myUploads.length} icon={<FileQuestion size={18}/>} iconColor={AMBER} accent={AMBER} loading={uploadsLoading}
          subtitle={pendingOAs > 0 ? `${pendingOAs} pending review` : approvedOAs > 0 ? `${approvedOAs} live` : undefined} />
      </div>

      {/* ── OA Upload Status Panel ─────────────────────────────────────── */}
      <GlowCard accent={AMBER}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileQuestion size={16} color={AMBER} />
            <span>My OA Test Uploads</span>
            {pendingOAs > 0 && (
              <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(245,166,35,0.15)', color: AMBER, border: '1px solid rgba(245,166,35,0.3)' }}>
                {pendingOAs} awaiting review
              </span>
            )}
          </div>
        }
        headerRight={
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.uploadBtn} onClick={handleOpenUpload}>
              <Upload size={13} /> Upload New
            </button>
            <button onClick={() => setShowUploads(v => !v)}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {showUploads ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
          </div>
        }>
        {showUploads && (
          uploadsLoading ? (
            <p style={{ textAlign: 'center', color: '#334155', padding: '20px 0', fontSize: 13 }}>Loading uploads...</p>
          ) : myUploads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <FileQuestion size={32} color="#334155" style={{ marginBottom: 10 }} />
              <p style={{ margin: '0 0 6px', fontSize: 14, color: '#64748b', fontWeight: 600 }}>No OA tests uploaded yet</p>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: '#334155' }}>Upload mock OA questions for students to practice with your company's test style</p>
              <button style={s.uploadBtn} onClick={handleOpenUpload}>
                <Upload size={13} /> Upload Your First OA Test
              </button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Test Title', 'Type', 'Duration', 'Submitted', 'Status', 'Reason'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {myUploads.map(test => {
  // ✅ Fix: use approval_status instead of status
  const badge = STATUS_BADGE[test.approval_status] || STATUS_BADGE.pending;
  return (
    <tr key={test.id}>
      <td style={s.td}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
          {test.title}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#475569' }}>
          {test.companies?.name}
        </p>
      </td>
      <td style={s.td}>
        {/* ✅ Fix: use test_type instead of type */}
        <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>
          {test.test_type}
        </span>
      </td>
      <td style={s.td}>{test.duration}m</td>
      <td style={s.td}>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {test.created_at 
            ? new Date(test.created_at).toLocaleDateString('en-IN', { 
                day: 'numeric', month: 'short' 
              }) 
            : '—'}
        </span>
      </td>
      <td style={s.td}>
        <span style={{ 
          padding: '3px 10px', borderRadius: 999, fontSize: 11, 
          fontWeight: 700, background: badge.bg, color: badge.color, 
          border: `1px solid ${badge.color}33`, whiteSpace: 'nowrap' 
        }}>
          {badge.label}
        </span>
      </td>
      <td style={s.td}>
        {/* ✅ Fix: use approval_status and approval_note */}
        {test.approval_status === 'rejected' && test.approval_note ? (
          <span style={{ fontSize: 11, color: RED, fontStyle: 'italic' }}>
            {test.approval_note}
          </span>
        ) : test.approval_status === 'approved' ? (
          <span style={{ fontSize: 11, color: GREEN }}>Live for students ✓</span>
        ) : (
          <span style={{ fontSize: 11, color: '#334155' }}>Under review</span>
        )}
      </td>
    </tr>
  );
})}
              </tbody>
            </table>
          )
        )}
      </GlowCard>

      {/* ── Job Postings Table ─────────────────────────────────────────── */}
      <GlowCard title="Your Job Postings" accent={VIOLET}
        headerRight={<button style={s.linkBtn} onClick={() => navigate('/recruiter/applicants')}>View all applicants</button>}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Job Title', 'Posted', 'Applicants', 'Deadline', 'Status', ''].map(h => (
              <th key={h} style={s.th}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.id}>
                <td style={s.td}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{job.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#475569' }}>{job.package_lpa} LPA</p>
                </td>
                <td style={s.td}>{new Date(job.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                <td style={s.td}><span style={{ fontSize: 14, fontWeight: 700, color: CYAN }}>{job.applicant_count || 0}</span></td>
                <td style={s.td}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: AMBER }}>
                    <Clock size={11}/>{new Date(job.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </td>
                <td style={s.td}>
                  <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: job.status === 'active' ? 'rgba(16,201,138,0.12)' : 'rgba(100,116,139,0.12)',
                    color: job.status === 'active' ? GREEN : '#64748b',
                    border: `1px solid ${job.status === 'active' ? GREEN : '#64748b'}33`,
                  }}>{job.status}</span>
                </td>
                <td style={s.td}>
                  <button style={s.viewBtn} onClick={() => navigate(`/recruiter/applicants/${job.id}`)}>
                    <Eye size={13}/> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!jobs.length && (
          <p style={{ textAlign: 'center', color: '#334155', padding: '32px 0', fontSize: 13 }}>
            No jobs posted yet.{' '}
            <button style={{ color: VIOLET, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
              onClick={() => navigate('/recruiter/post-job')}>Post your first job →</button>
          </p>
        )}
      </GlowCard>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = {
  page:      { padding: 24, maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  h1:        { margin: 0, fontSize: 24, fontWeight: 800, color: '#f0f6ff', fontFamily: "'Sora',sans-serif" },
  sub:       { margin: '6px 0 0', fontSize: 13, color: '#475569' },
  postBtn:   { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: VIOLET, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora',sans-serif", boxShadow: `0 4px 14px ${VIOLET}44` },
  uploadBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: `${AMBER}18`, color: AMBER, border: `1px solid ${AMBER}33`, borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora',sans-serif" },
  linkBtn:   { background: 'none', border: 'none', color: VIOLET, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora',sans-serif" },
  th:        { padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' },
  td:        { padding: '12px 12px', fontSize: 13, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.03)' },
  viewBtn:   { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'rgba(124,92,252,0.1)', border: '1px solid rgba(124,92,252,0.25)', borderRadius: 7, fontSize: 12, fontWeight: 600, color: VIOLET, cursor: 'pointer', fontFamily: "'Sora',sans-serif" },
};

const m = {
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(4,12,24,0.85)', backdropFilter: 'blur(6px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:        { background: '#0b1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 28 },
  mHeader:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  mTitle:       { margin: 0, fontSize: 20, fontWeight: 800, color: '#f0f6ff', fontFamily: "'Sora',sans-serif" },
  mSub:         { margin: '4px 0 0', fontSize: 12, color: '#475569' },
  closeBtn:     { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 6, color: '#94a3b8', cursor: 'pointer', display: 'flex' },
  label:        { display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input:        { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, fontFamily: "'Sora',sans-serif", outline: 'none', boxSizing: 'border-box' },
  questionCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, marginBottom: 12 },
  primaryBtn:   { display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', background: VIOLET, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora',sans-serif" },
  secondaryBtn: { padding: '10px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontFamily: "'Sora',sans-serif" },
};

const DEMO_JOBS = [
  { id: 'j1', title: 'Software Engineer', package_lpa: 7, deadline: '2024-12-15', status: 'active', applicant_count: 24, shortlisted_count: 8 },
  { id: 'j2', title: 'Frontend Developer', package_lpa: 9, deadline: '2024-12-20', status: 'active', applicant_count: 18, shortlisted_count: 5 },
  { id: 'j3', title: 'Data Analyst', package_lpa: 6, deadline: '2024-11-30', status: 'closed', applicant_count: 31, shortlisted_count: 10 },
];