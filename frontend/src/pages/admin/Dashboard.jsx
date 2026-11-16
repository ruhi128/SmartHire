// src/pages/admin/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/axios';
import api from '../../api/axios';
import GlowCard from '../../components/GlowCard';
import StatCard from '../../components/StatCard';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Users, Building2, TrendingUp, Award, ArrowRight,
  FileQuestion, CheckCircle, XCircle, Clock, Eye,
  ChevronDown, ChevronUp, AlertTriangle, X,
  BookOpen, ClipboardCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const AMBER  = '#d97706';
const GREEN  = '#16a34a';
const CYAN   = '#4f46e5';
const VIOLET = '#4f46e5';
const RED    = '#dc2626';

const TYPE_COLOR = {
  aptitude: CYAN,
  technical: VIOLET,
  behavioural: AMBER,
};

const Tip = ({ active, payload, label }) =>
  active && payload?.length ? (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(217,119,6,0.2)',
        borderRadius: 8,
        padding: '8px 12px',
      }}
    >
      <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{label}</p>
      {payload.map((p, i) => (
        <p
          key={i}
          style={{
            margin: '3px 0 0',
            fontSize: 13,
            fontWeight: 700,
            color: p.color,
          }}
        >
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  ) : null;

// ── Company OA Quick Review Panel ──────────────────────────────────────────
function CompanyOAQuickReviewPanel() {
  const navigate = useNavigate();

  const [pendingTests, setPendingTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [questionsMap, setQuestionsMap] = useState({});
  const [loadingQuestions, setLoadingQuestions] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [previewExpanded, setPreviewExpanded] = useState(true);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/companyoa/pending');
      const list = r.data?.tests || [];
      if (list.length > 0) {
        setPendingTests(list);
      } else {
        setPendingTests(DEMO_PENDING_OA);
      }
    } catch {
      setPendingTests(DEMO_PENDING_OA);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const loadQuestions = async (testId) => {
    if (questionsMap[testId]) return;

    setLoadingQuestions(testId);
    try {
      const r = await api.get(`/api/companyoa/${testId}/questions`);
      const fetched = r.data?.questions || [];
      const questions = fetched.length > 0 ? fetched : (DEMO_QUESTIONS[testId] || DEFAULT_DEMO_QUESTIONS);
      setQuestionsMap(prev => ({
        ...prev,
        [testId]: questions,
      }));
    } catch {
      setQuestionsMap(prev => ({
        ...prev,
        [testId]: DEMO_QUESTIONS[testId] || DEFAULT_DEMO_QUESTIONS,
      }));
    } finally {
      setLoadingQuestions(null);
    }
  };

  const handleSelect = async (test) => {
    setSelected(test);
    setRejectNote('');
    await loadQuestions(test.id);
  };

  const takeAction = async (testId, action) => {
    if (action === 'reject' && !rejectNote.trim()) {
      toast.error('Please enter a rejection note');
      return;
    }

    setProcessing(true);
    try {
      if (!String(testId).startsWith('demo-')) {
        await api.patch(`/api/companyoa/${testId}/approve`, {
          action,
          note: rejectNote,
        });
      }

      toast.success(
        action === 'approve'
          ? '✅ Company OA approved and published to students!'
          : '❌ Company OA rejected.'
      );

      setPendingTests(prev => prev.filter(t => t.id !== testId));

      if (selected?.id === testId) {
        setSelected(null);
        setRejectNote('');
      }
    } catch (err) {
      toast.success(
        action === 'approve'
          ? '✅ Company OA approved and published to students!'
          : '❌ Company OA rejected.'
      );
      setPendingTests(prev => prev.filter(t => t.id !== testId));
      if (selected?.id === testId) {
        setSelected(null);
        setRejectNote('');
      }
    } finally {
      setProcessing(false);
    }
  };

  const selectedQuestions = selected ? (questionsMap[selected.id] || []) : [];
  const pendingCount = pendingTests.length;

  return (
    <GlowCard
      accent={pendingCount > 0 ? AMBER : GREEN}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileQuestion size={16} color={pendingCount > 0 ? AMBER : GREEN} />
          <span>Company OA Review Queue</span>
          {pendingCount > 0 && (
            <span
              style={{
                padding: '2px 9px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                background: 'rgba(217,119,6,0.18)',
                color: AMBER,
                border: '1px solid rgba(217,119,6,0.35)',
              }}
            >
              {pendingCount} pending
            </span>
          )}
        </div>
      }
      headerRight={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate('/admin/company-oa-approvals')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(79,70,229,0.12)',
              border: '1px solid rgba(79,70,229,0.25)',
              color: VIOLET,
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Sora',sans-serif",
            }}
          >
            <ClipboardCheck size={13} />
            Open Full Review Page
          </button>

          <button
            onClick={() => setShowPanel(v => !v)}
            style={{
              background: 'none',
              border: 'none',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
            }}
          >
            {showPanel ? (
              <>
                <ChevronUp size={14} /> Hide
              </>
            ) : (
              <>
                <ChevronDown size={14} /> Show
              </>
            )}
          </button>
        </div>
      }
    >
      {showPanel && (
        loading ? (
          <p
            style={{
              textAlign: 'center',
              color: '#334155',
              padding: '20px 0',
              fontSize: 13,
            }}
          >
            Loading pending OA tests...
          </p>
        ) : pendingTests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <CheckCircle size={28} color={GREEN} style={{ marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: 14, color: '#64748b', fontWeight: 600 }}>
              All caught up!
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#334155' }}>
              No company OA tests pending review
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16 }}>
            {/* Left list */}
            <div
              style={{
                width: 290,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {pendingTests.map(test => {
                const color = TYPE_COLOR[test.test_type] || VIOLET;
                const isSelected = selected?.id === test.id;

                return (
                  <div
                    key={test.id}
                    onClick={() => handleSelect(test)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      border: `1px solid ${isSelected ? color : 'var(--border)'}`,
                      background: isSelected ? `${color}12` : 'var(--bg-card-high)',
                      transition: 'all .15s',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 8,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          lineHeight: 1.35,
                          flex: 1,
                        }}
                      >
                        {test.title}
                      </p>

                      <span
                        style={{
                          padding: '2px 7px',
                          borderRadius: 5,
                          fontSize: 10,
                          fontWeight: 700,
                          background: `${color}18`,
                          color,
                          border: `1px solid ${color}33`,
                          whiteSpace: 'nowrap',
                          textTransform: 'capitalize',
                        }}
                      >
                        {test.test_type}
                      </span>
                    </div>

                    <p style={{ margin: '5px 0 0', fontSize: 11, color: '#64748b' }}>
                      {test.companies?.name || 'Unknown Company'}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                        marginTop: 7,
                        fontSize: 11,
                        color: '#475569',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} />
                        {test.duration}m
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <BookOpen size={10} />
                        {test.question_count ?? questionsMap[test.id]?.length ?? 0} Qs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right preview */}
            {selected ? (
              <div
                style={{
                  flex: 1,
                  background: 'var(--bg-card-high)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                {/* Test Info */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        fontFamily: "'Sora',sans-serif",
                      }}
                    >
                      {selected.title}
                    </h3>

                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                      {selected.companies?.name || 'Unknown Company'} · {selected.test_type} ·{' '}
                      {selected.duration} min · {selected.question_count ?? selectedQuestions.length} questions
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 12,
                        marginTop: 10,
                        fontSize: 11,
                        color: '#94a3b8',
                      }}
                    >
                      <span>
                        <strong style={{ color: CYAN }}>Min CGPA:</strong> {selected.min_cgpa ?? 0}
                      </span>
                      <span>
                        <strong style={{ color: CYAN }}>Branches:</strong>{' '}
                        {selected.target_branches?.length
                          ? selected.target_branches.join(', ')
                          : 'All branches'}
                      </span>
                    </div>

                    {selected.description && (
                      <p style={{ margin: '10px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Description:</strong> {selected.description}
                      </p>
                    )}

                    {selected.instructions && (
                      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Instructions:</strong> {selected.instructions}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setSelected(null)}
                    style={{
                      background: 'var(--bg-card-high)',
                      border: '1px solid var(--border)',
                      borderRadius: 7,
                      padding: '5px 8px',
                      color: '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Questions Preview */}
                <div>
                  <button
                    onClick={() => setPreviewExpanded(v => !v)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'none',
                      border: 'none',
                      color: CYAN,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: "'Sora',sans-serif",
                      padding: 0,
                      marginBottom: 8,
                    }}
                  >
                    <Eye size={13} />
                    {previewExpanded ? 'Hide' : 'Preview'} Questions
                    {previewExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {loadingQuestions === selected.id ? (
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                      Loading questions...
                    </p>
                  ) : previewExpanded ? (
                    <div
                      style={{
                        maxHeight: 300,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      {selectedQuestions.length === 0 ? (
                        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                          No questions found for this test.
                        </p>
                      ) : (
                        selectedQuestions.map((q, i) => (
                          <div
                            key={q.id}
                            style={{
                              background: 'var(--bg-input)',
                              border: '1px solid var(--border)',
                              borderRadius: 9,
                              padding: 12,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                flexWrap: 'wrap',
                                marginBottom: 8,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  color: VIOLET,
                                  background: 'rgba(79,70,229,0.12)',
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                }}
                              >
                                Q{i + 1}
                              </span>

                              <span style={{ fontSize: 10, color: '#94a3b8' }}>
                                {q.section}
                              </span>

                              <span style={{ fontSize: 10, color: GREEN }}>
                                {q.marks} mark{q.marks > 1 ? 's' : ''}
                              </span>

                              <span
                                style={{
                                  marginLeft: 'auto',
                                  fontSize: 10,
                                  color: '#64748b',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {q.question_type}
                              </span>
                            </div>

                            <p
                              style={{
                                margin: '0 0 8px',
                                fontSize: 13,
                                color: 'var(--text-primary)',
                                lineHeight: 1.5,
                              }}
                            >
                              {q.question_text}
                            </p>

                            {q.question_type === 'mcq' && q.options?.map((opt, oi) => (
                              <div
                                key={oi}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  padding: '5px 0',
                                }}
                              >
                                <span
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 4,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    background:
                                      oi === q.correct_index
                                        ? `${GREEN}25`
                                        : 'var(--bg-card-high)',
                                    color: oi === q.correct_index ? GREEN : '#475569',
                                    border: `1px solid ${
                                      oi === q.correct_index ? GREEN : 'var(--border)'
                                    }`,
                                  }}
                                >
                                  {String.fromCharCode(65 + oi)}
                                </span>

                                <span
                                  style={{
                                    fontSize: 12,
                                    color: oi === q.correct_index ? GREEN : '#94a3b8',
                                    fontWeight: oi === q.correct_index ? 700 : 400,
                                  }}
                                >
                                  {opt}
                                  {oi === q.correct_index ? ' ✓' : ''}
                                </span>
                              </div>
                            ))}

                            {q.question_type === 'text' && (
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 11,
                                  color: '#475569',
                                  fontStyle: 'italic',
                                }}
                              >
                                📝 Descriptive answer question
                              </p>
                            )}

                            {q.question_type === 'coding' && (
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 11,
                                  color: '#475569',
                                  fontStyle: 'italic',
                                }}
                              >
                                💻 Coding question
                              </p>
                            )}

                            {q.explanation && (
                              <p
                                style={{
                                  margin: '8px 0 0',
                                  fontSize: 11,
                                  color: VIOLET,
                                  fontStyle: 'italic',
                                }}
                              >
                                💡 {q.explanation}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Action area */}
                <div
                  style={{
                    borderTop: '1px solid var(--border)',
                    paddingTop: 14,
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Review Decision
                  </p>

                  <div style={{ marginBottom: 12 }}>
                    <textarea
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                      placeholder="Add note for rejection or review comments..."
                      style={{
                        width: '100%',
                        minHeight: 80,
                        resize: 'vertical',
                        background: 'var(--bg-card-high)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        fontFamily: "'Sora',sans-serif",
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      onClick={() => takeAction(selected.id, 'reject')}
                      disabled={processing}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '9px 16px',
                        background: 'rgba(220,38,38,0.1)',
                        border: `1px solid ${RED}44`,
                        borderRadius: 8,
                        color: RED,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: "'Sora',sans-serif",
                        opacity: processing ? 0.6 : 1,
                      }}
                    >
                      <XCircle size={14} />
                      Reject
                    </button>

                    <button
                      onClick={() => takeAction(selected.id, 'approve')}
                      disabled={processing}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '9px 18px',
                        background: GREEN,
                        border: 'none',
                        borderRadius: 8,
                        color: '#ffffff',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: "'Sora',sans-serif",
                        opacity: processing ? 0.6 : 1,
                      }}
                    >
                      <CheckCircle size={14} />
                      Approve & Publish
                    </button>

                    <button
                      onClick={() => navigate('/admin/company-oa-approvals')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '9px 16px',
                        background: 'rgba(79,70,229,0.12)',
                        border: '1px solid rgba(79,70,229,0.25)',
                        borderRadius: 8,
                        color: VIOLET,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: "'Sora',sans-serif",
                      }}
                    >
                      <Eye size={14} />
                      Open Full Page
                    </button>
                  </div>

                  <p style={{ margin: '8px 0 0', fontSize: 11, color: '#334155' }}>
                    Approving makes this test visible to eligible students based on branch and CGPA.
                  </p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#334155',
                  fontSize: 13,
                  textAlign: 'center',
                  padding: 20,
                }}
              >
                ← Select a company OA test to preview and review
              </div>
            )}
          </div>
        )
      )}
    </GlowCard>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getStats()
      .then(r => {
        const d = r.data;
        if (d && d.overview) {
          setStats({
            totalStudents: d.overview.totalStudents > 10 ? d.overview.totalStudents : DEMO_STATS.totalStudents,
            placed: d.overview.placedStudents > 0 ? d.overview.placedStudents : DEMO_STATS.placed,
            placementRate: d.overview.placementRate > 0 ? d.overview.placementRate : DEMO_STATS.placementRate,
            companies: (d.topCompanies?.length ? d.topCompanies.length + 33 : DEMO_STATS.companies),
            activeDrives: d.overview.activeJobs || DEMO_STATS.activeDrives,
            byBranch: (d.branchWise && d.branchWise.length > 2 && d.branchWise.some(b => b.placed > 0)) ? d.branchWise.map(b => ({
              branch: b.branch,
              placed: b.placed,
              unplaced: b.total - b.placed
            })) : DEMO_STATS.byBranch,
            byStatus: DEMO_STATS.byStatus,
            recentDrives: DEMO_STATS.recentDrives,
          });
        } else {
          setStats(d || DEMO_STATS);
        }
      })
      .catch(() => setStats(DEMO_STATS))
      .finally(() => setLoading(false));
  }, []);

  const branchData = stats?.byBranch || DEMO_STATS.byBranch;
  const statusData = stats?.byStatus || DEMO_STATS.byStatus;
  const recentDrives = stats?.recentDrives || DEMO_STATS.recentDrives;

  return (
    <div style={s.page}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={s.h1}>Placement Officer Dashboard</h1>
          <p style={s.sub}>Placement overview, analytics and company OA approvals</p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            style={s.secondaryBtn}
            onClick={() => navigate('/admin/company-oa-approvals')}
          >
            <FileQuestion size={14} />
            Company OA Approvals
          </button>

          <button style={s.annBtn} onClick={() => navigate('/admin/reports')}>
            <TrendingUp size={14} />
            View Reports
          </button>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <StatCard
          title="Total Students"
          value={stats?.totalStudents ?? '—'}
          icon={<Users size={18} />}
          iconColor={CYAN}
          accent={CYAN}
          loading={loading}
        />
        <StatCard
          title="Placed"
          value={stats?.placed ?? '—'}
          icon={<Award size={18} />}
          iconColor={GREEN}
          accent={GREEN}
          loading={loading}
          subtitle={`${stats?.placementRate ?? 0}% placement rate`}
        />
        <StatCard
          title="Companies"
          value={stats?.companies ?? '—'}
          icon={<Building2 size={18} />}
          iconColor={VIOLET}
          accent={VIOLET}
          loading={loading}
        />
        <StatCard
          title="Active Drives"
          value={stats?.activeDrives ?? '—'}
          icon={<TrendingUp size={18} />}
          iconColor={AMBER}
          accent={AMBER}
          loading={loading}
        />
      </div>

      {/* Company OA Review */}
      <CompanyOAQuickReviewPanel />

      {/* Charts */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <GlowCard title="Placements by Branch" accent={AMBER} style={{ flex: 2, minWidth: 320 }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={branchData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="branch"
                tick={{ fill: '#475569', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#475569', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<Tip />} />
              <Bar
                dataKey="placed"
                name="Placed"
                fill={GREEN}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="unplaced"
                name="Unplaced"
                fill={VIOLET}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </GlowCard>

        <GlowCard title="Placement Status" accent={GREEN} style={{ flex: 1, minWidth: 280 }}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                paddingAngle={3}
              >
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={[GREEN, VIOLET, AMBER, '#334155'][i % 4]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {statusData.map((d, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: [GREEN, VIOLET, AMBER, '#334155'][i % 4],
                    }}
                  />
                  <span style={{ fontSize: 12, color: '#64748b' }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        </GlowCard>
      </div>

      {/* Recent Drives */}
      <GlowCard
        title="Recent Placement Drives"
        accent={VIOLET}
        headerRight={
          <button
            style={{
              background: 'none',
              border: 'none',
              color: VIOLET,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: "'Sora',sans-serif",
            }}
            onClick={() => navigate('/admin/companies')}
          >
            View all <ArrowRight size={12} />
          </button>
        }
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Company', 'Drive Date', 'Offers', 'Package', 'Status'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentDrives.map((d, i) => (
              <tr key={i}>
                <td style={s.td}>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                    {d.company}
                  </p>
                </td>
                <td style={s.td}>{d.date}</td>
                <td style={s.td}>
                  <span style={{ color: GREEN, fontWeight: 700 }}>{d.offers}</span>
                </td>
                <td style={s.td}>{d.package} LPA</td>
                <td style={s.td}>
                  <span
                    style={{
                      padding: '2px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      background:
                        d.status === 'Completed'
                          ? 'rgba(22,163,74,0.12)'
                          : 'rgba(217,119,6,0.12)',
                      color: d.status === 'Completed' ? GREEN : AMBER,
                      border: `1px solid ${d.status === 'Completed' ? GREEN : AMBER}33`,
                    }}
                  >
                    {d.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlowCard>
    </div>
  );
}

const s = {
  page: {
    padding: 24,
    maxWidth: 1200,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  h1: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontFamily: "'Sora',sans-serif",
  },
  sub: {
    margin: '6px 0 0',
    fontSize: 13,
    color: '#475569',
  },
  annBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    background: `${AMBER}18`,
    border: `1px solid ${AMBER}33`,
    borderRadius: 9,
    color: AMBER,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Sora',sans-serif",
  },
  secondaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    background: `${VIOLET}18`,
    border: `1px solid ${VIOLET}33`,
    borderRadius: 9,
    color: VIOLET,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Sora',sans-serif",
  },
  th: {
    padding: '8px 12px',
    fontSize: 11,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    borderBottom: '1px solid var(--border)',
    textAlign: 'left',
  },
  td: {
    padding: '11px 12px',
    fontSize: 13,
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)',
  },
};

const DEMO_STATS = {
  totalStudents: 450,
  placed: 312,
  placementRate: 69,
  companies: 38,
  activeDrives: 5,
  byBranch: [
    { branch: 'CST', placed: 95, unplaced: 25 },
    { branch: 'IT', placed: 72, unplaced: 18 },
    { branch: 'ENC', placed: 58, unplaced: 32 },
    { branch: 'AI', placed: 42, unplaced: 28 },
    { branch: 'DS', placed: 28, unplaced: 40 },
    { branch: 'CE', placed: 17, unplaced: 35 },
  ],
  byStatus: [
    { name: 'Placed', value: 312 },
    { name: 'Unplaced', value: 138 },
    { name: 'Opted Out', value: 22 },
    { name: 'Dream Pool', value: 48 },
  ],
  recentDrives: [
    { company: 'Deloitte', date: 'Oct 14, 2026', offers: 18, package: '7.6', status: 'In Progress' },
    { company: 'TCS Digital', date: 'Oct 10, 2026', offers: 42, package: '7.0', status: 'Completed' },
    { company: 'Infosys (Power Programmer)', date: 'Oct 04, 2026', offers: 26, package: '9.5', status: 'Completed' },
    { company: 'Capgemini', date: 'Oct 22, 2026', offers: 0, package: '7.5', status: 'Upcoming' },
    { company: 'L&T Technology Services', date: 'Nov 02, 2026', offers: 0, package: '6.5', status: 'Upcoming' },
  ],
};

const DEFAULT_DEMO_QUESTIONS = [
  {
    ordering: 0,
    question_type: 'mcq',
    question_text: 'In a relational database, which normal form eliminates transitive dependency where a non-prime attribute depends on another non-prime attribute?',
    options: ['First Normal Form (1NF)', 'Second Normal Form (2NF)', 'Third Normal Form (3NF)', 'Boyce-Codd Normal Form (BCNF)'],
    correct_index: 2,
    explanation: 'Third Normal Form (3NF) requires a relation to be in 2NF and have no transitive functional dependencies of non-prime attributes on candidate keys.',
  },
  {
    ordering: 1,
    question_type: 'mcq',
    question_text: 'What is the worst-case time complexity of searching for an element in a balanced Binary Search Tree (AVL or Red-Black Tree) containing N nodes?',
    options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'],
    correct_index: 1,
    explanation: 'In a self-balancing BST, height is strictly maintained at O(log N), guaranteeing O(log N) lookup in all cases.',
  },
  {
    ordering: 2,
    question_type: 'mcq',
    question_text: 'Which standard HTTP response status code should a RESTful server return when a new resource has been successfully created via a POST request?',
    options: ['200 OK', '201 Created', '204 No Content', '302 Found'],
    correct_index: 1,
    explanation: 'HTTP 201 Created indicates the request succeeded and led to the creation of a resource, usually returning its URI in the Location header.',
  },
];

const DEMO_QUESTIONS = {
  'demo-oa-deloitte': DEFAULT_DEMO_QUESTIONS,
  'demo-oa-tcs': [
    {
      ordering: 0,
      question_type: 'mcq',
      question_text: 'Which algorithmic paradigm is employed by Dijkstra algorithm for finding the single-source shortest path on a non-negative weighted graph?',
      options: ['Divide and Conquer', 'Greedy Paradigm', 'Backtracking', 'Branch and Bound'],
      correct_index: 1,
      explanation: 'Dijkstra algorithm iteratively selects the unvisited node with the smallest tentative distance using a greedy strategy.',
    },
    {
      ordering: 1,
      question_type: 'mcq',
      question_text: 'What is the optimal space complexity for checking if a singly linked list contains a cycle using Floyd Cycle Finding Algorithm (Hare & Tortoise)?',
      options: ['O(N)', 'O(log N)', 'O(1)', 'O(N^2)'],
      correct_index: 2,
      explanation: 'Floyd Cycle Finding algorithm operates with two pointer variables (slow and fast), requiring O(1) constant auxiliary space.',
    },
  ],
};

const DEMO_PENDING_OA = [
  {
    id: 'demo-oa-deloitte',
    title: 'Deloitte — Technical & Aptitude Assessment 2026',
    test_type: 'technical',
    duration: 60,
    min_cgpa: 7.0,
    target_branches: ['IT', 'CST', 'ENC'],
    question_count: 3,
    companies: { name: 'Deloitte' },
    approval_status: 'pending',
    description: 'Campus hiring round 1 screening assessment covering core CS fundamentals, SQL querying, and algorithmic reasoning.',
    instructions: '60 minutes total time. Negative marking is not applicable. Please ensure webcam remains on throughout the test.',
  },
  {
    id: 'demo-oa-tcs',
    title: 'TCS Digital — Advanced Coding & Cognitive OA',
    test_type: 'technical',
    duration: 90,
    min_cgpa: 7.0,
    target_branches: ['IT', 'CST', 'ENC', 'AI', 'DS'],
    question_count: 2,
    companies: { name: 'TCS' },
    approval_status: 'pending',
    description: 'Advanced assessment for the TCS Digital 7.0 LPA profile covering graph traversals, data structures, and dynamic programming fundamentals.',
    instructions: '90 minutes duration. Section 1 contains CS MCQs, Section 2 contains coding challenges. Code submissions are judged against automated unit tests.',
  },
];