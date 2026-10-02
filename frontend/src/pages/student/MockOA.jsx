// src/pages/student/MockOA.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  Clock, Search, Building2, ChevronLeft, ChevronRight,
  Send, AlertTriangle, CheckCircle, XCircle, BarChart2,
  Eye, EyeOff, Flag, RefreshCw, TrendingUp, Award,
  Code2, Brain, Cpu, Database, Globe, Layers,
  Monitor, Wifi, BookOpen, Star, Sparkles
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import toast from 'react-hot-toast';
import ProctorLayer, { computeIntegrity } from '../../components/ProctorLayer';

// ── Colors ────────────────────────────────────────────────────────────────
const C = {
  bg: 'var(--bg-base)', card: 'var(--bg-card)', cardB: 'var(--bg-card-raised)',
  cyan: '#4f46e5', green: '#16a34a', amber: '#d97706',
  red: '#dc2626', violet: '#4f46e5',
  gray: '#475569', light: 'var(--text-secondary)', white: 'var(--text-primary)',
};
const TYPE_COLOR = { aptitude: C.cyan, technical: C.violet, behavioural: C.amber };
const TYPE_ICON  = { aptitude: Brain, technical: Cpu, behavioural: BookOpen };

// ── Score calculator ───────────────────────────────────────────────────────
function calcScore(test, answers, questions) {
  let earned = 0, totalMCQ = 0, correct = 0, wrong = 0, skipped = 0;
  const breakdown = {};
  (questions || []).forEach(q => {
    const section = q.section;
    if (!breakdown[section]) breakdown[section] = { correct:0, wrong:0, total:0, marks:0, earned:0 };
    breakdown[section].total++;
    const correctIdx = q.correct_index !== undefined ? q.correct_index
                     : q.correct_answer !== undefined ? q.correct_answer
                     : q.ans;
    if (q.type === 'mcq') {
      totalMCQ++;
      const ans = answers[q.id];
      breakdown[section].marks += q.marks;
      if (ans === undefined || ans === null || ans === '') {
        skipped++;
      } else if (parseInt(ans) === correctIdx) {
        earned += q.marks; correct++;
        breakdown[section].correct++; breakdown[section].earned += q.marks;
      } else {
        const neg = Math.floor(q.marks / 4);
        earned = Math.max(0, earned - neg); wrong++;
        breakdown[section].wrong++;
      }
    } else if (q.type === 'text') {
      const resp = answers[q.id] || '';
      const wordCount = resp.trim().split(/\s+/).filter(Boolean).length;
      const pts = Math.round(q.marks * Math.min(wordCount / 100, 1) * 0.7);
      earned += pts; breakdown[section].earned += pts; breakdown[section].marks += q.marks;
    }
  });
  const totalMarks = test.total_marks || test.totalMarks || 100;
  const pct   = Math.min(100, Math.round((earned / totalMarks) * 100));
  const grade = pct>=90?'A+':pct>=80?'A':pct>=70?'B+':pct>=60?'B':pct>=50?'C':pct>=40?'D':'F';
  return { earned, total: totalMarks, pct, grade, correct, wrong, skipped, totalMCQ, breakdown, questions };
}

