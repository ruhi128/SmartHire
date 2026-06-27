// src/pages/admin/JobApprovals.jsx
import { useState, useEffect } from 'react';
import { jobsAPI } from '../../api/axios';
import { useTheme } from '../../context/ThemeContext';
import {
  CheckCircle, XCircle, Clock, Briefcase, Building2,
  DollarSign, Users, Calendar, ChevronDown, ChevronUp,
  AlertCircle, Loader2, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function JobApprovals() {
  const { isDark } = useTheme();
  const [jobs,     setJobs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [acting,   setActing]   = useState(null); // job id being processed
  const [reason,   setReason]   = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await jobsAPI.getPending();
      setJobs(r.data || []);
    } catch { toast.error('Failed to load pending jobs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const act = async (jobId, action) => {
    setActing(jobId);
    try {
      await jobsAPI.approve(jobId, action, reason);
      toast.success(action === 'approve'
        ? '✅ Job approved! Students have been notified.'
        : '❌ Job rejected.');
      setJobs(prev => prev.filter(j => j.id !== jobId));
      setExpanded(null);
      setReason('');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Action failed');
    } finally { setActing(null); }
  };

  const T = {
    page:  { padding: 24, maxWidth: 1100, margin: '0 auto' },
    card: {
      background: isDark ? '#0b1a2e' : '#ffffff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: 14, marginBottom: 14, overflow: 'hidden',
    },
    badge: (color) => ({
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 700,
      background: color + '18', color, border: `1px solid ${color}33`,
    }),
    row: {
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 12, color: isDark ? '#94a3b8' : '#64748b',
    },
    textarea: {
      width: '100%', boxSizing: 'border-box', resize: 'vertical',
      background: isDark ? '#071525' : '#f8fafc',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'}`,
      borderRadius: 8, padding: '8px 12px', fontSize: 13,
      color: isDark ? '#e2e8f0' : '#0f172a', outline: 'none',
      fontFamily: "'Sora',sans-serif", minHeight: 70,
    },
  };

  const DC = { 'full-time': '#10c98a', internship: '#00c8f0', contract: '#f5a623' };

  return (
    <div style={T.page}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800,
            color: isDark ? '#f0f6ff' : '#0f172a', fontFamily: "'Sora',sans-serif" }}>
            Job Approvals
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: isDark ? '#475569' : '#64748b' }}>
            Review and approve job postings from recruiters before they go live to students.
          </p>
        </div>
        <button onClick={load} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          borderRadius: 8, fontSize: 12, fontWeight: 600,
          color: isDark ? '#94a3b8' : '#64748b', cursor: 'pointer',
        }}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* Info banner */}
      <div style={{ padding: '10px 14px', marginBottom: 20,
        background: 'rgba(124,92,252,0.07)', border: '1px solid rgba(124,92,252,0.2)',
        borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <AlertCircle size={15} color="#7c5cfc" style={{ flexShrink: 0, marginTop: 1 }}/>
        <p style={{ margin: 0, fontSize: 12, color: isDark ? '#94a3b8' : '#475569', lineHeight: 1.6 }}>
          <strong style={{ color: '#7c5cfc' }}>Approval flow:</strong> When you approve a job,
          it becomes immediately visible in the student job listings <strong>and</strong> an
          announcement is automatically sent to all students. Rejected jobs are hidden and the
          recruiter is notified via the reason field.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Loader2 size={28} color="#7c5cfc" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}/>
          <p style={{ margin: '12px 0 0', color: isDark ? '#475569' : '#94a3b8' }}>Loading pending jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <CheckCircle size={40} color="#10c98a" style={{ marginBottom: 12 }}/>
          <h3 style={{ margin: 0, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>All caught up!</h3>
          <p style={{ color: isDark ? '#475569' : '#94a3b8', marginTop: 6, fontSize: 14 }}>No pending job approvals.</p>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 12, color: isDark ? '#475569' : '#94a3b8', marginBottom: 16 }}>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} pending approval
          </p>
          {jobs.map(job => {
            const isOpen = expanded === job.id;
            return (
              <div key={job.id} style={T.card}>
                {/* Job header — always visible */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* Company logo / initial */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: isDark ? 'rgba(124,92,252,0.15)' : '#ede9fe',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 800, color: '#7c5cfc',
                  }}>
                    {job.companies?.name?.[0] || '?'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#e2e8f0' : '#0f172a' }}>
                        {job.title}
                      </span>
                      <span style={T.badge(DC[job.job_type] || '#94a3b8')}>{job.job_type}</span>
                      <span style={T.badge('#f5a623')}>
                        <Clock size={10}/> Pending Review
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                      <span style={T.row}><Building2 size={12}/>{job.companies?.name || 'Unknown Company'}</span>
                      <span style={T.row}><DollarSign size={12}/>{job.package_lpa} LPA</span>
                      <span style={T.row}><Calendar size={12}/>
                        Deadline: {new Date(job.deadline + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                      </span>
                      {job.drive_date && (
                        <span style={T.row}><Clock size={12}/>
                          Drive: {new Date(job.drive_date + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                        </span>
                      )}
                      <span style={T.row}><Users size={12}/>
                        CGPA {job.min_cgpa}+ · Backlogs ≤{job.max_backlogs}
                      </span>
                      <span style={{ ...T.row, fontSize: 11, color: isDark ? '#334155' : '#cbd5e1' }}>
                        Posted {new Date(job.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                    <button onClick={() => setExpanded(isOpen ? null : job.id)} style={{
                      padding: '6px 12px', background: 'none',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                      borderRadius: 7, fontSize: 12, color: isDark ? '#64748b' : '#94a3b8',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      {isOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                      {isOpen ? 'Collapse' : 'Review'}
                    </button>
                    <button
                      onClick={() => act(job.id, 'reject')}
                      disabled={acting === job.id}
                      style={{
                        padding: '6px 14px', background: 'rgba(240,75,75,0.1)',
                        border: '1px solid rgba(240,75,75,0.3)', borderRadius: 7,
                        fontSize: 12, fontWeight: 700, color: '#f04b4b',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                      <XCircle size={13}/> Reject
                    </button>
                    <button
                      onClick={() => act(job.id, 'approve')}
                      disabled={acting === job.id}
                      style={{
                        padding: '6px 14px', background: 'rgba(16,201,138,0.12)',
                        border: '1px solid rgba(16,201,138,0.3)', borderRadius: 7,
                        fontSize: 12, fontWeight: 700, color: '#10c98a',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                      {acting === job.id
                        ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }}/>
                        : <CheckCircle size={13}/>
                      } Approve
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div style={{
                    borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                    padding: '16px 20px',
                    background: isDark ? 'rgba(0,0,0,0.15)' : '#f8fafc',
                  }}>
                    {/* Description */}
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700,
                        color: isDark ? '#475569' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        Job Description
                      </p>
                      <p style={{ margin: 0, fontSize: 13, color: isDark ? '#94a3b8' : '#475569', lineHeight: 1.7 }}>
                        {job.description}
                      </p>
                    </div>

                    {/* Skills & Branches */}
                    <div style={{ display: 'flex', gap: 24, marginBottom: 14, flexWrap: 'wrap' }}>
                      {job.required_skills?.length > 0 && (
                        <div>
                          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700,
                            color: isDark ? '#475569' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            Skills Required
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {job.required_skills.map(s => (
                              <span key={s} style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11,
                                background: isDark ? 'rgba(0,200,240,0.08)' : '#e0f2fe',
                                color: isDark ? '#00c8f0' : '#0284c7',
                                border: `1px solid ${isDark ? 'rgba(0,200,240,0.2)' : '#bae6fd'}`,
                              }}>{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {job.eligible_branches?.length > 0 && (
                        <div>
                          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700,
                            color: isDark ? '#475569' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            Eligible Branches
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {job.eligible_branches.map(b => (
                              <span key={b} style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11,
                                background: isDark ? 'rgba(124,92,252,0.1)' : '#ede9fe',
                                color: '#7c5cfc', border: '1px solid rgba(124,92,252,0.2)',
                              }}>{b}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reason / note input */}
                    <div>
                      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700,
                        color: isDark ? '#475569' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        Note to Recruiter (optional — shown if rejected)
                      </p>
                      <textarea
                        style={T.textarea}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="e.g. Please add more details about the role, or correct the eligibility criteria..."
                      />
                    </div>

                    {/* Action buttons (also in expanded view) */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
                      <button onClick={() => act(job.id, 'reject')} disabled={acting === job.id} style={{
                        padding: '9px 20px', background: 'rgba(240,75,75,0.1)',
                        border: '1px solid rgba(240,75,75,0.3)', borderRadius: 8,
                        fontSize: 13, fontWeight: 700, color: '#f04b4b', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <XCircle size={14}/> Reject Job
                      </button>
                      <button onClick={() => act(job.id, 'approve')} disabled={acting === job.id} style={{
                        padding: '9px 22px', background: '#10c98a',
                        border: 'none', borderRadius: 8,
                        fontSize: 13, fontWeight: 700, color: '#040c18', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {acting === job.id
                          ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }}/>
                          : <CheckCircle size={14}/>
                        }
                        Approve & Notify Students
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
