// src/pages/admin/CompanyOAApprovals.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import {
  CheckCircle, XCircle, ChevronDown, ChevronUp, Loader2,
  RefreshCw, Building2, Clock, Users, AlertCircle, Eye,
  BookOpen, Award, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_COLOR = { aptitude:'#00c8f0', technical:'#7c5cfc', behavioural:'#f5a623' };

export default function CompanyOAApprovals() {
  const { isDark }   = useTheme();
  const [tests,    setTests]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [qs,       setQs]       = useState({});   // test_id → questions
  const [loadingQ, setLoadingQ] = useState(null);
  const [acting,   setActing]   = useState(null);
  const [note,     setNote]     = useState('');
  const [tab,      setTab]      = useState('pending'); // pending | all

  const bg   = isDark ? '#040c18' : '#f0f4f8';
  const card = isDark ? '#0b1a2e' : '#ffffff';
  const bord = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const txt  = isDark ? '#e2e8f0' : '#0f172a';
  const txt2 = isDark ? '#94a3b8' : '#64748b';
  const inputS = {
    width:'100%', boxSizing:'border-box', resize:'vertical',
    background: isDark?'#071525':'#f8fafc',
    border:`1px solid ${isDark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.12)'}`,
    borderRadius:8, padding:'8px 12px', fontSize:13, color:txt,
    outline:'none', fontFamily:"'Sora',sans-serif", minHeight:70,
  };

  const load = async () => {
    setLoading(true);
    try {
      const endpoint = tab === 'pending' ? '/api/companyoa/pending' : '/api/companyoa/all';
      const r = await api.get(endpoint);
      setTests(r.data?.tests || []);
    } catch { toast.error('Failed to load tests'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tab]);

  const loadQuestions = async (testId) => {
    if (qs[testId]) { setExpanded(expanded === testId ? null : testId); return; }
    setLoadingQ(testId);
    try {
      const r = await api.get(`/api/companyoa/${testId}/questions`);
      setQs(prev => ({ ...prev, [testId]: r.data?.questions || [] }));
      setExpanded(testId);
    } catch { toast.error('Failed to load questions'); }
    finally { setLoadingQ(null); }
  };

  const act = async (testId, action) => {
    setActing(testId);
    try {
      await api.patch(`/api/companyoa/${testId}/approve`, { action, note });
      toast.success(action === 'approve'
        ? '✅ Test approved! Students have been notified.'
        : '❌ Test rejected.');
      setTests(prev => tab === 'pending'
        ? prev.filter(t => t.id !== testId)
        : prev.map(t => t.id === testId ? { ...t, approval_status: action === 'approve' ? 'approved' : 'rejected' } : t));
      setExpanded(null);
      setNote('');
    } catch (e) { toast.error(e.response?.data?.error || 'Action failed'); }
    finally { setActing(null); }
  };

  const statusBadge = (status) => {
    const map = {
      pending:  { col:'#f5a623', bg:'rgba(245,166,35,0.12)',  icon:<Clock size={10}/>,        label:'Pending' },
      approved: { col:'#10c98a', bg:'rgba(16,201,138,0.12)', icon:<CheckCircle size={10}/>,  label:'Approved' },
      rejected: { col:'#f04b4b', bg:'rgba(240,75,75,0.12)',  icon:<XCircle size={10}/>,      label:'Rejected' },
    };
    const s = map[status] || map.pending;
    return <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px',
      borderRadius:999, fontSize:11, fontWeight:700, background:s.bg, color:s.col,
      border:`1px solid ${s.col}33` }}>{s.icon}{s.label}</span>;
  };

  return (
    <div style={{ padding:24, maxWidth:1100, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:txt, fontFamily:"'Sora',sans-serif" }}>
            Company OA Approvals
          </h1>
          <p style={{ margin:'6px 0 0', fontSize:13, color:txt2 }}>
            Review OA tests submitted by companies before they go live for students.
          </p>
        </div>
        <button onClick={load} style={{ display:'flex', alignItems:'center', gap:6,
          padding:'8px 14px', background:isDark?'rgba(255,255,255,0.05)':'#f1f5f9',
          border:`1px solid ${bord}`, borderRadius:8, fontSize:12, fontWeight:600,
          color:txt2, cursor:'pointer' }}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* Info banner */}
      <div style={{ padding:'10px 14px', marginBottom:18, background:'rgba(124,92,252,0.07)',
        border:'1px solid rgba(124,92,252,0.2)', borderRadius:10,
        display:'flex', gap:10, alignItems:'flex-start' }}>
        <AlertCircle size={15} color="#7c5cfc" style={{ flexShrink:0, marginTop:1 }}/>
        <p style={{ margin:0, fontSize:12, color:txt2, lineHeight:1.6 }}>
          <strong style={{ color:'#7c5cfc' }}>Workflow:</strong> Company recruiter submits test with questions and answer key →
          You review every question and correct answer here → Approve to publish to students
          (auto-announcement sent) or Reject with a note to the company.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, marginBottom:20, background:isDark?'#071525':'#f1f5f9',
        borderRadius:10, padding:4, width:'fit-content' }}>
        {[['pending','Pending Review'], ['all','All Submissions']].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding:'8px 20px', borderRadius:8, border:'none', cursor:'pointer',
            fontSize:13, fontWeight:700, fontFamily:"'Sora',sans-serif",
            background: tab===key ? (isDark?'#0b1a2e':'#ffffff') : 'transparent',
            color: tab===key ? '#7c5cfc' : txt2,
            boxShadow: tab===key ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <Loader2 size={28} color="#7c5cfc" style={{ animation:'spin 1s linear infinite', display:'inline-block' }}/>
          <p style={{ margin:'12px 0 0', color:txt2 }}>Loading tests...</p>
        </div>
      ) : tests.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <CheckCircle size={40} color="#10c98a" style={{ marginBottom:12 }}/>
          <h3 style={{ margin:0, color:txt2, fontWeight:600 }}>
            {tab === 'pending' ? 'No pending tests!' : 'No submissions yet.'}
          </h3>
          <p style={{ color:isDark?'#334155':'#94a3b8', marginTop:6, fontSize:14 }}>
            {tab === 'pending' ? 'All caught up — no company OA tests awaiting review.' : 'Companies have not submitted any OA tests yet.'}
          </p>
        </div>
      ) : (
        <div>
          <p style={{ fontSize:12, color:txt2, marginBottom:14 }}>
            {tests.length} test{tests.length!==1?'s':''} {tab==='pending'?'pending approval':'total'}
          </p>
          {tests.map(test => {
            const isOpen = expanded === test.id;
            const questions = qs[test.id] || [];
            const typeCol = TYPE_COLOR[test.test_type] || '#94a3b8';
            return (
              <div key={test.id} style={{ background:card, border:`1px solid ${bord}`,
                borderRadius:14, marginBottom:14, overflow:'hidden' }}>

                {/* Card header */}
                <div style={{ padding:'16px 20px', display:'flex', alignItems:'flex-start', gap:14 }}>
                  {/* Company logo/initial */}
                  <div style={{ width:46, height:46, borderRadius:10, flexShrink:0,
                    background:`${typeCol}18`, display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:18, fontWeight:800, color:typeCol }}>
                    {test.companies?.name?.[0] || '?'}
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:5 }}>
                      <span style={{ fontSize:15, fontWeight:700, color:txt }}>{test.title}</span>
                      <span style={{ padding:'2px 10px', borderRadius:999, fontSize:11, fontWeight:700,
                        background:`${typeCol}18`, color:typeCol, border:`1px solid ${typeCol}33`,
                        textTransform:'capitalize' }}>{test.test_type}</span>
                      {statusBadge(test.approval_status)}
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:16 }}>
                      <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:txt2 }}>
                        <Building2 size={12}/>{test.companies?.name || 'Unknown Company'}
                      </span>
                      <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:txt2 }}>
                        <Clock size={12}/>{test.duration} min
                      </span>
                      <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:txt2 }}>
                        <BookOpen size={12}/>{test.question_count || '?'} questions
                      </span>
                      <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:txt2 }}>
                        <Users size={12}/>
                        {test.target_branches?.length ? test.target_branches.join(', ') : 'All branches'}
                      </span>
                      <span style={{ fontSize:11, color:isDark?'#334155':'#cbd5e1' }}>
                        Submitted {new Date(test.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                      </span>
                    </div>
                    {test.approval_note && (
                      <p style={{ margin:'6px 0 0', fontSize:12, color:'#f04b4b', fontStyle:'italic' }}>
                        Note: {test.approval_note}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:8, flexShrink:0, alignItems:'center' }}>
                    <button onClick={() => loadQuestions(test.id)} style={{
                      display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                      background:isDark?'rgba(255,255,255,0.04)':'#f1f5f9',
                      border:`1px solid ${bord}`, borderRadius:7, fontSize:12, color:txt2, cursor:'pointer' }}>
                      {loadingQ === test.id
                        ? <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/>
                        : isOpen ? <ChevronUp size={13}/> : <Eye size={13}/>}
                      {isOpen ? 'Collapse' : 'Preview Questions'}
                    </button>
                    {test.approval_status === 'pending' && <>
                      <button onClick={() => act(test.id, 'reject')} disabled={acting===test.id}
                        style={{ padding:'6px 14px', background:'rgba(240,75,75,0.1)',
                          border:'1px solid rgba(240,75,75,0.3)', borderRadius:7,
                          fontSize:12, fontWeight:700, color:'#f04b4b', cursor:'pointer',
                          display:'flex', alignItems:'center', gap:4 }}>
                        <XCircle size={13}/> Reject
                      </button>
                      <button onClick={() => act(test.id, 'approve')} disabled={acting===test.id}
                        style={{ padding:'6px 14px', background:'rgba(16,201,138,0.12)',
                          border:'1px solid rgba(16,201,138,0.3)', borderRadius:7,
                          fontSize:12, fontWeight:700, color:'#10c98a', cursor:'pointer',
                          display:'flex', alignItems:'center', gap:4 }}>
                        {acting===test.id
                          ? <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/>
                          : <CheckCircle size={13}/>} Approve
                      </button>
                    </>}
                  </div>
                </div>

                {/* Expanded: questions preview + action */}
                {isOpen && (
                  <div style={{ borderTop:`1px solid ${bord}`,
                    background:isDark?'rgba(0,0,0,0.15)':'#f8fafc', padding:'16px 20px' }}>

                    {/* Description + Instructions */}
                    {test.description && (
                      <p style={{ margin:'0 0 12px', fontSize:13, color:txt2, lineHeight:1.6 }}>
                        <strong style={{ color:txt }}>Description: </strong>{test.description}
                      </p>
                    )}
                    {test.instructions && (
                      <p style={{ margin:'0 0 14px', fontSize:13, color:txt2, lineHeight:1.6 }}>
                        <strong style={{ color:txt }}>Instructions: </strong>{test.instructions}
                      </p>
                    )}

                    {/* Questions */}
                    <p style={{ margin:'0 0 10px', fontSize:11, fontWeight:700, color:txt2,
                      textTransform:'uppercase', letterSpacing:'0.07em' }}>
                      Questions & Answer Key ({questions.length})
                    </p>

                    <div style={{ maxHeight:420, overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>
                      {questions.map((q, i) => (
                        <div key={q.id} style={{ padding:'12px 14px', background:card,
                          border:`1px solid ${bord}`, borderRadius:9 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:q.question_type==='mcq'?10:0 }}>
                            <span style={{ fontSize:11, fontWeight:800, color:'#7c5cfc',
                              background:'rgba(124,92,252,0.1)', padding:'2px 8px', borderRadius:999 }}>Q{i+1}</span>
                            <span style={{ fontSize:10, color:txt2,
                              background:isDark?'rgba(255,255,255,0.04)':'#f1f5f9',
                              padding:'2px 8px', borderRadius:5 }}>{q.section}</span>
                            <span style={{ fontSize:10, color:'#10c98a' }}>{q.marks} mk</span>
                            <span style={{ fontSize:10, color:txt2, marginLeft:'auto',
                              textTransform:'capitalize', fontStyle:'italic' }}>{q.question_type}</span>
                          </div>
                          <p style={{ margin:'0 0 8px', fontSize:13, color:txt, lineHeight:1.6 }}>
                            {q.question_text}
                          </p>
                          {q.question_type === 'mcq' && q.options && (
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                              {q.options.map((opt, oi) => (
                                <div key={oi} style={{ display:'flex', alignItems:'center', gap:7,
                                  padding:'6px 10px', borderRadius:7, fontSize:12,
                                  background: oi===q.correct_index
                                    ? (isDark?'rgba(16,201,138,0.12)':'#f0fdf4')
                                    : (isDark?'rgba(255,255,255,0.02)':'#f8f9fa'),
                                  border:`1px solid ${oi===q.correct_index?'#10c98a':bord}`,
                                  color: oi===q.correct_index ? '#10c98a' : txt2 }}>
                                  {oi===q.correct_index
                                    ? <CheckCircle size={13} color="#10c98a"/>
                                    : <span style={{ width:13, height:13, borderRadius:'50%',
                                        border:`1.5px solid ${isDark?'#334155':'#d1d5db'}`,
                                        display:'inline-block' }}/>}
                                  <span style={{ fontWeight: oi===q.correct_index?700:400 }}>
                                    {String.fromCharCode(65+oi)}. {opt}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {q.explanation && (
                            <p style={{ margin:'8px 0 0', fontSize:11, color:'#7c5cfc',
                              fontStyle:'italic', lineHeight:1.5 }}>
                              💡 {q.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Note + final action buttons */}
                    {test.approval_status === 'pending' && (
                      <div style={{ marginTop:16 }}>
                        <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:txt2,
                          textTransform:'uppercase', letterSpacing:'0.07em' }}>
                          Note to Company (shown on rejection)
                        </p>
                        <textarea style={inputS} value={note} onChange={e=>setNote(e.target.value)}
                          placeholder="e.g. Some questions need clearer wording. Please revise Q3 and Q7."/>
                        <div style={{ display:'flex', gap:10, marginTop:12, justifyContent:'flex-end' }}>
                          <button onClick={() => act(test.id,'reject')} disabled={acting===test.id}
                            style={{ padding:'9px 20px', background:'rgba(240,75,75,0.1)',
                              border:'1px solid rgba(240,75,75,0.3)', borderRadius:8,
                              fontSize:13, fontWeight:700, color:'#f04b4b', cursor:'pointer',
                              display:'flex', alignItems:'center', gap:6 }}>
                            <XCircle size={14}/> Reject Test
                          </button>
                          <button onClick={() => act(test.id,'approve')} disabled={acting===test.id}
                            style={{ padding:'9px 22px', background:'#10c98a', border:'none',
                              borderRadius:8, fontSize:13, fontWeight:700, color:'#040c18',
                              cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                            {acting===test.id
                              ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/>
                              : <CheckCircle size={14}/>}
                            Approve & Publish to Students
                          </button>
                        </div>
                      </div>
                    )}
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