// ── Pill filter button ─────────────────────────────────────────────────────
const Pill = ({ label, active, color, onClick }) => (
  <button onClick={onClick} style={{ padding:'6px 16px', borderRadius:999, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif", background:active?`${color}18`:'var(--bg-card-high)', border:`1px solid ${active?color+'44':'var(--border)'}`, color:active?color:'#64748b', transition:'all .2s' }}>
    {label}
  </button>
);

// ── Company Tag Badge ──────────────────────────────────────────────────────
const CompanyTag = () => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:999, fontSize:10, fontWeight:800, background:'linear-gradient(135deg,rgba(22,163,74,0.18),rgba(79,70,229,0.12))', color:C.green, border:'1px solid rgba(22,163,74,0.35)', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>
    <Building2 size={9}/> COMPANY PROVIDED
  </span>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function MockOA() {
  const { user } = useAuth();
  const [screen,      setScreen]      = useState('list');
  const [activeType,  setActiveType]  = useState('all');
  const [search,      setSearch]      = useState('');
  const [test,        setTest]        = useState(null);
  const [questions,   setQuestions]   = useState([]);
  const [answers,     setAnswers]     = useState({});
  const [current,     setCurrent]     = useState(0);
  const [timeLeft,    setTimeLeft]    = useState(0);
  const [result,      setResult]      = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [flagged,     setFlagged]     = useState(new Set());

  // Proctoring: violations accumulate here for the whole attempt.
  const proctorRef = useRef([]);
  const [violationCount, setViolationCount] = useState(0);

  // DB-fetched company-uploaded tests
  const [dbTests,     setDbTests]     = useState([]);
  const [dbLoading,   setDbLoading]   = useState(true);

  const timerRef = useRef(null);
  const startRef = useRef(null);

  // ── Fetch approved company-uploaded tests from API ─────────────────────
  useEffect(() => {
    api.get('/api/mockoa/tests')
      .then(r => {
        const tests = (r.data?.tests || []).map(t => ({
          id:            t.id,
          title:         t.title,
          company:       t.companies?.name || 'Company',
          companyLogo:   t.companies?.logo_url,
          type:          t.type || t.test_type || 'technical',
          duration:      t.duration || t.duration_minutes || 60,
          totalMarks:    t.total_marks || 100,
          sections:      t.sections || [],
          questionCount: t.question_count || 0,
          source:        'company', // ← company-uploaded
          attempts:      t.attempts || 0,
          bestScore:     t.bestScore || null,
          dbId:          t.id,
        }));
        setDbTests(tests);
      })
      .catch(() => setDbTests([]))
      .finally(() => setDbLoading(false));
  }, []);

  // ── All tests loaded directly from Supabase ─────────────────────────
  const allTests = dbTests;

  const filtered = allTests.filter(t => {
    if (activeType !== 'all' && t.type !== activeType) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
                  !t.company.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const companyTestCount = dbTests.length;

  // ── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'test') { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen]);

  // ── Proctoring: collect violations from ProctorLayer ────────────────────
  const handleViolation = useCallback((v) => {
    proctorRef.current.push(v);
    setViolationCount(proctorRef.current.length);
  }, []);

  // ── Start test (always fetches directly from Supabase via backend) ──────
  const startTest = async (catalogEntry) => {
    try {
      const testId = catalogEntry.dbId || catalogEntry.id;
      const r = await api.get(`/api/mockoa/tests/${testId}`);
      const t = r.data.test;
      const qs = (r.data.questions || []).map(q => ({
        id:            q.id,
        section:       q.section || 'General',
        type:          q.type || q.question_type || 'text',
        text:          q.question_text,
        description:   q.description || '',
        starterCode:   q.starter_code || '',
        examples:      q.examples || '',
        constraints:   q.code_constraints || '',
        placeholder:   q.placeholder || '',
        opts:          q.options || [],
        ans:           q.correct_index !== undefined ? q.correct_index : q.correct_answer,
        correct_index: q.correct_index !== undefined ? q.correct_index : q.correct_answer,
        marks:         q.marks || 25,
        explanation:   q.explanation || '',
      }));
      const testObj = {
        id:          t.id,
        title:       t.title,
        company:     t.companies?.name || catalogEntry.company,
        type:        t.type || t.test_type || 'technical',
        duration:    t.duration || t.duration_minutes || 60,
        totalMarks:  t.total_marks || qs.reduce((s,q) => s + q.marks, 0),
        sections:    [...new Set(qs.map(q => q.section))],
        source:      'company',
      };
      setTest(testObj);
      setQuestions(qs);
    } catch (err) {
      toast.error('Failed to load test from database. Please try again.');
      return;
    }
    setAnswers({});
    setFlagged(new Set());
    setCurrent(0);
    setTimeLeft((catalogEntry.duration || 60) * 60);
    proctorRef.current = [];
    setViolationCount(0);
    toast('Proctored exam — camera & full-screen are required. Stay on this tab.', { icon:'🎥', duration:3500 });
    // Request full-screen from this user gesture (click) so the browser allows it.
    try {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (req) await req.call(el).catch(() => {});
    } catch (_) {}
    startRef.current = Date.now();
    setScreen('test');
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting) return;
    clearInterval(timerRef.current);
    setSubmitting(true);

    // Snapshot proctoring for this attempt.
    const violations = proctorRef.current.slice();
    const integrityScore = computeIntegrity(violations);
    const terminated = violations.filter(v => v.type === 'tab_switch' || v.type === 'fullscreen_exit').length >= 3;
    const violationSummary = violations.reduce((acc, v) => { acc[v.type] = (acc[v.type] || 0) + 1; return acc; }, {});
    const proctoring = { violations, integrityScore, terminated };

    try {
      const answerMap = {};
      Object.entries(answers).forEach(([qid, val]) => { answerMap[qid] = val; });
      const r = await api.post('/api/mockoa/submit', {
        testId: test.id,
        answers: answerMap,
        startedAt: new Date(startRef.current).toISOString(),
        proctoring,
      });
      const d = r.data;
      // Build result shape compatible with result screen
      const breakdown = {};
      questions.forEach(q => {
        const sec = q.section || 'General';
        if (!breakdown[sec]) breakdown[sec] = { correct:0, wrong:0, total:0, marks:0, earned:0 };
        breakdown[sec].total++;
        breakdown[sec].marks += q.marks || 25;
        const scored = d.scoredAnswers?.[q.id];
        if (scored?.result === 'correct' || scored?.result === 'answered') {
          breakdown[sec].correct++;
          breakdown[sec].earned += scored.points || 0;
        }
        if (scored?.result === 'wrong') { breakdown[sec].wrong++; }
      });
      setResult({
        earned: d.score, total: d.totalPossible, pct: d.percentage,
        grade: d.percentage>=90?'A+':d.percentage>=80?'A':d.percentage>=70?'B+':d.percentage>=60?'B':d.percentage>=50?'C':d.percentage>=40?'D':'F',
        correct: d.correct, wrong: d.wrong, skipped: d.skipped,
        totalMCQ: (d.correct||0)+(d.wrong||0)+(d.skipped||0),
        timeTaken: Math.round((Date.now() - startRef.current) / 1000),
        autoSubmitted: auto, breakdown, questions,
        scoredAnswers: d.scoredAnswers,
        integrityScore: d.integrityScore ?? integrityScore,
        violationCount: d.violationCount ?? violations.length,
        terminated: d.terminated ?? terminated,
        violationSummary: d.violationSummary || violationSummary,
      });
    } catch (err) {
      // Fallback to local scoring
      const res = calcScore(test, answers, questions);
      setResult({ ...res, timeTaken: Math.round((Date.now() - startRef.current) / 1000), autoSubmitted: auto,
        integrityScore, violationCount: violations.length, terminated, violationSummary });
    }

    setScreen('result');
    setSubmitting(false);
  }, [test, answers, submitting, questions]);

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const tc  = timeLeft < 120 ? C.red : timeLeft < 300 ? C.amber : C.cyan;
  const q   = questions[current];

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN: LIST
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === 'list') return (
    <div style={{ padding:24, maxWidth:1200, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:'var(--text-primary)', fontFamily:"'Sora',sans-serif" }}>Company Mock OA Tests</h1>
        <p style={{ margin:'6px 0 0', fontSize:13, color:C.gray }}>
          Practice authentic company Online Assessment questions loaded directly from the database.
        </p>
      </div>

      {/* Company OA banner */}
      {companyTestCount > 0 && (
        <div style={{ background:'linear-gradient(135deg,rgba(22,163,74,0.1),rgba(79,70,229,0.07))', border:'1px solid rgba(22,163,74,0.25)', borderRadius:14, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'rgba(22,163,74,0.15)', border:'1px solid rgba(22,163,74,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Building2 size={20} color={C.green}/>
          </div>
          <div>
            <p style={{ margin:0, fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>
              {companyTestCount} Authentic Company Tests Available in Supabase!
            </p>
            <p style={{ margin:'3px 0 0', fontSize:12, color:'#64748b' }}>
              Extracted from real on-campus and placement recruitment drives — practice company-wise questions with solutions and proctoring.
            </p>
          </div>
        </div>
      )}

      {/* Search & Type filter */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:10, padding:'9px 14px', flex:'1', maxWidth:360 }}>
          <Search size={14} color={C.gray}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company or test name..."
            style={{ background:'none', border:'none', outline:'none', fontSize:13, color:C.white, flex:1, fontFamily:"'Sora',sans-serif" }}/>
          {search && <button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:C.gray }}><XCircle size={13}/></button>}
        </div>

        {/* Type filter */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:11, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em', marginRight:4 }}>Type:</span>
          {[['all','All',C.cyan],['aptitude','Aptitude',C.cyan],['technical','Technical',C.violet],['behavioural','Behavioural',C.amber]].map(([v,l,col])=>(
            <Pill key={v} label={l} active={activeType===v} color={col} onClick={()=>setActiveType(v)}/>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {dbLoading && (
        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ flex:1, height:60, background:'var(--bg-card-high)', border:'1px solid var(--border)', borderRadius:12, animation:'pulse 1.5s infinite' }}/>
          ))}
        </div>
      )}

      {/* Test Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
        {filtered.map(t => {
          const color  = TYPE_COLOR[t.type] || C.violet;
          const Icon   = TYPE_ICON[t.type]  || Cpu;
          const isCompany = t.source === 'company';

          // Get attempt data
          const attData = (() => {
            if (isCompany) return t.bestScore != null ? [{ score: t.bestScore }] : [];
            try { return JSON.parse(localStorage.getItem('oa_attempts_' + t.id) || '[]'); } catch { return []; }
          })();
          const att = attData.length > 0 ? attData[0] : null;

          return (
            <div key={t.id}
              style={{ background:'var(--bg-card)', border:`1px solid ${isCompany ? 'rgba(22,163,74,0.25)' : color+'20'}`, borderRadius:16, padding:22, display:'flex', flexDirection:'column', gap:14, transition:'border-color .2s, transform .2s', cursor:'default', position:'relative', overflow:'hidden' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=isCompany?'rgba(22,163,74,0.5)':color+'55'; e.currentTarget.style.transform='translateY(-2px)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=isCompany?'rgba(22,163,74,0.25)':color+'20'; e.currentTarget.style.transform='translateY(0)'; }}>

              {/* Subtle glow for company tests */}
              {isCompany && (
                <div style={{ position:'absolute', top:0, right:0, width:120, height:120, background:'radial-gradient(circle at top right, rgba(22,163,74,0.08), transparent 70%)', pointerEvents:'none' }}/>
              )}

              {/* Card Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, flexWrap:'wrap' }}>
                    <Building2 size={12} color={C.gray}/>
                    <span style={{ fontSize:11, color:C.gray }}>{t.company}</span>
                    {/* ← COMPANY PROVIDED TAG */}
                    {isCompany && <CompanyTag />}
                  </div>
                  <p style={{ margin:0, fontSize:15, fontWeight:700, color:C.white, lineHeight:1.3 }}>{t.title}</p>
                </div>
                <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:`${color}18`, color, border:`1px solid ${color}33`, whiteSpace:'nowrap', marginLeft:8, textTransform:'capitalize' }}>
                  {t.type}
                </span>
              </div>

              {/* Meta */}
              <div style={{ display:'flex', gap:14, fontSize:12, color:C.light }}>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><Clock size={11} color={C.gray}/>{t.duration}m</span>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><Icon size={11} color={C.gray}/>{t.questionCount || '?'} Qs</span>
                {isCompany && <span style={{ display:'flex', alignItems:'center', gap:4, color:C.green, fontSize:11, fontWeight:700 }}>✓ Verified</span>}
              </div>

              {/* Sections */}
              {t.sections?.length > 0 && (
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {t.sections.map(s => (
                    <span key={s} style={{ fontSize:10, padding:'2px 8px', background:'var(--bg-card-high)', border:'1px solid var(--border)', borderRadius:5, color:C.light }}>{s}</span>
                  ))}
                </div>
              )}

              {/* Attempt info */}
              {att && (
                <p style={{ margin:0, fontSize:12, color:C.green, fontWeight:700 }}>✓ Attempted — Best: {att.score}%</p>
              )}

              {/* CTA */}
              <button onClick={() => startTest(t)}
                style={{ width:'100%', padding:'11px 0', background:att?`${color}15`:isCompany?`linear-gradient(135deg,${C.green},#15803d)`:color, border:`1px solid ${isCompany?C.green:color}`, borderRadius:10, fontSize:13, fontWeight:700, color:att?color:isCompany?'#ffffff':'#ffffff', cursor:'pointer', fontFamily:"'Sora',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all .2s' }}>
                {att ? <><RefreshCw size={14}/> Retake Test</> : isCompany ? <><Building2 size={14}/> Start Company OA</> : <>Start Test →</>}
              </button>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && !dbLoading && (
        <p style={{ textAlign:'center', color:C.gray, padding:'60px 0', fontSize:14 }}>
          No tests match your filters.
        </p>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN: TEST
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === 'test') {
    const sections = [...new Set(questions.map(q => q.section))];
    const answered = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '').length;
    const isCompanyTest = test?.source === 'company';

    return (
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column' }}>

        {/* Top bar */}
        <div style={{ background:'var(--bg-input)', borderBottom:'1px solid var(--border)', padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.white }}>{test.title}</p>
              {isCompanyTest && <CompanyTag />}
            </div>
            <p style={{ margin:0, fontSize:11, color:C.gray }}>{test.company} · {questions.length} Questions · {test.totalMarks} Marks</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, background: violationCount ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)', border:`1px solid ${violationCount ? 'rgba(220,38,38,0.35)' : 'rgba(22,163,74,0.3)'}` }}>
              <Eye size={13} color={violationCount ? C.red : C.green}/>
              <span style={{ fontSize:11, fontWeight:700, color: violationCount ? C.red : C.green }}>
                {violationCount ? `${violationCount} flag${violationCount!==1?'s':''}` : 'Proctored'}
              </span>
            </div>
            <div style={{ textAlign:'center' }}>
              <p style={{ margin:0, fontSize:11, color:C.gray }}>Answered</p>
              <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.green }}>{answered}/{questions.length}</p>
            </div>
            <div style={{ background:`${tc}18`, border:`1px solid ${tc}44`, borderRadius:10, padding:'8px 18px', display:'flex', alignItems:'center', gap:8 }}>
              <Clock size={16} color={tc}/>
              <span style={{ fontSize:20, fontWeight:800, color:tc, fontFamily:'monospace' }}>{fmt(timeLeft)}</span>
            </div>
            <button onClick={() => { if(window.confirm('Submit test now?')) handleSubmit(false); }} disabled={submitting}
              style={{ padding:'9px 18px', background:C.green, border:'none', borderRadius:9, fontSize:13, fontWeight:700, color:'#ffffff', cursor:'pointer', fontFamily:"'Sora',sans-serif", display:'flex', alignItems:'center', gap:7 }}>
              <Send size={13}/>{submitting?'Submitting...':'Submit'}
            </button>
          </div>
        </div>

        {/* Proctoring layer: fullscreen lock, tab/blur, copy-paste, camera face-presence */}
        <ProctorLayer
          active={screen === 'test'}
          onViolation={handleViolation}
          onTerminate={() => handleSubmit(true)}
          maxHardStrikes={3}
          requireCamera={true}
        />

        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

          {/* Question palette */}
          <div style={{ width:220, background:'var(--bg-input)', borderRight:'1px solid var(--border)', padding:16, overflowY:'auto', flexShrink:0 }}>
            <p style={{ margin:'0 0 12px', fontSize:11, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em' }}>Question Palette</p>
            {sections.map(sec => {
              const sqs = questions.filter(q => q.section === sec);
              return (
                <div key={sec} style={{ marginBottom:16 }}>
                  <p style={{ margin:'0 0 6px', fontSize:10, color:C.gray, fontWeight:600, letterSpacing:'0.05em' }}>{sec}</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                    {sqs.map(pq => {
                      const globalIdx = questions.findIndex(x => x.id === pq.id);
                      const isAns = answers[pq.id] !== undefined && answers[pq.id] !== '';
                      const isFl  = flagged.has(pq.id);
                      const isCur = globalIdx === current;
                      const bgc   = isCur ? C.cyan : isFl ? C.amber : isAns ? C.green : 'var(--bg-card-high)';
                      return (
                        <button key={pq.id} onClick={() => setCurrent(globalIdx)}
                          style={{ width:32, height:32, borderRadius:6, background:bgc, border:`1px solid ${isCur?C.cyan:isAns?C.green:isFl?C.amber:'var(--border)'}`, color:isCur||isAns||isFl?'#ffffff':C.light, fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {globalIdx+1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {/* Legend */}
            <div style={{ marginTop:16, borderTop:'1px solid var(--border)', paddingTop:12 }}>
              {[{c:C.green,l:'Answered'},{c:C.amber,l:'Flagged'},{c:C.cyan,l:'Current'},{c:'var(--bg-card-high)',l:'Not visited'}].map(x=>(
                <div key={x.l} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                  <div style={{ width:12, height:12, borderRadius:3, background:x.c }}/>
                  <span style={{ fontSize:10, color:C.gray }}>{x.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Question area */}
          <div style={{ flex:1, overflowY:'auto', padding:32 }}>
            {q && (
              <div style={{ maxWidth:800, margin:'0 auto' }}>

                {/* Q header */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    <span style={{ background:'var(--bg-card-high)', borderRadius:8, padding:'4px 12px', fontSize:12, fontWeight:700, color:C.white }}>Q {current+1} of {questions.length}</span>
                    <span style={{ background:`${TYPE_COLOR[test.type]||C.violet}18`, borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:700, color:TYPE_COLOR[test.type]||C.violet, textTransform:'capitalize' }}>
                      {q.type === 'text' ? 'Descriptive' : 'MCQ'}
                    </span>
                    <span style={{ fontSize:11, color:C.gray }}>{q.section}</span>
                    <span style={{ fontSize:11, color:C.amber, fontWeight:700 }}>[{q.marks} marks]</span>
                    {isCompanyTest && <CompanyTag />}
                  </div>
                  <button onClick={() => setFlagged(f => { const n = new Set(f); n.has(q.id)?n.delete(q.id):n.add(q.id); return n; })}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:flagged.has(q.id)?`${C.amber}18`:'transparent', border:`1px solid ${flagged.has(q.id)?C.amber:'var(--border)'}`, borderRadius:8, color:flagged.has(q.id)?C.amber:C.gray, fontSize:12, cursor:'pointer' }}>
                    <Flag size={12}/>{flagged.has(q.id)?'Flagged':'Flag'}
                  </button>
                </div>

                {/* Question title & description */}
                <div style={{ background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:14, padding:24, marginBottom:20 }}>
                  <h3 style={{ margin:'0 0 14px', fontSize:17, fontWeight:800, color:C.white, fontFamily:"'Sora',sans-serif" }}>{q.text}</h3>
                  {q.description && (
                    <div style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.75, whiteSpace:'pre-wrap', fontFamily:"'JetBrains Mono', Consolas, Monaco, monospace", background:'var(--bg-card)', padding:18, borderRadius:10, border:'1px solid var(--border)', maxHeight:420, overflowY:'auto' }}>
                      {q.description}
                    </div>
                  )}
                </div>

                {/* MCQ Options */}
                {q.type === 'mcq' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {(q.opts || q.options || []).map((opt, i) => {
                      const sel = parseInt(answers[q.id]) === i;
                      return (
                        <button key={i} onClick={() => setAnswers(a => ({...a, [q.id]: i}))}
                          style={{ textAlign:'left', padding:'14px 18px', background:sel?`${C.violet}18`:'var(--bg-card-high)', border:`1px solid ${sel?C.violet:'var(--border)'}`, borderRadius:10, color:sel?C.white:C.light, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:12, fontFamily:"'Sora',sans-serif", transition:'all .15s' }}>
                          <span style={{ width:28, height:28, borderRadius:7, background:sel?C.violet:'var(--bg-card-high)', border:`1px solid ${sel?C.violet:'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:sel?'#fff':C.gray, flexShrink:0 }}>
                            {['A','B','C','D'][i]}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Text / Coding Area */}
                {q.type === 'text' && (
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:C.light }}>Write Your Code / Solution:</span>
                      <span style={{ fontSize:11, color:C.gray }}>
                        Lines: {(answers[q.id]||'').split('\n').length} | Chars: {(answers[q.id]||'').length}
                      </span>
                    </div>
                    <textarea
                      value={answers[q.id] || ''}
                      onChange={e => setAnswers(a => ({...a, [q.id]: e.target.value}))}
                      placeholder={q.placeholder || '// Write your solution, code (Python/C++/Java), or approach here...'}
                      rows={14}
                      style={{ width:'100%', background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:10, padding:16, fontSize:13, color:C.white, resize:'vertical', outline:'none', lineHeight:1.6, fontFamily:"'JetBrains Mono', Consolas, Monaco, monospace", boxSizing:'border-box' }}
                    />
                  </div>
                )}

                {/* Navigation */}
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:24 }}>
                  <button onClick={() => setCurrent(c => Math.max(0,c-1))} disabled={current===0}
                    style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', background:'transparent', border:'1px solid var(--border)', borderRadius:9, color:current===0?C.gray:C.white, fontSize:13, cursor:current===0?'not-allowed':'pointer', fontFamily:"'Sora',sans-serif" }}>
                    <ChevronLeft size={15}/> Previous
                  </button>
                  <button onClick={() => setAnswers(a => ({...a,[q.id]:undefined}))}
                    style={{ padding:'10px 18px', background:'transparent', border:`1px solid ${C.red}33`, borderRadius:9, color:C.red, fontSize:12, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
                    Clear
                  </button>
                  <button onClick={() => setCurrent(c => Math.min(questions.length-1,c+1))} disabled={current===questions.length-1}
                    style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', background:C.cyan, border:'none', borderRadius:9, color:'#ffffff', fontSize:13, fontWeight:700, cursor:current===questions.length-1?'not-allowed':'pointer', fontFamily:"'Sora',sans-serif" }}>
                    Next <ChevronRight size={15}/>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN: RESULT
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === 'result' && result) {
    const gradeColor = result.grade.startsWith('A')?C.green:result.grade==='B+'||result.grade==='B'?C.cyan:result.grade==='C'?C.amber:C.red;
    const timeTakenFmt = `${Math.floor(result.timeTaken/60)}m ${result.timeTaken%60}s`;
    const isCompanyTest = test?.source === 'company';

    const radarData = Object.entries(result.breakdown).map(([sec, b]) => ({
      subject: sec.length > 12 ? sec.substring(0,12)+'…' : sec,
      score: b.marks > 0 ? Math.round((b.earned/b.marks)*100) : 0,
      fullMark: 100,
    }));

    const barData = Object.entries(result.breakdown).map(([sec, b]) => ({
      name: sec.length > 10 ? sec.substring(0,10)+'…' : sec,
      earned: b.earned, total: b.marks,
    }));

    const CustomTooltip = ({active,payload,label}) => active&&payload?.length
      ? <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px'}}>
          <p style={{margin:0,fontSize:11,color:C.gray}}>{label}</p>
          {payload.map((p,i)=><p key={i} style={{margin:'3px 0 0',fontSize:13,fontWeight:700,color:p.color||C.cyan}}>{p.name}: {p.value}</p>)}
        </div> : null;

    return (
      <div style={{ padding:24, maxWidth:1200, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:'var(--text-primary)', fontFamily:"'Sora',sans-serif" }}>OA Analysis Dashboard</h1>
              {isCompanyTest && <CompanyTag />}
            </div>
            <p style={{ margin:0, fontSize:13, color:C.gray }}>{test.title} · {test.company}</p>
            {result.autoSubmitted && <span style={{ fontSize:11, color:C.amber, fontWeight:700 }}>⚡ Auto-submitted (timer expired)</span>}
          </div>
          <button onClick={() => setScreen('list')}
            style={{ padding:'9px 18px', background:'var(--bg-card-high)', border:'1px solid var(--border)', borderRadius:9, color:C.white, fontSize:13, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
            ← Back to Tests
          </button>
        </div>

        {/* Score cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {[
            { label:'Score',           value:`${result.earned}/${result.total}`, sub:`${result.pct}%`,             color:gradeColor },
            { label:'Grade',           value:result.grade,                       sub:'Performance',                 color:gradeColor },
            { label:'Correct / Wrong', value:`${result.correct} / ${result.wrong}`, sub:`${result.skipped} skipped`, color:C.green },
            { label:'Time Taken',      value:timeTakenFmt,                       sub:`of ${test.duration}m allowed`, color:C.cyan },
          ].map((m,i) => (
            <div key={i} style={{ background:'var(--bg-card)', border:`1px solid ${m.color}22`, borderRadius:14, padding:20, textAlign:'center' }}>
              <p style={{ margin:0, fontSize:12, color:C.gray, textTransform:'uppercase', letterSpacing:'0.06em' }}>{m.label}</p>
              <p style={{ margin:'8px 0 2px', fontSize:26, fontWeight:800, color:m.color, fontFamily:"'Sora',sans-serif", lineHeight:1 }}>{m.value}</p>
              <p style={{ margin:0, fontSize:11, color:C.gray }}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Proctoring integrity panel */}
        {(() => {
          const iScore = result.integrityScore ?? 100;
          const iColor = iScore >= 85 ? C.green : iScore >= 60 ? C.amber : C.red;
          const summary = result.violationSummary || {};
          const LABELS = {
            tab_switch:'Tab switches', fullscreen_exit:'Full-screen exits', multiple_faces:'Multiple faces',
            no_face:'Face not visible', copy:'Copy attempts', cut:'Cut attempts', paste:'Paste attempts',
            context_menu:'Right-clicks', camera_blocked:'Camera blocked',
          };
          const entries = Object.entries(summary).filter(([, n]) => n > 0);
          return (
            <div style={{ background:'var(--bg-card)', border:`1px solid ${iColor}33`, borderRadius:14, padding:20, marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:`${iColor}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Eye size={22} color={iColor}/>
                  </div>
                  <div>
                    <p style={{ margin:0, fontSize:13, fontWeight:800, color:C.white }}>Proctoring Integrity</p>
                    <p style={{ margin:'2px 0 0', fontSize:11, color:C.gray }}>
                      {result.terminated ? 'Exam auto-submitted due to repeated violations' :
                        (result.violationCount ? `${result.violationCount} violation${result.violationCount!==1?'s':''} recorded` : 'No violations detected — clean attempt')}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ margin:0, fontSize:28, fontWeight:800, color:iColor, fontFamily:"'Sora',sans-serif", lineHeight:1 }}>{iScore}<span style={{ fontSize:14, color:C.gray }}>/100</span></p>
                  <p style={{ margin:'2px 0 0', fontSize:10, color:C.gray, textTransform:'uppercase', letterSpacing:'0.06em' }}>Integrity Score</p>
                </div>
              </div>
              {entries.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:16, paddingTop:14, borderTop:'1px solid var(--border)' }}>
                  {entries.map(([type, n]) => (
                    <span key={type} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 11px', borderRadius:999, background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.25)', fontSize:11, fontWeight:700, color:C.red }}>
                      <AlertTriangle size={11}/> {LABELS[type] || type}: {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Charts */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
            <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:C.white }}>Marks by Section</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{top:4,right:4,bottom:0,left:-20}}>
                <XAxis dataKey="name" tick={{fill:C.gray,fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.gray,fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="earned" name="Earned" radius={[4,4,0,0]} maxBarSize={28}>
                  {barData.map((entry,i) => {
                    const pct = entry.total>0?Math.round((entry.earned/entry.total)*100):0;
                    return <Cell key={i} fill={pct>=75?C.green:pct>=50?C.amber:C.red}/>;
                  })}
                </Bar>
                <Bar dataKey="total" name="Total" fill="rgba(15,23,42,0.08)" radius={[4,4,0,0]} maxBarSize={28}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {radarData.length >= 3 ? (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
              <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:C.white }}>Section Radar</p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(15,23,42,0.10)"/>
                  <PolarAngleAxis dataKey="subject" tick={{fill:C.gray,fontSize:10}}/>
                  <Radar name="Score %" dataKey="score" stroke={gradeColor} fill={gradeColor} fillOpacity={0.2} strokeWidth={2}/>
                  <Tooltip content={<CustomTooltip/>}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
              <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:C.white }}>MCQ Breakdown</p>
              <div style={{ display:'flex', gap:12, marginBottom:14 }}>
                {[{l:'Correct',v:result.correct,c:C.green},{l:'Wrong',v:result.wrong,c:C.red},{l:'Skipped',v:result.skipped,c:C.gray}].map(x=>(
                  <div key={x.l} style={{ flex:1, textAlign:'center', padding:14, background:`${x.c}0f`, border:`1px solid ${x.c}22`, borderRadius:10 }}>
                    <p style={{ margin:0, fontSize:24, fontWeight:800, color:x.c }}>{x.v}</p>
                    <p style={{ margin:'4px 0 0', fontSize:11, color:C.gray }}>{x.l}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section table */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:20, marginBottom:20 }}>
          <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:C.white }}>Section-wise Performance</p>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Section','Questions','Correct','Marks Earned','Total','Score %'].map(h=>(
              <th key={h} style={{ padding:'8px 12px', fontSize:11, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid var(--border)', textAlign:'left' }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {Object.entries(result.breakdown).map(([sec, b]) => {
                const pct = b.marks>0?Math.round((b.earned/b.marks)*100):0;
                const col = pct>=75?C.green:pct>=50?C.amber:C.red;
                return (
                  <tr key={sec}>
                    <td style={{ padding:'12px', fontSize:13, color:C.white, borderBottom:'1px solid var(--border)', fontWeight:600 }}>{sec}</td>
                    <td style={{ padding:'12px', fontSize:13, color:C.light, borderBottom:'1px solid var(--border)' }}>{b.total}</td>
                    <td style={{ padding:'12px', fontSize:13, color:C.green, borderBottom:'1px solid var(--border)', fontWeight:700 }}>{b.correct}</td>
                    <td style={{ padding:'12px', fontSize:13, color:col, borderBottom:'1px solid var(--border)', fontWeight:700 }}>{b.earned}</td>
                    <td style={{ padding:'12px', fontSize:13, color:C.light, borderBottom:'1px solid var(--border)' }}>{b.marks}</td>
                    <td style={{ padding:'12px', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ flex:1, height:6, background:'var(--bg-card-high)', borderRadius:999 }}>
                          <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:999, transition:'width .6s' }}/>
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color:col, minWidth:36 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Question-by-Question Review with Solutions */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:20, marginBottom:24 }}>
          <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:C.white, display:'flex', alignItems:'center', gap:8 }}>
            <Sparkles size={16} color={C.green}/> Question-by-Question Review & Official Solutions
          </p>
          {(result.questions || []).map((q, i) => {
            const userAns = answers[q.id];
            const isText = q.type === 'text';
            const correctIdx = q.correct_index !== undefined ? q.correct_index : q.correct_answer !== undefined ? q.correct_answer : q.ans;
            const scored = result.scoredAnswers?.[q.id];
            const isCorrect = isText ? !!(userAns && userAns.trim().length > 10) : parseInt(userAns) === correctIdx;
            const isSkipped = isText ? !(userAns && userAns.trim().length > 0) : (userAns === undefined || userAns === null || userAns === '');
            const statusColor = isSkipped ? C.gray : isCorrect ? C.green : C.red;
            const statusIcon  = isSkipped ? '—' : isCorrect ? '✓' : '✗';
            const explanation = scored?.explanation || q.explanation;

            return (
              <div key={q.id} style={{ marginBottom:14, padding:16, background:`${statusColor}08`, border:`1px solid ${statusColor}20`, borderRadius:10 }}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <span style={{ width:26, height:26, borderRadius:7, background:statusColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#ffffff', flexShrink:0 }}>
                    {statusIcon}
                  </span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, flexWrap:'wrap', gap:8 }}>
                      <p style={{ margin:0, fontSize:13, color:C.white, lineHeight:1.5, flex:1 }}><strong>Q{i+1}.</strong> {q.text}</p>
                      <span style={{ fontSize:11, color:C.gray, whiteSpace:'nowrap' }}>{q.section} [{q.marks} marks]</span>
                    </div>

                    {isText ? (
                      <div style={{ marginBottom:10 }}>
                        <span style={{ fontSize:12, color:C.gray }}>Your Submitted Code / Response:</span>
                        <pre style={{ margin:'6px 0', padding:10, background:'var(--bg-card-high)', borderRadius:8, fontSize:12, color:userAns ? C.white : C.gray, overflowX:'auto', whiteSpace:'pre-wrap', fontFamily:"'JetBrains Mono', Consolas, Monaco, monospace" }}>
                          {userAns || '(No response submitted)'}
                        </pre>
                      </div>
                    ) : (
                      <div style={{ display:'flex', gap:16, fontSize:12, flexWrap:'wrap', marginBottom:8 }}>
                        <span style={{ color:C.gray }}>Your answer: <strong style={{ color:isSkipped?C.gray:isCorrect?C.green:C.red }}>{isSkipped ? 'Not attempted' : (q.opts||q.options||[])[parseInt(userAns)]||'N/A'}</strong></span>
                        <span style={{ color:C.gray }}>Correct: <strong style={{ color:C.green }}>{(q.opts||q.options||[])[correctIdx]}</strong></span>
                      </div>
                    )}

                    {explanation && (
                      <div style={{ marginTop:8, background:'var(--bg-card-high)', borderRadius:8, padding:'10px 14px', border:'1px solid var(--border)' }}>
                        <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:C.green }}>💡 Official Solution & Approach:</p>
                        <pre style={{ margin:0, fontSize:12, color:C.light, whiteSpace:'pre-wrap', fontFamily:"'JetBrains Mono', Consolas, Monaco, monospace", lineHeight:1.6 }}>
                          {explanation}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <button onClick={() => startTest(test)}
            style={{ padding:'12px 28px', background:C.violet, border:'none', borderRadius:10, fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:"'Sora',sans-serif", display:'flex', alignItems:'center', gap:8 }}>
            <RefreshCw size={15}/> Retake Test
          </button>
          <button onClick={() => setScreen('list')}
            style={{ padding:'12px 28px', background:'transparent', border:'1px solid var(--border)', borderRadius:10, fontSize:14, fontWeight:700, color:C.white, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
            All Tests
          </button>
        </div>
      </div>
    );
  }

  return null;
}
