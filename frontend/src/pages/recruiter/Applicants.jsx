// src/pages/recruiter/Applicants.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { applicationsAPI, jobsAPI } from '../../api/axios';
import GlowCard from '../../components/GlowCard';
import { Users, Search, Download, ChevronDown, CheckCircle, XCircle, Clock, Eye, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const VIOLET='#7c5cfc', GREEN='#10c98a', AMBER='#f5a623', RED='#f04b4b', CYAN='#00c8f0';
const STATUS_COLOR = { applied:CYAN, shortlisted:AMBER, selected:GREEN, rejected:RED };

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
      setJobs(list);
      if (!selected && list.length) setSelected(list[0].id);
    }).catch(() => setJobs(DEMO_JOBS));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    applicationsAPI.getByJob(selected)
      .then(r => setApps(r.data?.applications || DEMO_APPS))
      .catch(() => setApps(DEMO_APPS))
      .finally(() => setLoading(false));
  }, [selected]);

  const updateStatus = async (appId, status) => {
    setUpdating(appId);
    try {
      await applicationsAPI.updateStatus(appId, status);
      setApps(prev => prev.map(a => a.id === appId ? {...a, status} : a));
      toast.success(`Marked as ${status}`);
    } catch { toast.error('Update failed'); }
    finally { setUpdating(null); }
  };

  const filtered = apps.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (search) {
      const name = (a.student_profiles?.full_name || '').toLowerCase();
      const roll = (a.student_profiles?.roll_number || '').toLowerCase();
      if (!name.includes(search.toLowerCase()) && !roll.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const downloadCSV = () => {
    const rows = [['Name','Roll No','Branch','CGPA','Email','Status'],...filtered.map(a=>[a.student_profiles?.full_name,a.student_profiles?.roll_number,a.student_profiles?.branch,a.student_profiles?.cgpa,a.users?.email,a.status])];
    const csv  = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download='applicants.csv'; a.click();
  };

  return (
    <div style={s.page}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div><h1 style={s.h1}>Applicants</h1><p style={s.sub}>Review and shortlist candidates</p></div>
        <button style={s.dlBtn} onClick={downloadCSV}><Download size={14}/> Export CSV</button>
      </div>

      {/* Job selector */}
      <div style={{marginBottom:16}}>
        <label style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:8}}>Select Job</label>
        <select value={selected} onChange={e=>setSelected(e.target.value)} style={s.sel}>
          {jobs.map(j=><option key={j.id} value={j.id}>{j.title} — {j.package_lpa} LPA</option>)}
        </select>
      </div>

      {/* Stats */}
      <div style={{display:'flex',gap:10,marginBottom:16}}>
        {['all','applied','shortlisted','selected','rejected'].map(st=>{
          const cnt = st==='all' ? apps.length : apps.filter(a=>a.status===st).length;
          const col = STATUS_COLOR[st]||CYAN;
          return <button key={st} style={{padding:'6px 14px',borderRadius:999,fontSize:12,fontWeight:700,background:filter===st?`${col}18`:'rgba(255,255,255,0.04)',border:`1px solid ${filter===st?col+'44':'rgba(255,255,255,0.08)'}`,color:filter===st?col:'#64748b',cursor:'pointer',fontFamily:"'Sora',sans-serif",textTransform:'capitalize'}} onClick={()=>setFilter(st)}>
            {st==='all'?'All':st} ({cnt})
          </button>;
        })}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,background:'#071525',border:'1px solid rgba(255,255,255,0.08)',borderRadius:9,padding:'6px 12px'}}>
          <Search size={13} color="#475569"/>
          <input style={{background:'none',border:'none',outline:'none',fontSize:13,color:'#e2e8f0',fontFamily:"'Sora',sans-serif",width:180}} placeholder="Search by name or roll..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      <GlowCard accent={VIOLET} noPadding>
        {loading
          ? <div style={{padding:40,textAlign:'center'}}><Loader2 size={24} color={VIOLET} style={{animation:'spin 1s linear infinite'}}/></div>
          : <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>{['Student','Roll No','Branch','CGPA','Applied','Status','Action'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(a=>(
                  <tr key={a.id}>
                    <td style={s.td}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:32,height:32,borderRadius:8,background:`${VIOLET}18`,border:`1px solid ${VIOLET}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:VIOLET,flexShrink:0}}>
                          {(a.student_profiles?.full_name||'S')[0].toUpperCase()}
                        </div>
                        <div>
                          <p style={{margin:0,fontSize:13,fontWeight:600,color:'#e2e8f0'}}>{a.student_profiles?.full_name||'—'}</p>
                          <p style={{margin:'1px 0 0',fontSize:11,color:'#475569'}}>{a.users?.email||'—'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={s.td}>{a.student_profiles?.roll_number||'—'}</td>
                    <td style={s.td}>{a.student_profiles?.branch||'—'}</td>
                    <td style={s.td}><span style={{color:parseFloat(a.student_profiles?.cgpa)>=7.5?GREEN:AMBER,fontWeight:700}}>{a.student_profiles?.cgpa||'—'}</span></td>
                    <td style={s.td}>{new Date(a.applied_at||Date.now()).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
                    <td style={s.td}><span style={{padding:'2px 10px',borderRadius:999,fontSize:11,fontWeight:700,background:`${STATUS_COLOR[a.status]||CYAN}18`,color:STATUS_COLOR[a.status]||CYAN,border:`1px solid ${STATUS_COLOR[a.status]||CYAN}33`,textTransform:'capitalize'}}>{a.status}</span></td>
                    <td style={s.td}>
                      {updating===a.id
                        ? <Loader2 size={14} color={VIOLET} style={{animation:'spin 1s linear infinite'}}/>
                        : <div style={{display:'flex',gap:5}}>
                            {a.status!=='selected'   && <button style={s.actBtn(GREEN)}   onClick={()=>updateStatus(a.id,'shortlisted')}>Shortlist</button>}
                            {a.status==='shortlisted' && <button style={s.actBtn(GREEN)}   onClick={()=>updateStatus(a.id,'selected')}>Select</button>}
                            {a.status!=='rejected'   && <button style={s.actBtn(RED)}     onClick={()=>updateStatus(a.id,'rejected')}>Reject</button>}
                          </div>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
        {!loading && !filtered.length && <p style={{textAlign:'center',color:'#334155',padding:'40px 0',fontSize:13}}>No applicants found.</p>}
      </GlowCard>
    </div>
  );
}

const s = {
  page:   { padding:24, maxWidth:1200, margin:'0 auto' },
  h1:     { margin:0, fontSize:24, fontWeight:800, color:'#f0f6ff', fontFamily:"'Sora',sans-serif" },
  sub:    { margin:'6px 0 0', fontSize:13, color:'#475569' },
  dlBtn:  { display:'flex', alignItems:'center', gap:7, padding:'9px 16px', background:'rgba(124,92,252,0.1)', border:'1px solid rgba(124,92,252,0.25)', borderRadius:9, color:VIOLET, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif" },
  sel:    { background:'#071525', border:'1px solid rgba(124,92,252,0.15)', borderRadius:9, padding:'10px 12px', fontSize:13, color:'#e2e8f0', outline:'none', fontFamily:"'Sora',sans-serif", cursor:'pointer', minWidth:300 },
  th:     { padding:'10px 14px', fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid rgba(255,255,255,0.05)', textAlign:'left' },
  td:     { padding:'12px 14px', fontSize:13, color:'#94a3b8', borderBottom:'1px solid rgba(255,255,255,0.03)' },
  actBtn: (c) => ({ padding:'4px 10px', background:`${c}15`, border:`1px solid ${c}33`, borderRadius:6, fontSize:11, fontWeight:700, color:c, cursor:'pointer', fontFamily:"'Sora',sans-serif" }),
};

const DEMO_JOBS = [{id:'j1',title:'Software Engineer',package_lpa:7},{id:'j2',title:'Frontend Developer',package_lpa:9}];
const DEMO_APPS = [
  {id:'a1',status:'applied',    applied_at:new Date().toISOString(), student_profiles:{full_name:'Aarav Kumar',roll_number:'21CS001',branch:'CSE',cgpa:'8.5'}, users:{email:'aarav@demo.com'}},
  {id:'a2',status:'shortlisted',applied_at:new Date().toISOString(), student_profiles:{full_name:'Priya Sharma',roll_number:'21CS042',branch:'IT', cgpa:'7.8'}, users:{email:'priya@demo.com'}},
  {id:'a3',status:'selected',   applied_at:new Date().toISOString(), student_profiles:{full_name:'Rahul Verma', roll_number:'21CS018',branch:'CSE',cgpa:'9.1'}, users:{email:'rahul@demo.com'}},
  {id:'a4',status:'rejected',   applied_at:new Date().toISOString(), student_profiles:{full_name:'Ankit Singh', roll_number:'21IT005',branch:'IT', cgpa:'6.2'}, users:{email:'ankit@demo.com'}},
];
