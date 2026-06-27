// src/pages/student/AptitudeTest.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { aptitudeAPI } from '../../api/axios';
import GlowCard from '../../components/GlowCard';
import { Flag, ChevronLeft, ChevronRight, Clock, AlertTriangle, CheckCircle, Loader2, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';

const CYAN = '#00c8f0';

export default function AptitudeTest() {
  const navigate = useNavigate();

  // Screen: 'list' | 'test' | 'result'
  const [screen,   setScreen]   = useState('list');
  const [tests,    setTests]    = useState([]);
  const [test,     setTest]     = useState(null);
  const [questions,setQuestions]= useState([]);
  const [answers,  setAnswers]  = useState({});  // { questionId: optionIndex }
  const [flagged,  setFlagged]  = useState({});  // { questionId: bool }
  const [current,  setCurrent]  = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const timerRef = useRef(null);

  // Load test list
  useEffect(() => {
    aptitudeAPI.getTests()
      .then(r => setTests(r.data?.tests || []))
      .catch(() => setTests(DEMO_TESTS));
  }, []);

  // Countdown timer
  useEffect(() => {
    if (screen !== 'test' || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); submitTest(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen, timeLeft]);

  const startTest = async (testId) => {
    setLoading(true);
    try {
      const r = await aptitudeAPI.getTest(testId).catch(() => ({ data: { test: DEMO_TESTS[0], questions: DEMO_QUESTIONS } }));
      setTest(r.data.test);
      setQuestions(r.data.questions);
      setAnswers({});
      setFlagged({});
      setCurrent(0);
      setTimeLeft((r.data.test.duration_minutes || 15) * 60);
      setScreen('test');
    } finally {
      setLoading(false);
    }
  };

  const submitTest = useCallback(async (autoSubmit = false) => {
    clearInterval(timerRef.current);
    if (!autoSubmit) {
      const unanswered = questions.length - Object.keys(answers).length;
      if (unanswered > 0 && !window.confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
    }
    setLoading(true);
    try {
      const r = await aptitudeAPI.submit({ testId: test.id, answers, startedAt: new Date().toISOString() })
        .catch(() => ({ data: mockResult(questions, answers) }));
      setResult(r.data);
      setScreen('result');
    } finally {
      setLoading(false);
    }
  }, [test, questions, answers]);

  const toggleFlag = (qId) => setFlagged(f => ({ ...f, [qId]: !f[qId] }));
  const setAnswer  = (qId, idx) => setAnswers(a => ({ ...a, [qId]: idx }));

  const q          = questions[current];
  const answered   = Object.keys(answers).length;
  const flaggedCnt = Object.values(flagged).filter(Boolean).length;

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const timerColor = timeLeft < 60 ? '#f04b4b' : timeLeft < 180 ? '#f5a623' : CYAN;

  /* ═══ TEST LIST ═══ */
  if (screen === 'list') return (
    <div style={pg.page}>
      <div style={pg.header}>
        <h1 style={pg.h1}>Aptitude Tests</h1>
        <p style={pg.sub}>Practice with timed MCQ tests — +4 correct, −1 wrong</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
        {(tests.length ? tests : DEMO_TESTS).map(t => (
          <GlowCard key={t.id} accent={CYAN} hoverable>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{t.title}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>{t.total_questions} questions</p>
              </div>
              <span style={pg.timerBadge}><Clock size={12} />{t.duration_minutes} min</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {['Quantitative', 'Logical', 'Verbal'].map(tag => (
                <span key={tag} style={pg.tag}>{tag}</span>
              ))}
            </div>
            <button style={pg.startBtn} onClick={() => startTest(t.id)} disabled={loading}>
              {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : 'Start Test →'}
            </button>
          </GlowCard>
        ))}
      </div>
    </div>
  );

  /* ═══ RESULT ═══ */
  if (screen === 'result') return (
    <div style={pg.page}>
      <div style={pg.header}>
        <h1 style={pg.h1}>Test Result</h1>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <GlowCard accent={result?.percentage >= 70 ? '#10c98a' : result?.percentage >= 40 ? '#f5a623' : '#f04b4b'}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={pg.scoreCircle(result?.percentage)}>
              <span style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>{result?.percentage ?? 0}%</span>
              <span style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Score</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 24 }}>
              {[
                { label: 'Correct',     val: result?.correct,     color: '#10c98a' },
                { label: 'Wrong',       val: result?.wrong,       color: '#f04b4b' },
                { label: 'Unattempted', val: result?.skipped,     color: '#64748b' },
              ].map(item => (
                <div key={item.label} style={pg.resultItem(item.color)}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.val ?? 0}</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{item.label}</span>
                </div>
              ))}
            </div>
            <p style={{ margin: '16px 0 0', fontSize: 14, color: '#94a3b8' }}>
              Score: <strong style={{ color: '#f0f6ff' }}>{result?.score ?? 0}</strong> / {result?.totalPossible ?? 0} marks
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button style={{ ...pg.startBtn, flex: 1 }} onClick={() => setScreen('list')}>Try Another</button>
            <button style={{ ...pg.startBtn, flex: 1, background: 'rgba(0,200,240,0.1)', color: CYAN }}
              onClick={() => navigate('/student/aptitude/analysis')}>
              <BarChart2 size={15} /> View Analysis
            </button>
          </div>
        </GlowCard>
      </div>
    </div>
  );

  /* ═══ TEST ═══ */
  if (!q) return null;
  return (
    <div style={pg.page}>
      {/* Top bar */}
      <div style={pg.topBar}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{test?.title}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#475569' }}>Q {current + 1} of {questions.length}</p>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={pg.stat}><CheckCircle size={13} color="#10c98a" /> {answered} answered</span>
          <span style={pg.stat}><Flag size={13} color="#f5a623" /> {flaggedCnt} flagged</span>
          <div style={pg.timer(timerColor)}>
            <Clock size={14} color={timerColor} />
            <span style={{ fontSize: 16, fontWeight: 800, color: timerColor, fontFamily: 'monospace' }}>{fmt(timeLeft)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Question panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <GlowCard accent={flagged[q.id] ? '#f5a623' : CYAN}>
            {/* Question header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={pg.qNum}>{current + 1}</div>
              <button style={pg.flagBtn(flagged[q.id])} onClick={() => toggleFlag(q.id)}>
                <Flag size={14} />
                {flagged[q.id] ? 'Unflag' : 'Flag'}
              </button>
            </div>

            {/* Question text */}
            <p style={{ fontSize: 16, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 24, fontWeight: 500 }}>
              {q.question_text}
            </p>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(q.options || []).map((opt, i) => {
                const selected = answers[q.id] === i;
                return (
                  <button key={i} style={pg.option(selected)} onClick={() => setAnswer(q.id, i)}>
                    <span style={pg.optLetter(selected)}>{String.fromCharCode(65 + i)}</span>
                    <span style={{ fontSize: 14, color: selected ? '#040c18' : '#cbd5e1', fontWeight: selected ? 600 : 400 }}>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Nav buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
              <button style={pg.navBtn} onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
                <ChevronLeft size={16} /> Previous
              </button>
              {current < questions.length - 1
                ? <button style={{ ...pg.navBtn, background: CYAN, color: '#040c18', border: 'none' }} onClick={() => setCurrent(c => c + 1)}>
                    Next <ChevronRight size={16} />
                  </button>
                : <button style={{ ...pg.navBtn, background: '#10c98a', color: '#040c18', border: 'none' }} onClick={() => submitTest()}>
                    {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : 'Submit Test'}
                  </button>
              }
            </div>
          </GlowCard>
        </div>

        {/* Question palette sidebar */}
        <div style={pg.palette}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Question Palette</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {questions.map((question, i) => {
              const isAnswered = answers[question.id] !== undefined;
              const isFlagged  = flagged[question.id];
              const isActive   = i === current;
              return (
                <button key={i} style={pg.palletBtn(isActive, isAnswered, isFlagged)}
                  onClick={() => setCurrent(i)}>
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { color: CYAN,       label: 'Answered' },
              { color: '#f5a623',  label: 'Flagged'  },
              { color: '#0b1a2e',  label: 'Not Visited' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color, border: '1px solid rgba(255,255,255,0.1)' }} />
                <span style={{ fontSize: 11, color: '#475569' }}>{l.label}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, padding: '10px', background: 'rgba(0,200,240,0.05)', borderRadius: 8, border: '1px solid rgba(0,200,240,0.1)' }}>
            <p style={{ margin: 0, fontSize: 10, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Marking Scheme</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#10c98a' }}>+4 Correct</p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#f04b4b' }}>−1 Wrong</p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>0 Skipped</p>
          </div>

          <button style={pg.submitSideBtn} onClick={() => submitTest()}>
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Submit Test'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Styles ──
const pg = {
  page:          { padding: 24, maxWidth: 1100, margin: '0 auto' },
  header:        { marginBottom: 24 },
  h1:            { margin: 0, fontSize: 24, fontWeight: 800, color: '#f0f6ff', fontFamily: "'Sora',sans-serif" },
  sub:           { margin: '6px 0 0', fontSize: 13, color: '#475569' },
  timerBadge:    { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(0,200,240,0.1)', border: '1px solid rgba(0,200,240,0.2)', borderRadius: 999, fontSize: 12, fontWeight: 700, color: '#00c8f0' },
  tag:           { padding: '2px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 11, color: '#64748b' },
  startBtn:      { width: '100%', padding: '11px', background: CYAN, color: '#040c18', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  topBar:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, background: '#0b1a2e', border: '1px solid rgba(0,200,240,0.12)', borderRadius: 12, padding: '14px 20px' },
  stat:          { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#64748b', fontWeight: 600 },
  timer:         (c) => ({ display: 'flex', alignItems: 'center', gap: 6, background: `${c}12`, border: `1px solid ${c}33`, borderRadius: 8, padding: '6px 12px' }),
  qNum:          { width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,200,240,0.1)', border: '2px solid rgba(0,200,240,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: CYAN },
  flagBtn:       (f) => ({ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: f ? 'rgba(245,166,35,0.15)' : 'transparent', border: `1px solid ${f ? '#f5a623' : 'rgba(255,255,255,0.08)'}`, borderRadius: 7, fontSize: 12, fontWeight: 600, color: f ? '#f5a623' : '#475569', cursor: 'pointer', fontFamily: "'Sora',sans-serif" }),
  option:        (sel) => ({ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: sel ? CYAN : 'rgba(255,255,255,0.02)', border: `1px solid ${sel ? CYAN : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', width: '100%', textAlign: 'left' }),
  optLetter:     (sel) => ({ width: 26, height: 26, borderRadius: '50%', background: sel ? 'rgba(4,12,24,0.3)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: sel ? '#040c18' : '#64748b', flexShrink: 0 }),
  navBtn:        { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: "'Sora',sans-serif" },
  palette:       { width: 200, flexShrink: 0, background: '#0b1a2e', border: '1px solid rgba(0,200,240,0.1)', borderRadius: 14, padding: 16, height: 'fit-content', position: 'sticky', top: 24 },
  palletBtn:     (active, ans, flag) => ({ width: 34, height: 34, borderRadius: 7, background: flag ? 'rgba(245,166,35,0.2)' : ans ? CYAN : '#0f2040', border: `1px solid ${flag ? '#f5a623' : ans ? CYAN : '#1e3a5f'}`, color: flag ? '#f5a623' : ans ? '#040c18' : '#475569', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Sora',sans-serif', outline: active ? `2px solid ${CYAN}` : 'none", outline: active ? `2px solid ${CYAN}` : 'none', outlineOffset: 2 }),
  submitSideBtn: { marginTop: 16, width: '100%', padding: '10px', background: '#10c98a', color: '#040c18', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  scoreCircle:   (pct) => ({ width: 120, height: 120, borderRadius: '50%', background: `conic-gradient(${pct >= 70 ? '#10c98a' : pct >= 40 ? '#f5a623' : '#f04b4b'} ${pct * 3.6}deg, #0b1a2e 0)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: `0 0 30px ${pct >= 70 ? '#10c98a' : pct >= 40 ? '#f5a623' : '#f04b4b'}44` }),
  resultItem:    (c) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 12, background: `${c}0a`, border: `1px solid ${c}22`, borderRadius: 10 }),
};

// ── Demo data ──
const DEMO_TESTS = [
  { id: 'demo1', title: 'TCS NQT Practice Set', total_questions: 15, duration_minutes: 15 },
  { id: 'demo2', title: 'Infosys Aptitude Mock', total_questions: 20, duration_minutes: 20 },
  { id: 'demo3', title: 'Wipro NLTH Prep', total_questions: 25, duration_minutes: 25 },
];

const DEMO_QUESTIONS = [
  { id: 'q1', question_text: 'A train 150m long passes a pole in 15 seconds. What is the speed of the train?', options: ['10 m/s', '15 m/s', '20 m/s', '25 m/s'], correct_answer: 0, topic: 'Speed & Distance', marks: 4 },
  { id: 'q2', question_text: 'If ROAD is coded as 12-15-1-4, then BRIDGE is coded as?', options: ['2-18-9-4-7-5', '2-17-9-4-6-5', '2-18-9-3-7-5', '3-18-9-4-7-5'], correct_answer: 0, topic: 'Coding-Decoding', marks: 4 },
  { id: 'q3', question_text: 'The simple interest on Rs 4000 at 10% per annum for 2 years is?', options: ['Rs 600', 'Rs 800', 'Rs 1000', 'Rs 1200'], correct_answer: 1, topic: 'Simple Interest', marks: 4 },
  { id: 'q4', question_text: 'In a bag, there are 6 red balls and 4 blue balls. What is the probability of picking a red ball?', options: ['3/5', '2/5', '1/2', '4/9'], correct_answer: 0, topic: 'Probability', marks: 4 },
  { id: 'q5', question_text: 'Choose the word most similar in meaning to BENEVOLENT:', options: ['Cruel', 'Hostile', 'Kind', 'Selfish'], correct_answer: 2, topic: 'Vocabulary', marks: 4 },
];

function mockResult(questions, answers) {
  let score = 0, correct = 0, wrong = 0;
  const total = questions.reduce((s, q) => s + (q.marks || 4), 0);
  for (const q of questions) {
    const ans = answers[q.id];
    if (ans === undefined) continue;
    if (ans === q.correct_answer) { score += q.marks || 4; correct++; }
    else { score -= 1; wrong++; }
  }
  const skipped = questions.length - correct - wrong;
  const percentage = Math.max(0, Math.round((Math.max(0, score) / total) * 100));
  return { score: Math.max(0, score), totalPossible: total, correct, wrong, skipped, percentage };
}
