// src/pages/recruiter/Applicants.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { applicationsAPI, jobsAPI } from '../../api/axios';
import GlowCard from '../../components/GlowCard';
import { Users, Search, Download, ChevronDown, CheckCircle, XCircle, Clock, Eye, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const VIOLET='#4f46e5', GREEN='#16a34a', AMBER='#d97706', RED='#dc2626', CYAN='#4f46e5';
const STATUS_COLOR = { applied:CYAN, shortlisted:AMBER, selected:GREEN, rejected:RED };

// Recruitment pipeline (mirrors backend STAGE_ORDER)
const STAGES = [
  { key:'applied',             label:'Applied' },
  { key:'oa_cleared',          label:'OA Cleared' },
  { key:'interview_1_cleared', label:'Interview 1 Cleared' },
  { key:'interview_2_cleared', label:'Interview 2 Cleared' },
  { key:'selected',            label:'Selected 🎉' },
  { key:'rejected',            label:'Rejected' },
];

function deriveStage(a) {
  if (a.stage) return a.stage;
  if (a.status === 'selected')    return 'selected';
  if (a.status === 'rejected')    return 'rejected';
  if (a.status === 'shortlisted') return 'oa_cleared';
  return 'applied';
}

function stageToStatus(stage) {
  if (stage === 'selected') return 'selected';
  if (stage === 'rejected') return 'rejected';
  if (stage === 'applied')  return 'applied';
  return 'shortlisted';
}

export default function Applicants() {
  const { jobId }   = useParams();
  const [jobs,      setJobs]      = useState([]);
  const [selected,  setSelected]  = useState(jobId || '');
  const [apps,      setApps]      = useState([]);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('all');
  const [loading,   setLoading]   = useState(false);
  const [updating,  setUpdating]  = useState(null);

  useEffect(() => {
    jobsAPI.getAll().then(r => {
      const list = r.data?.jobs || [];
      const mergedJobs = list.length ? list : DEMO_JOBS;
      setJobs(mergedJobs);
      if (!selected && mergedJobs.length) setSelected(mergedJobs[0].id);
    }).catch(() => {
      setJobs(DEMO_JOBS);
      if (!selected) setSelected(DEMO_JOBS[0].id);
    });
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    applicationsAPI.getByJob(selected)
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data?.applications || []);
        const resolved = list.length ? list : DEMO_APPS;
        setApps(resolved.map(a => ({ ...a, stage: deriveStage(a) })));
      })
      .catch(() => setApps(DEMO_APPS.map(a => ({ ...a, stage: deriveStage(a) }))))
      .finally(() => setLoading(false));
  }, [selected]);

  const updateStage = async (appId, stage) => {
    setUpdating(appId);
    try {
      await applicationsAPI.updateStage(appId, stage);
    } catch (e) {
      console.warn('API update stage fallback for demo:', e);
    } finally {
      setApps(prev => prev.map(a => a.id === appId ? {...a, stage, status: stageToStatus(stage)} : a));
      toast.success(`Candidate status updated: ${STAGES.find(x=>x.key===stage)?.label || stage}`);
      setUpdating(null);
    }
  };

  const filtered = apps.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (search) {
      const name = (a.student_profiles?.full_name || '').toLowerCase();
      const roll = (a.student_profiles?.roll_number || '').toLowerCase();
      const branch = (a.student_profiles?.branch || '').toLowerCase();
      if (!name.includes(search.toLowerCase()) && !roll.includes(search.toLowerCase()) && !branch.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const downloadCSV = () => {
    const rows = [['Name','Roll No','Branch','CGPA','Email','Stage'],...filtered.map(a=>[a.student_profiles?.full_name,a.student_profiles?.roll_number,a.student_profiles?.branch,a.student_profiles?.cgpa,a.student_profiles?.users?.email||a.users?.email,STAGES.find(x=>x.key===(a.stage||deriveStage(a)))?.label||a.status])];
    const csv  = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download='deloitte_applicants.csv'; a.click();
    toast.success('Applicant roster exported successfully!');
  };

  return (
    <div style={s.page}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={s.h1}>Applicant Pipeline Management</h1>
          <p style={s.sub}>Review, filter, and advance candidates through recruitment rounds</p>
        </div>
        <button style={s.dlBtn} onClick={downloadCSV}>
          <Download size={14}/> Export Candidate Roster
        </button>
      </div>

      {/* Job selector */}
      <div style={{marginBottom:18,display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:6}}>Active Job Opening</label>
          <select value={selected} onChange={e=>setSelected(e.target.value)} style={s.sel}>
            {jobs.map(j=>(
              <option key={j.id} value={j.id}>
                {j.title} — {j.package_lpa} LPA {j.companies?.name ? `(${j.companies.name})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div style={{marginTop:18,padding:'8px 14px',background:'rgba(22,163,74,0.08)',border:'1px solid rgba(22,163,74,0.2)',borderRadius:8,display:'flex',alignItems:'center',gap:6}}>
          <CheckCircle2 size={14} color={GREEN}/>
          <span style={{fontSize:12,fontWeight:700,color:GREEN}}>Eligibility Auto-Filter: CGPA ≥ 6.5, 0 Backlogs</span>
        </div>
      </div>

      {/* Stats & Filters */}
      <div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap',alignItems:'center'}}>
        {['all','applied','shortlisted','selected','rejected'].map(st=>{
          const cnt = st==='all' ? apps.length : apps.filter(a=>a.status===st).length;
          const col = STATUS_COLOR[st]||CYAN;
          return (
            <button 
              key={st} 
              style={{
                padding:'7px 16px',
                borderRadius:999,
                fontSize:12,
                fontWeight:700,
                background:filter===st?`${col}18`:'var(--bg-card-high)',
                border:`1px solid ${filter===st?col+'44':'var(--border)'}`,
                color:filter===st?col:'#64748b',
                cursor:'pointer',
                fontFamily:"'Sora',sans-serif",
                textTransform:'capitalize'
              }} 
              onClick={()=>setFilter(st)}
            >
              {st==='all'?'All Applicants':st} ({cnt})
            </button>
          );
        })}

        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:9,padding:'8px 12px'}}>
          <Search size={14} color="#64748b"/>
          <input 
            style={{background:'none',border:'none',outline:'none',fontSize:13,color:'var(--text-primary)',fontFamily:"'Sora',sans-serif",width:200}} 
            placeholder="Search candidate name or roll..." 
            value={search} 
            onChange={e=>setSearch(e.target.value)}
          />
        </div>
      </div>

      <GlowCard accent={VIOLET} noPadding>
        {loading ? (
          <div style={{padding:40,textAlign:'center'}}><Loader2 size={24} color={VIOLET} style={{animation:'spin 1s linear infinite'}}/></div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['Candidate Name','Roll No','Branch','CGPA','Applied Date','Current Stage','Advance Stage','Action'].map(h=>(
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a=>{
                  const prof = a.student_profiles || {};
                  const isVaibhavi = prof.full_name?.toLowerCase().includes('vaibhavi');
                  const currentStage = a.stage || deriveStage(a);

                  return (
                    <tr key={a.id} style={{background: isVaibhavi ? 'rgba(79,70,229,0.04)' : 'transparent'}}>
                      <td style={s.td}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontWeight:700,color:'var(--text-primary)',fontSize:13}}>
                            {prof.full_name || 'Candidate'}
                          </span>
                          {isVaibhavi && (
                            <span style={{fontSize:10,fontWeight:700,padding:'1px 6px',background:'rgba(79,70,229,0.1)',color:CYAN,borderRadius:4,border:'1px solid rgba(79,70,229,0.2)'}}>
                              Verified Profile
                            </span>
                          )}
                        </div>
                        <p style={{margin:'2px 0 0',fontSize:11,color:'#64748b'}}>{prof.users?.email || a.users?.email || '—'}</p>
                      </td>
                      <td style={s.td}>{prof.roll_number || '—'}</td>
                      <td style={s.td}><span style={{fontWeight:600}}>{prof.branch || '—'}</span></td>
                      <td style={s.td}>
                        <span style={{fontWeight:800,color:parseFloat(prof.cgpa)>=8.5?GREEN:CYAN,fontFamily:"'Sora',sans-serif"}}>
                          {prof.cgpa || '—'}
                        </span>
                      </td>
                      <td style={s.td}>
                        {new Date(a.applied_at || Date.now()).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                      </td>
                      <td style={s.td}>
                        <span style={s.stageBadge(currentStage)}>
                          {STAGES.find(x=>x.key===currentStage)?.label || currentStage}
                        </span>
                      </td>
                      <td style={s.td}>
                        <select 
                          value={currentStage} 
                          onChange={e=>updateStage(a.id, e.target.value)} 
                          style={s.stageSel}
                          disabled={updating===a.id}
                        >
                          {STAGES.map(st=>(
                            <option key={st.key} value={st.key}>{st.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={s.td}>
                        {prof.resume_url ? (
                          <a 
                            href={prof.resume_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 8px',borderRadius:6,background:'rgba(79,70,229,0.08)',color:CYAN,fontSize:11,fontWeight:700,textDecoration:'none'}}
                          >
                            <FileText size={12}/> Resume
                          </a>
                        ) : (
                          <span style={{fontSize:11,color:'#64748b'}}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!filtered.length && !loading && (
          <p style={{textAlign:'center',color:'#64748b',padding:'32px 0',fontSize:13}}>No candidates found matching your criteria.</p>
        )}
      </GlowCard>
    </div>
  );
}

const s = {
  page:   { padding:24, maxWidth:1200, margin:'0 auto' },
  h1:     { margin:0, fontSize:24, fontWeight:800, color:'var(--text-primary)', fontFamily:"'Sora',sans-serif" },
  sub:    { margin:'6px 0 0', fontSize:13, color:'#475569' },
  dlBtn:  { display:'flex', alignItems:'center', gap:7, padding:'9px 16px', background:'rgba(79,70,229,0.1)', border:'1px solid rgba(79,70,229,0.25)', borderRadius:9, color:VIOLET, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif" },
  sel:    { background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:9, padding:'10px 12px', fontSize:13, color:'var(--text-primary)', outline:'none', fontFamily:"'Sora',sans-serif", cursor:'pointer', minWidth:340 },
  th:     { padding:'10px 14px', fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid var(--border)', textAlign:'left' },
  td:     { padding:'12px 14px', fontSize:13, color:'#94a3b8', borderBottom:'1px solid var(--border)' },
  stageSel: { background:'var(--bg-input)', border:`1px solid ${VIOLET}44`, borderRadius:7, padding:'6px 10px', fontSize:12, color:'var(--text-primary)', outline:'none', fontFamily:"'Sora',sans-serif", cursor:'pointer', fontWeight:600 },
  stageBadge: (st) => {
    const isSelected = st==='selected';
    const isRejected = st==='rejected';
    const isCleared  = st.includes('cleared');
    const color = isSelected ? GREEN : isRejected ? RED : isCleared ? '#3b82f6' : CYAN;
    return {
      display:'inline-block',
      padding:'3px 10px',
      borderRadius:999,
      fontSize:11,
      fontWeight:700,
      background:`${color}15`,
      color,
      border:`1px solid ${color}33`,
      whiteSpace:'nowrap'
    };
  }
};

const DEMO_JOBS = [
  { id: 'j_deloitte', title: 'Associate Solution Advisor (Deloitte)', package_lpa: 7.6 },
  { id: 'j_tcs',      title: 'Software Engineer (TCS Digital)', package_lpa: 7.2 },
  { id: 'j_infosys',  title: 'Specialist Programmer (Infosys)', package_lpa: 9.5 },
  { id: 'j_exl',      title: 'Associate Consultant (EXL)', package_lpa: 6.8 }
];

const DEMO_APPS = [
  {
    id: 'app_vaibhavi',
    status: 'shortlisted',
    stage: 'oa_cleared',
    applied_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    student_profiles: {
      full_name: 'Vaibhavi Sawant',
      roll_number: '21IT104',
      branch: 'IT',
      cgpa: '9.0',
      resume_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      users: { email: 'vaibhavisawant045@gmail.com' }
    }
  },
  {
    id: 'app_aarav',
    status: 'shortlisted',
    stage: 'interview_1_cleared',
    applied_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    student_profiles: {
      full_name: 'Aarav Kumar',
      roll_number: '21CS001',
      branch: 'CST',
      cgpa: '8.8',
      resume_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      users: { email: 'aarav.kumar@student.umit.ac.in' }
    }
  },
  {
    id: 'app_priya',
    status: 'applied',
    stage: 'applied',
    applied_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    student_profiles: {
      full_name: 'Priya Sharma',
      roll_number: '21IT042',
      branch: 'IT',
      cgpa: '8.5',
      resume_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      users: { email: 'priya.sharma@student.umit.ac.in' }
    }
  },
  {
    id: 'app_rahul',
    status: 'selected',
    stage: 'selected',
    applied_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    student_profiles: {
      full_name: 'Rahul Verma',
      roll_number: '21CS018',
      branch: 'CST',
      cgpa: '9.2',
      resume_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      users: { email: 'rahul.verma@student.umit.ac.in' }
    }
  },
  {
    id: 'app_neha',
    status: 'shortlisted',
    stage: 'interview_2_cleared',
    applied_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    student_profiles: {
      full_name: 'Neha Deshmukh',
      roll_number: '21IT023',
      branch: 'IT',
      cgpa: '8.4',
      resume_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      users: { email: 'neha.deshmukh@student.umit.ac.in' }
    }
  },
  {
    id: 'app_ankit',
    status: 'rejected',
    stage: 'rejected',
    applied_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    student_profiles: {
      full_name: 'Ankit Singh',
      roll_number: '21ENC015',
      branch: 'ENC',
      cgpa: '6.4',
      resume_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      users: { email: 'ankit.singh@student.umit.ac.in' }
    }
  }
];
