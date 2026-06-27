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

const AMBER  = '#f5a623';
const GREEN  = '#10c98a';
const CYAN   = '#00c8f0';
const VIOLET = '#7c5cfc';
const RED    = '#f04b4b';

const TYPE_COLOR = {
  aptitude: CYAN,
  technical: VIOLET,
  behavioural: AMBER,
};

const Tip = ({ active, payload, label }) =>
  active && payload?.length ? (
    <div
      style={{
        background: '#0b1a2e',
        border: '1px solid rgba(245,166,35,0.2)',
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
      setPendingTests(r.data?.tests || []);
    } catch {
      setPendingTests([]);
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
      setQuestionsMap(prev => ({
        ...prev,
        [testId]: r.data?.questions || [],
      }));
    } catch {
      toast.error('Failed to load question preview');
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
      await api.patch(`/api/companyoa/${testId}/approve`, {
        action,
        note: rejectNote,
      });

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
      toast.error(err.response?.data?.error || 'Action failed');
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
                background: 'rgba(245,166,35,0.18)',
                color: AMBER,
                border: '1px solid rgba(245,166,35,0.35)',
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
              background: 'rgba(124,92,252,0.12)',
              border: '1px solid rgba(124,92,252,0.25)',
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
                      border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.06)'}`,
                      background: isSelected ? `${color}12` : 'rgba(255,255,255,0.02)',
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
                          color: '#e2e8f0',
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
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
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
                        color: '#f0f6ff',
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
                        <strong style={{ color: '#e2e8f0' }}>Description:</strong> {selected.description}
                      </p>
                    )}

                    {selected.instructions && (
                      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                        <strong style={{ color: '#e2e8f0' }}>Instructions:</strong> {selected.instructions}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setSelected(null)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
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
                              background: '#071525',
                              border: '1px solid rgba(255,255,255,0.05)',
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
                                  background: 'rgba(124,92,252,0.12)',
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
                                color: '#e2e8f0',
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
                                        : 'rgba(255,255,255,0.04)',
                                    color: oi === q.correct_index ? GREEN : '#475569',
                                    border: `1px solid ${
                                      oi === q.correct_index ? GREEN : 'rgba(255,255,255,0.08)'
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
                    borderTop: '1px solid rgba(255,255,255,0.06)',
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
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        color: '#e2e8f0',
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
                        background: 'rgba(240,75,75,0.1)',
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
                        color: '#040c18',
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
                        background: 'rgba(124,92,252,0.12)',
                        border: '1px solid rgba(124,92,252,0.25)',
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
      .then(r => setStats(r.data))
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
                <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
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
                  <p style={{ margin: 0, fontWeight: 700, color: '#e2e8f0', fontSize: 13 }}>
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
                          ? 'rgba(16,201,138,0.12)'
                          : 'rgba(245,166,35,0.12)',
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
    color: '#f0f6ff',
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
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'left',
  },
  td: {
    padding: '11px 12px',
    fontSize: 13,
    color: '#94a3b8',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
};

const DEMO_STATS = {
  totalStudents: 450,
  placed: 312,
  placementRate: 69,
  companies: 38,
  activeDrives: 5,
  byBranch: [
    { branch: 'CSE', placed: 95, unplaced: 25 },
    { branch: 'IT', placed: 72, unplaced: 18 },
    { branch: 'ECE', placed: 58, unplaced: 32 },
    { branch: 'EEE', placed: 42, unplaced: 28 },
    { branch: 'MECH', placed: 28, unplaced: 40 },
    { branch: 'CIVIL', placed: 17, unplaced: 35 },
  ],
  byStatus: [
    { name: 'Placed', value: 312 },
    { name: 'Unplaced', value: 138 },
    { name: 'Opted Out', value: 22 },
    { name: 'Dream Pool', value: 48 },
  ],
  recentDrives: [
    { company: 'TCS', date: 'Dec 15, 2024', offers: 45, package: '7.0', status: 'Completed' },
    { company: 'Infosys', date: 'Dec 18, 2024', offers: 38, package: '5.0', status: 'Completed' },
    { company: 'Wipro', date: 'Dec 28, 2024', offers: 0, package: '8.0', status: 'Upcoming' },
    { company: 'Amazon', date: 'Jan 5, 2025', offers: 0, package: '24.0', status: 'Upcoming' },
  ],
};