// src/pages/student/CompanyOATests.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import {
  Clock, Building2, BookOpen, Award, Flag,
  CheckCircle, XCircle, Loader2, AlertCircle,
  ArrowLeft, ArrowRight, Send, RefreshCw,
  Maximize, Shield, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_COLOR = { aptitude: '#00c8f0', technical: '#7c5cfc', behavioural: '#f5a623' };
const GRADE_COLOR = {
  'A+': '#10c98a', 'A': '#10c98a', 'B+': '#00c8f0', 'B': '#00c8f0',
  'C': '#f5a623', 'D': '#f04b4b', 'F': '#f04b4b',
};

function fmtTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

// ── Fullscreen helpers ──────────────────────────────────────────
function enterFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else if (el.msRequestFullscreen) el.msRequestFullscreen();
}

function exitFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else if (document.webkitFullscreenElement) document.webkitExitFullscreen?.();
}

export default function CompanyOATests() {
  const { isDark } = useTheme();
  const [screen, setScreen]       = useState('list');
  const [tests, setTests]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [test, setTest]           = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers]     = useState({});
  const [current, setCurrent]     = useState(0);
  const [timeLeft, setTimeLeft]   = useState(0);
  const [flagged, setFlagged]     = useState(new Set());
  const [warnings, setWarnings]   = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]       = useState(null);
  const [loadingTest, setLoadingTest] = useState(false);
  const timerRef  = useRef(null);
  const startRef  = useRef(null);

  const bg   = isDark ? '#040c18' : '#f0f4f8';
  const card = isDark ? '#0b1a2e' : '#ffffff';
  const bord = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const txt  = isDark ? '#e2e8f0' : '#0f172a';
  const txt2 = isDark ? '#94a3b8' : '#64748b';

  // ── Load available tests ────────────────────────────────────────
  const loadTests = async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/companyoa/available');
      setTests(r.data?.tests || []);
    } catch {
      toast.error('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTests(); }, []);

  // ── Start test (with fullscreen) ────────────────────────────────
  const startTest = async (testItem) => {
    // If already attempted, block retake
    if (testItem.attempt_count > 0) {
      toast.error('You have already attempted this test. Only one attempt is allowed.');
      return;
    }

    setLoadingTest(testItem.id);
    try {
      const r = await api.get(`/api/companyoa/${testItem.id}/take`);
      setTest(r.data.test);
      setQuestions(r.data.questions || []);
      setAnswers({});
      setFlagged(new Set());
      setCurrent(0);
      setTimeLeft((r.data.test.duration || 60) * 60);
      setWarnings(0);
      setResult(null);
      startRef.current = Date.now();
      setScreen('test');

      // FIX #7: Enter fullscreen for realistic OA environment
      enterFullscreen();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to load test');
    } finally {
      setLoadingTest(null);
    }
  };

  // ── Timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'test') {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen]);

  // ── Tab-switch proctoring ───────────────────────────────────────
  useEffect(() => {
    if (screen !== 'test') return;
    const onVisChange = () => {
      if (document.hidden) {
        setWarnings(w => {
          const nw = w + 1;
          if (nw >= 3) {
            toast.error('Auto-submitted: 3 tab switches detected!');
            handleSubmit(true);
          } else {
            toast.error(`Warning ${nw}/3: Do not switch tabs during the test!`);
          }
          return nw;
        });
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, [screen]);

  // ── Fullscreen exit detection ───────────────────────────────────
  useEffect(() => {
    if (screen !== 'test') return;
    const onFsChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        setWarnings(w => {
          const nw = w + 1;
          if (nw >= 3) {
            toast.error('Auto-submitted: Exited fullscreen too many times!');
            handleSubmit(true);
          } else {
            toast.error(`Warning ${nw}/3: Please stay in fullscreen mode!`);
            // Try to re-enter fullscreen
            setTimeout(() => enterFullscreen(), 500);
          }
          return nw;
        });
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, [screen]);

  // ── Right-click & copy prevention ──────────────────────────────
  useEffect(() => {
    if (screen !== 'test') return;
    const preventContext = (e) => { e.preventDefault(); };
    const preventCopy    = (e) => { e.preventDefault(); toast.error('Copying is disabled during the test'); };
    const preventKeys    = (e) => {
      // Block Ctrl+C, Ctrl+V, Ctrl+U, F12, Ctrl+Shift+I
      if (
        (e.ctrlKey && ['c', 'v', 'u'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i')
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', preventContext);
    document.addEventListener('copy', preventCopy);
    document.addEventListener('keydown', preventKeys);
    return () => {
      document.removeEventListener('contextmenu', preventContext);
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('keydown', preventKeys);
    };
  }, [screen]);

  // ── Submit (with fullscreen exit) ──────────────────────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting) return;
    clearInterval(timerRef.current);
    setSubmitting(true);
    const timeTaken = Math.round((Date.now() - startRef.current) / 1000);
    try {
      const r = await api.post(`/api/companyoa/${test.id}/attempt`, {
        answers, timeTaken, autoSubmitted: auto,
      });
      setResult({ ...r.data, testTitle: test.title, company: test.companies?.name });
      setScreen('result');

      // FIX #7: Exit fullscreen on submit
      exitFullscreen();

      toast.success(r.data.pct >= 60 ? '🎉 Great score!' : 'Test submitted!');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Submission failed');
      // If duplicate attempt error, exit fullscreen and go back
      if (e.response?.status === 400) {
        exitFullscreen();
        setScreen('list');
        loadTests();
      }
    } finally {
      setSubmitting(false);
    }
  }, [answers, test, submitting]);

  const answerQ    = (qId, val) => setAnswers(p => ({ ...p, [qId]: val }));
  const toggleFlag = (qId) => setFlagged(p => {
    const n = new Set(p);
    n.has(qId) ? n.delete(qId) : n.add(qId);
    return n;
  });
  const answered = Object.keys(answers).filter(
    k => answers[k] !== '' && answers[k] !== null && answers[k] !== undefined
  ).length;

  // ════════════════════════════════════════════════════════════════
  // SCREEN: LIST
  // ════════════════════════════════════════════════════════════════
  if (screen === 'list') return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 22,
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 24, fontWeight: 800,
            color: txt, fontFamily: "'Sora',sans-serif",
          }}>
            Company OA Tests
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: txt2 }}>
            Official assessments from recruiting companies — approved by your placement officer.
          </p>
        </div>
        <button onClick={loadTests} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
          border: `1px solid ${bord}`, borderRadius: 8,
          fontSize: 12, fontWeight: 600, color: txt2, cursor: 'pointer',
        }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Proctoring info banner */}
      <div style={{
        padding: '10px 14px', marginBottom: 18,
        background: 'rgba(124,92,252,0.07)',
        border: '1px solid rgba(124,92,252,0.2)',
        borderRadius: 10, display: 'flex', gap: 10,
        alignItems: 'flex-start',
      }}>
        <Shield size={15} color="#7c5cfc" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12, color: txt2, lineHeight: 1.6 }}>
          <strong style={{ color: '#7c5cfc' }}>Proctoring Enabled:</strong> Tests run in
          fullscreen mode. Tab switching, copy-paste, and right-click are disabled.
          3 violations will auto-submit your test. <strong>Only 1 attempt is allowed per test.</strong>
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Loader2 size={28} color="#7c5cfc" style={{
            animation: 'spin 1s linear infinite', display: 'inline-block',
          }} />
          <p style={{ margin: '12px 0 0', color: txt2 }}>Loading company tests...</p>
        </div>
      ) : tests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Building2 size={44} color={isDark ? '#1e3a5f' : '#d1d5db'} style={{ marginBottom: 14 }} />
          <h3 style={{ margin: 0, color: txt2, fontWeight: 600 }}>No tests available yet</h3>
          <p style={{ color: isDark ? '#334155' : '#94a3b8', marginTop: 6, fontSize: 14 }}>
            Companies haven't submitted any OA tests for your branch yet. Check back soon!
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))',
          gap: 16,
        }}>
          {tests.map(t => {
            const typeCol = TYPE_COLOR[t.test_type] || '#94a3b8';
            const attempted = t.attempt_count > 0;
            return (
              <div key={t.id} style={{
                background: card, border: `1px solid ${bord}`,
                borderRadius: 14, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                opacity: attempted ? 0.85 : 1,
              }}>
                {/* Colour bar */}
                <div style={{
                  height: 4,
                  background: `linear-gradient(90deg,${typeCol},${typeCol}88)`,
                }} />

                <div style={{ padding: '16px 18px', flex: 1 }}>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between', marginBottom: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 9,
                        background: `${typeCol}18`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, fontWeight: 800, color: typeCol, flexShrink: 0,
                      }}>
                        {t.companies?.name?.[0] || '?'}
                      </div>
                      <div>
                        <p style={{
                          margin: 0, fontSize: 11, fontWeight: 700,
                          color: typeCol, textTransform: 'capitalize',
                        }}>
                          {t.test_type}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: txt2 }}>
                          {t.companies?.name}
                        </p>
                      </div>
                    </div>
                    {attempted && (
                      <div style={{ textAlign: 'right' }}>
                        <p style={{
                          margin: 0, fontSize: 18, fontWeight: 800,
                          color: GRADE_COLOR[t.best_grade] || txt,
                        }}>
                          {t.best_pct}%
                        </p>
                        <p style={{ margin: 0, fontSize: 10, color: txt2 }}>Your score</p>
                      </div>
                    )}
                  </div>

                  <h3 style={{
                    margin: '0 0 8px', fontSize: 15, fontWeight: 700,
                    color: txt, lineHeight: 1.3,
                  }}>
                    {t.title}
                  </h3>

                  {t.description && (
                    <p style={{
                      margin: '0 0 10px', fontSize: 12,
                      color: txt2, lineHeight: 1.5,
                    }}>
                      {t.description.slice(0, 100)}{t.description.length > 100 ? '…' : ''}
                    </p>
                  )}

                  <div style={{
                    display: 'flex', gap: 14,
                    flexWrap: 'wrap', marginBottom: 12,
                  }}>
                    <span style={{
                      display: 'flex', alignItems: 'center',
                      gap: 4, fontSize: 12, color: txt2,
                    }}>
                      <Clock size={12} />{t.duration} min
                    </span>
                    <span style={{
                      display: 'flex', alignItems: 'center',
                      gap: 4, fontSize: 12, color: txt2,
                    }}>
                      <BookOpen size={12} />{t.question_count || '?'} Qs
                    </span>
                    <span style={{
                      display: 'flex', alignItems: 'center',
                      gap: 4, fontSize: 12, color: txt2,
                    }}>
                      <Award size={12} />CGPA {t.min_cgpa || 0}+
                    </span>
                    <span style={{
                      display: 'flex', alignItems: 'center',
                      gap: 4, fontSize: 12, color: txt2,
                    }}>
                      <Maximize size={12} />Fullscreen
                    </span>
                  </div>
                </div>

                <div style={{ padding: '12px 18px', borderTop: `1px solid ${bord}` }}>
                  {attempted ? (
                    // Already attempted — show completed state
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 8,
                      padding: '10px', borderRadius: 9,
                      background: isDark ? 'rgba(16,201,138,0.08)' : '#f0fdf4',
                      border: '1px solid rgba(16,201,138,0.25)',
                    }}>
                      <CheckCircle size={15} color="#10c98a" />
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        color: '#10c98a',
                      }}>
                        Completed · Grade: {t.best_grade}
                      </span>
                      <Lock size={13} color="#64748b" style={{ marginLeft: 'auto' }} />
                    </div>
                  ) : (
                    <button
                      onClick={() => startTest(t)}
                      disabled={loadingTest === t.id}
                      style={{
                        width: '100%', padding: '10px', borderRadius: 9,
                        border: 'none', background: typeCol,
                        boxShadow: `0 4px 14px ${typeCol}44`,
                        color: '#040c18', fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', fontFamily: "'Sora',sans-serif",
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 8,
                      }}
                    >
                      {loadingTest === t.id ? (
                        <>
                          <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                          Loading...
                        </>
                      ) : (
                        <>
                          <BookOpen size={15} />
                          Start Test →
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // SCREEN: TEST
  // ════════════════════════════════════════════════════════════════
  if (screen === 'test') {
    const q = questions[current];
    const timerPct = (timeLeft / ((test?.duration || 60) * 60)) * 100;
    const timerCol = timerPct > 40 ? '#10c98a' : timerPct > 15 ? '#f5a623' : '#f04b4b';
    const sectionGroups = [...new Set(questions.map(q => q.section))];

    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        background: bg, overflow: 'hidden',
        userSelect: 'none', WebkitUserSelect: 'none',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '10px 20px', background: card,
          borderBottom: `1px solid ${bord}`, flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: txt }}>
              {test?.title}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: txt2 }}>
              {test?.companies?.name} · {questions.length} questions
            </p>
          </div>

          {/* Fullscreen indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 7,
            background: 'rgba(124,92,252,0.1)',
            border: '1px solid rgba(124,92,252,0.25)',
          }}>
            <Maximize size={12} color="#7c5cfc" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#7c5cfc' }}>PROCTORED</span>
          </div>

          {/* Timer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', background: `${timerCol}12`,
            border: `1px solid ${timerCol}33`, borderRadius: 9,
          }}>
            <Clock size={14} color={timerCol} />
            <span style={{
              fontSize: 15, fontWeight: 800,
              color: timerCol, fontFamily: 'monospace',
            }}>
              {fmtTime(timeLeft)}
            </span>
          </div>

          {/* Progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: txt2 }}>
              {answered}/{questions.length} answered
            </span>
          </div>

          <button
            onClick={() => {
              if (window.confirm(
                `Submit test now? ${questions.length - answered} questions unanswered.`
              )) handleSubmit(false);
            }}
            disabled={submitting}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: '#10c98a',
              border: 'none', borderRadius: 9, color: '#040c18',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {submitting
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={14} />}
            Submit
          </button>
        </div>

        {/* Warnings bar */}
        {warnings > 0 && (
          <div style={{
            padding: '6px 20px', background: 'rgba(240,75,75,0.1)',
            borderBottom: '1px solid rgba(240,75,75,0.25)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <AlertCircle size={13} color="#f04b4b" />
            <span style={{ fontSize: 12, color: '#f04b4b', fontWeight: 600 }}>
              ⚠ Violation warning {warnings}/3 — {3 - warnings} more will auto-submit the test
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Question palette sidebar */}
          <div style={{
            width: 220, borderRight: `1px solid ${bord}`,
            padding: '14px 12px', overflowY: 'auto',
            flexShrink: 0, background: isDark ? '#071525' : card,
          }}>
            <p style={{
              margin: '0 0 10px', fontSize: 11, fontWeight: 700,
              color: txt2, textTransform: 'uppercase',
              letterSpacing: '0.07em',
            }}>
              Question Palette
            </p>

            {sectionGroups.map(sec => {
              const secQs = questions.filter(q => q.section === sec);
              return (
                <div key={sec} style={{ marginBottom: 14 }}>
                  <p style={{
                    margin: '0 0 6px', fontSize: 10,
                    fontWeight: 700, color: '#7c5cfc',
                  }}>
                    {sec}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {secQs.map(sq => {
                      const gi = questions.indexOf(sq);
                      const isAns = answers[sq.id] !== undefined
                        && answers[sq.id] !== null
                        && answers[sq.id] !== '';
                      const isFl  = flagged.has(sq.id);
                      const isCur = gi === current;
                      return (
                        <button key={sq.id} onClick={() => setCurrent(gi)} style={{
                          width: 32, height: 32, borderRadius: 7,
                          border: `2px solid ${
                            isCur ? '#7c5cfc'
                              : isFl ? '#f5a623'
                              : isAns ? '#10c98a' : bord
                          }`,
                          background: isCur ? '#7c5cfc'
                            : isFl ? 'rgba(245,166,35,0.15)'
                            : isAns ? 'rgba(16,201,138,0.12)' : 'transparent',
                          color: isCur ? '#fff'
                            : isFl ? '#f5a623'
                            : isAns ? '#10c98a' : txt2,
                          fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        }}>
                          {gi + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div style={{
              marginTop: 12, padding: '8px 0',
              borderTop: `1px solid ${bord}`,
            }}>
              {[
                { col: '#10c98a', label: 'Answered' },
                { col: '#f5a623', label: 'Flagged' },
                { col: bord, label: 'Unanswered' },
              ].map(l => (
                <div key={l.label} style={{
                  display: 'flex', alignItems: 'center',
                  gap: 6, marginBottom: 5,
                }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: 3,
                    background: l.col, border: `1px solid ${l.col}`,
                  }} />
                  <span style={{ fontSize: 10, color: txt2 }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Main question area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
            {q && (
              <div>
                {/* Section + Q number */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  gap: 8, marginBottom: 14,
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#7c5cfc',
                    background: 'rgba(124,92,252,0.1)',
                    padding: '3px 10px', borderRadius: 999,
                  }}>
                    {q.section}
                  </span>
                  <span style={{ fontSize: 12, color: txt2 }}>
                    Question {current + 1} of {questions.length}
                  </span>
                  <span style={{
                    fontSize: 12, color: '#10c98a', marginLeft: 'auto',
                  }}>
                    {q.marks} mark{q.marks > 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => toggleFlag(q.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', borderRadius: 7,
                      border: `1px solid ${flagged.has(q.id) ? '#f5a623' : bord}`,
                      background: flagged.has(q.id) ? 'rgba(245,166,35,0.1)' : 'transparent',
                      color: flagged.has(q.id) ? '#f5a623' : txt2,
                      fontSize: 11, cursor: 'pointer',
                    }}
                  >
                    <Flag size={11} />
                    {flagged.has(q.id) ? 'Flagged' : 'Flag'}
                  </button>
                </div>

                {/* Question text */}
                <div style={{
                  padding: '20px 22px', background: card,
                  border: `1px solid ${bord}`, borderRadius: 12, marginBottom: 20,
                }}>
                  <p style={{
                    margin: 0, fontSize: 15, color: txt,
                    lineHeight: 1.75, fontWeight: 500,
                  }}>
                    {q.question_text}
                  </p>
                </div>

                {/* MCQ options */}
                {q.question_type === 'mcq' && q.options && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {q.options.map((opt, oi) => {
                      const sel = answers[q.id] === oi;
                      return (
                        <button key={oi} onClick={() => answerQ(q.id, oi)} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '14px 18px', borderRadius: 10,
                          border: `2px solid ${sel ? '#7c5cfc' : bord}`,
                          background: sel
                            ? (isDark ? 'rgba(124,92,252,0.12)' : '#f5f3ff')
                            : 'transparent',
                          cursor: 'pointer', textAlign: 'left',
                          width: '100%', transition: 'all 0.15s',
                        }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                            border: `2px solid ${sel ? '#7c5cfc' : '#64748b'}`,
                            background: sel ? '#7c5cfc' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {sel && <CheckCircle size={13} color="#fff" />}
                          </div>
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: sel ? '#7c5cfc' : txt2, flexShrink: 0,
                          }}>
                            {String.fromCharCode(65 + oi)}.
                          </span>
                          <span style={{
                            fontSize: 14, color: sel ? txt : txt2,
                            fontWeight: sel ? 600 : 400,
                          }}>
                            {opt}
                          </span>
                        </button>
                      );
                    })}
                    {answers[q.id] !== undefined && (
                      <button onClick={() => answerQ(q.id, undefined)} style={{
                        alignSelf: 'flex-start', padding: '4px 12px',
                        background: 'none', border: `1px solid ${bord}`,
                        borderRadius: 6, color: txt2, fontSize: 11, cursor: 'pointer',
                      }}>
                        Clear selection
                      </button>
                    )}
                  </div>
                )}

                {/* Text answer */}
                {q.question_type === 'text' && (
                  <div>
                    <textarea
                      value={answers[q.id] || ''}
                      onChange={e => answerQ(q.id, e.target.value)}
                      placeholder={q.placeholder || 'Type your answer here...'}
                      rows={6}
                      style={{
                        width: '100%', boxSizing: 'border-box', resize: 'vertical',
                        background: card, border: `1px solid ${bord}`, borderRadius: 10,
                        padding: '14px 16px', fontSize: 14, color: txt, outline: 'none',
                        fontFamily: "'Sora',sans-serif", lineHeight: 1.7,
                      }}
                    />
                    <p style={{ margin: '5px 0 0', fontSize: 11, color: txt2 }}>
                      {(answers[q.id] || '').trim().split(/\s+/).filter(Boolean).length} / {q.word_limit || 200} words
                    </p>
                  </div>
                )}

                {/* Navigation */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', marginTop: 24,
                }}>
                  <button
                    onClick={() => setCurrent(c => Math.max(0, c - 1))}
                    disabled={current === 0}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '10px 20px', background: 'transparent',
                      border: `1px solid ${bord}`, borderRadius: 9,
                      color: txt2, fontSize: 13, fontWeight: 600,
                      cursor: current === 0 ? 'not-allowed' : 'pointer',
                      opacity: current === 0 ? 0.4 : 1,
                    }}
                  >
                    <ArrowLeft size={14} /> Previous
                  </button>

                  {current < questions.length - 1 ? (
                    <button onClick={() => setCurrent(c => c + 1)} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '10px 20px', background: '#7c5cfc',
                      border: 'none', borderRadius: 9, color: '#fff',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}>
                      Next <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubmit(false)}
                      disabled={submitting}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '10px 20px', background: '#10c98a',
                        border: 'none', borderRadius: 9, color: '#040c18',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {submitting
                        ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Send size={14} />}
                      Submit Test
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // SCREEN: RESULT
  // ════════════════════════════════════════════════════════════════
  if (screen === 'result' && result) {
    const gradeCol = GRADE_COLOR[result.grade] || '#94a3b8';
    const secs = Object.entries(result.breakdown || {});
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        {/* Score card */}
        <div style={{
          background: card, border: `1px solid ${bord}`, borderRadius: 16,
          padding: '28px 32px', marginBottom: 20, textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, color: txt2 }}>
            {result.testTitle} · {result.company}
          </p>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 20, margin: '16px 0',
          }}>
            <div>
              <p style={{
                margin: 0, fontSize: 52, fontWeight: 900,
                color: gradeCol, fontFamily: "'Sora',sans-serif", lineHeight: 1,
              }}>
                {result.pct}%
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: txt2 }}>
                Score: {result.score}/{result.maxScore}
              </p>
            </div>
            <div style={{
              width: 70, height: 70, borderRadius: '50%',
              background: `${gradeCol}18`, border: `3px solid ${gradeCol}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: gradeCol }}>
                {result.grade}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex', gap: 0,
            justifyContent: 'center', marginTop: 12,
          }}>
            {[
              { label: 'Correct', val: result.correct, col: '#10c98a' },
              { label: 'Wrong', val: result.wrong, col: '#f04b4b' },
              { label: 'Skipped', val: result.skipped, col: '#94a3b8' },
            ].map((s, i) => (
              <div key={s.label} style={{
                flex: 1, padding: '12px', textAlign: 'center',
                borderRight: i < 2 ? `1px solid ${bord}` : 'none',
              }}>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: s.col }}>
                  {s.val}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: txt2 }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* One attempt notice */}
          <div style={{
            marginTop: 16, padding: '8px 14px',
            background: 'rgba(245,166,35,0.08)',
            border: '1px solid rgba(245,166,35,0.2)',
            borderRadius: 8, display: 'inline-flex',
            alignItems: 'center', gap: 6,
          }}>
            <Lock size={12} color="#f5a623" />
            <span style={{ fontSize: 11, color: '#f5a623', fontWeight: 600 }}>
              This was your only attempt — result is final
            </span>
          </div>
        </div>

        {/* Section breakdown */}
        {secs.length > 0 && (
          <div style={{
            background: card, border: `1px solid ${bord}`,
            borderRadius: 14, padding: '18px 20px', marginBottom: 20,
          }}>
            <p style={{
              margin: '0 0 14px', fontSize: 13, fontWeight: 700,
              color: txt2, textTransform: 'uppercase',
              letterSpacing: '0.07em',
            }}>
              Section Breakdown
            </p>
            {secs.map(([sec, data]) => {
              const pct = data.max > 0
                ? Math.round((data.earned / data.max) * 100) : 0;
              return (
                <div key={sec} style={{ marginBottom: 12 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    marginBottom: 4,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: txt }}>
                      {sec}
                    </span>
                    <span style={{ fontSize: 12, color: txt2 }}>
                      {data.earned}/{data.max} ({pct}%)
                    </span>
                  </div>
                  <div style={{
                    height: 8,
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
                    borderRadius: 999, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: pct >= 60 ? '#10c98a' : pct >= 40 ? '#f5a623' : '#f04b4b',
                      borderRadius: 999, transition: 'width 1s',
                    }} />
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 10, color: txt2 }}>
                    ✓ {data.correct} correct · ✗ {data.wrong} wrong · — {data.skipped} skipped
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Question review */}
        {result.reviewed?.length > 0 && (
          <div style={{
            background: card, border: `1px solid ${bord}`,
            borderRadius: 14, padding: '18px 20px', marginBottom: 20,
          }}>
            <p style={{
              margin: '0 0 14px', fontSize: 13, fontWeight: 700,
              color: txt2, textTransform: 'uppercase',
              letterSpacing: '0.07em',
            }}>
              Question Review
            </p>
            {result.reviewed.map((r, i) => {
              const qData = questions[i];
              return (
                <div key={r.id} style={{
                  padding: '12px 14px', borderRadius: 9, marginBottom: 10,
                  background: r.is_correct === true
                    ? (isDark ? 'rgba(16,201,138,0.06)' : '#f0fdf4')
                    : r.is_correct === false
                    ? (isDark ? 'rgba(240,75,75,0.06)' : '#fff5f5')
                    : (isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb'),
                  border: `1px solid ${
                    r.is_correct === true ? '#10c98a33'
                      : r.is_correct === false ? '#f04b4b33' : bord
                  }`,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    gap: 8, marginBottom: 6,
                  }}>
                    {r.is_correct === true && <CheckCircle size={14} color="#10c98a" />}
                    {r.is_correct === false && <XCircle size={14} color="#f04b4b" />}
                    {r.is_correct === null && (
                      <span style={{ fontSize: 12, color: txt2 }}>—</span>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 700, color: txt }}>
                      Q{i + 1}
                    </span>
                    <span style={{ fontSize: 10, color: txt2 }}>{r.section}</span>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: 13, color: txt }}>
                    {qData?.question_text}
                  </p>
                  {r.type === 'mcq' && qData?.options && (
                    <>
                      <p style={{
                        margin: '0 0 3px', fontSize: 11, color: '#10c98a',
                      }}>
                        ✓ Correct: {qData.options[r.correct_index]}
                      </p>
                      {r.student_answer !== null
                        && r.student_answer !== r.correct_index && (
                        <p style={{
                          margin: '0 0 3px', fontSize: 11, color: '#f04b4b',
                        }}>
                          ✗ Your answer: {qData.options[r.student_answer]}
                        </p>
                      )}
                      {r.student_answer === null && (
                        <p style={{
                          margin: '0 0 3px', fontSize: 11, color: '#94a3b8',
                        }}>
                          Skipped
                        </p>
                      )}
                      {r.explanation && (
                        <p style={{
                          margin: '6px 0 0', fontSize: 11,
                          color: '#7c5cfc', fontStyle: 'italic',
                        }}>
                          💡 {r.explanation}
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => { setScreen('list'); loadTests(); }}
            style={{
              padding: '11px 24px', background: 'transparent',
              border: `1px solid ${bord}`, borderRadius: 9,
              color: txt2, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: 8,
            }}
          >
            <ArrowLeft size={14} /> Back to Tests
          </button>
        </div>
      </div>
    );
  }

  return null;
}