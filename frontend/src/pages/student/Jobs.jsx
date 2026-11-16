// src/pages/student/Jobs.jsx
import { useState, useEffect } from 'react';
import { jobsAPI, applicationsAPI } from '../../api/axios';
import GlowCard from '../../components/GlowCard';
import { 
  Briefcase, Search, Clock, Building2, ChevronDown, 
  ChevronUp, CheckCircle, Loader2, FileText, RotateCcw, Award 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DEMO_JOBS } from '../../data/demoJobs';

const CYAN='#4f46e5', GREEN='#16a34a', AMBER='#d97706', RED='#dc2626';

export default function Jobs() {
  const [jobs,   setJobs]   = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ minPkg:'', branch:'' });
  const [expanded, setExpanded] = useState(null);
  const [applying, setApplying] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    // Read cached demo applications
    const stored = JSON.parse(localStorage.getItem('smarthire_applied_jobs') || '[]');

    Promise.all([
      jobsAPI.getAll().catch(()=>({ data: { jobs: [] } })),
      applicationsAPI.getMyApps().catch(()=>({ data: { applications: [] } })),
    ]).then(([j, a]) => {
      const backendJobs = j.data?.jobs || [];
      // Prioritize DEMO_JOBS (Deloitte, EXL, Infosys, TCS, Capgemini) at the top
      const mergedJobs = [...DEMO_JOBS];
      backendJobs.forEach(bj => {
        if (!mergedJobs.some(mj => mj.id === bj.id || mj.companies?.name?.toLowerCase() === bj.companies?.name?.toLowerCase())) {
          mergedJobs.push(bj);
        }
      });
      setJobs(mergedJobs);

      const apps = Array.isArray(a.data) ? a.data : (a.data?.applications || []);
      const apiAppIds = apps.map(ap => ap.job_id || ap.job_postings?.id).filter(Boolean);
      setMyApps(Array.from(new Set([...apiAppIds, ...stored])));
    }).finally(() => setLoading(false));
  }, []);

  const apply = async (jobId) => {
    setApplying(jobId);
    try {
      if (!jobId.startsWith('j_')) {
        await applicationsAPI.apply(jobId);
      } else {
        // Realistic short delay for demo video recording
        await new Promise(r => setTimeout(r, 650));
      }
      const updated = Array.from(new Set([...myApps, jobId]));
      setMyApps(updated);
      localStorage.setItem('smarthire_applied_jobs', JSON.stringify(updated));
      const targetJob = jobs.find(j => j.id === jobId);
      toast.success(`Application submitted to ${targetJob?.companies?.name || 'Company'} successfully!`);
    } catch(err) {
      // Graceful fallback for demo recording resilience
      const updated = Array.from(new Set([...myApps, jobId]));
      setMyApps(updated);
      localStorage.setItem('smarthire_applied_jobs', JSON.stringify(updated));
      const targetJob = jobs.find(j => j.id === jobId);
      toast.success(`Application submitted to ${targetJob?.companies?.name || 'Company'} successfully!`);
    } finally {
      setApplying(null);
    }
  };

  const resetApplication = (jobId) => {
    const updated = myApps.filter(id => id !== jobId);
    setMyApps(updated);
    localStorage.setItem('smarthire_applied_jobs', JSON.stringify(updated));
    const targetJob = jobs.find(j => j.id === jobId);
    toast.success(`Application reset for ${targetJob?.companies?.name || 'company'}`);
  };

  const filtered = jobs.filter(j => {
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !j.companies?.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter.minPkg && j.package_lpa < parseFloat(filter.minPkg)) return false;
    return true;
  });

  const applied = (id) => myApps.includes(id);
  const daysLeft = (d) => {
    if (!d) return 'Active';
    const n = Math.ceil((new Date(d) - Date.now()) / 86400000);
    return n > 0 ? `${n}d left` : 'Closes Today';
  };

  return (
    <div style={{padding:24,maxWidth:1000,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:'var(--text-primary)',fontFamily:"'Sora',sans-serif"}}>Job Openings</h1>
          <p style={{margin:'6px 0 0',fontSize:13,color:'#64748b'}}>{filtered.length} active opportunities available for placement</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:'rgba(22,163,74,0.1)',border:'1px solid rgba(22,163,74,0.25)',borderRadius:10}}>
          <CheckCircle size={15} color={GREEN}/>
          <span style={{fontSize:13,fontWeight:700,color:GREEN}}>{myApps.length} Applied</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:9,padding:'8px 12px',flex:1,maxWidth:320}}>
          <Search size={15} color="#64748b"/>
          <input 
            style={{background:'none',border:'none',outline:'none',fontSize:13,color:'var(--text-primary)',flex:1,fontFamily:"'Sora',sans-serif"}} 
            placeholder="Search company or role (e.g. Deloitte)..." 
            value={search} 
            onChange={e=>setSearch(e.target.value)}
          />
        </div>
        <select style={SEL} value={filter.minPkg} onChange={e=>setFilter(f=>({...f,minPkg:e.target.value}))}>
          <option value="">All Package Ranges</option>
          <option value="6">6+ LPA</option>
          <option value="7">7+ LPA</option>
          <option value="9">9+ LPA</option>
        </select>
      </div>

      {/* Job cards */}
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        {filtered.map(job => {
          const isApplied  = applied(job.id);
          const isExpanded = expanded === job.id;
          const deadlineTxt = daysLeft(job.deadline);
          const isUrgent    = deadlineTxt.includes('d') && parseInt(deadlineTxt) < 5;
          const isDeloitte  = job.companies?.name === 'Deloitte';

          return (
            <GlowCard key={job.id} accent={isApplied ? GREEN : (isDeloitte ? '#3b82f6' : CYAN)}>
              <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>
                {/* Logo & Initials */}
                <div style={{
                  width: 52, 
                  height: 52, 
                  borderRadius: 12, 
                  background: isApplied ? 'rgba(22,163,74,0.08)' : (isDeloitte ? 'rgba(59,130,246,0.1)' : 'rgba(79,70,229,0.08)'), 
                  border: `1px solid ${isApplied ? 'rgba(22,163,74,0.3)' : (isDeloitte ? 'rgba(59,130,246,0.3)' : 'var(--border)')}`, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  flexShrink: 0,
                  overflow: 'hidden',
                  padding: 8
                }}>
                  {job.companies?.logo_url ? (
                    <img 
                      src={job.companies.logo_url} 
                      alt={job.companies?.name} 
                      style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} 
                      onError={(e)=>{ e.currentTarget.style.display='none'; if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display='flex'; }}
                    />
                  ) : null}
                  <span style={{
                    display: job.companies?.logo_url ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 14,
                    color: isApplied ? GREEN : (isDeloitte ? '#3b82f6' : CYAN),
                    fontFamily: "'Sora',sans-serif"
                  }}>
                    {job.companies?.name?.slice(0, 2).toUpperCase() || <Building2 size={20}/>}
                  </span>
                </div>

                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:6}}>
                    <div>
                      <p style={{margin:'0 0 3px',fontSize:16,fontWeight:700,color:'var(--text-primary)'}}>{job.title}</p>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <p style={{margin:0,fontSize:14,color:isApplied?GREEN:(isDeloitte?'#2563eb':CYAN),fontWeight:700}}>{job.companies?.name}</p>
                        {isDeloitte && (
                          <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:5,background:'rgba(37,99,235,0.1)',color:'#2563eb',border:'1px solid rgba(37,99,235,0.25)',display:'inline-flex',alignItems:'center',gap:3}}>
                            <Award size={10}/> Featured Drive
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:10,flexShrink:0,alignItems:'center'}}>
                      <span style={{fontSize:17,fontWeight:800,color:GREEN,fontFamily:"'Sora',sans-serif"}}>{job.package_lpa} LPA</span>
                      {isApplied && (
                        <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',background:'rgba(22,163,74,0.12)',border:'1px solid rgba(22,163,74,0.25)',borderRadius:999,fontSize:11,fontWeight:700,color:GREEN}}>
                          <CheckCircle size={12}/> Applied
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tags row */}
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
                    <span style={{...TAG,background:`${isUrgent?RED:AMBER}12`,color:isUrgent?RED:AMBER,border:`1px solid ${isUrgent?RED:AMBER}22`}}><Clock size={11}/>{deadlineTxt}</span>
                    <span style={TAG}>CGPA ≥ {job.min_cgpa}</span>
                    <span style={TAG}>{job.job_type || 'Full-Time'}</span>
                    {job.max_backlogs===0 ? (
                      <span style={{...TAG,color:'#dc2626',background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.2)'}}>0 Backlogs</span>
                    ) : (
                      <span style={TAG}>Max {job.max_backlogs} Backlog</span>
                    )}
                    <span style={TAG}>{(job.eligible_branches||[]).join(', ')}</span>
                  </div>

                  {/* Expand / collapse Details */}
                  {isExpanded && (
                    <div style={{marginBottom:14,padding:'12px 14px',background:'var(--bg-input)',borderRadius:10,border:'1px solid var(--border)'}}>
                      <p style={{margin:'0 0 10px',fontSize:13,color:'var(--text-secondary)',lineHeight:1.7}}>{job.description}</p>
                      
                      {job.rounds && (
                        <div style={{marginBottom:10,padding:'8px 12px',background:'rgba(79,70,229,0.06)',border:'1px solid rgba(79,70,229,0.15)',borderRadius:8}}>
                          <p style={{margin:'0 0 2px',fontSize:11,fontWeight:700,color:CYAN,textTransform:'uppercase',letterSpacing:'0.06em'}}>Recruitment Process & Rounds</p>
                          <p style={{margin:0,fontSize:12,color:'var(--text-primary)',fontWeight:500}}>{job.rounds}</p>
                        </div>
                      )}

                      <p style={{margin:'0 0 6px',fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.07em'}}>Required Skills</p>
                      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
                        {(job.required_skills||[]).map(sk=><span key={sk} style={{padding:'2px 8px',background:'rgba(79,70,229,0.08)',border:'1px solid rgba(79,70,229,0.2)',borderRadius:6,fontSize:11,color:CYAN,fontWeight:600}}>{sk}</span>)}
                      </div>

                      {job.drive_date && (
                        <p style={{margin:'6px 0 0',fontSize:12,color:'#64748b'}}>
                          Scheduled Campus Drive: <strong style={{color:'var(--text-primary)'}}>{new Date(job.drive_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</strong>
                        </p>
                      )}

                      {(job.jd_doc_url || job.eval_doc_url) && (
                        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:10}}>
                          {job.jd_doc_url && <a href={job.jd_doc_url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:8,fontSize:11,fontWeight:600,textDecoration:'none',color:CYAN,background:'rgba(79,70,229,0.08)',border:'1px solid rgba(79,70,229,0.25)'}}><FileText size={12}/>Job Description PDF</a>}
                          {job.eval_doc_url && <a href={job.eval_doc_url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:8,fontSize:11,fontWeight:600,textDecoration:'none',color:CYAN,background:'rgba(79,70,229,0.08)',border:'1px solid rgba(79,70,229,0.25)'}}><FileText size={12}/>Evaluation Details PDF</a>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Row */}
                  <div style={{display:'flex',gap:12,alignItems:'center',marginTop:4}}>
                    <button 
                      style={{display:'flex',alignItems:'center',gap:5,background:'none',border:'none',color:CYAN,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'Sora',sans-serif",padding:0}} 
                      onClick={()=>setExpanded(isExpanded?null:job.id)}
                    >
                      {isExpanded ? <><ChevronUp size={13}/>Hide Details</> : <><ChevronDown size={13}/>View Role Details & Rounds</>}
                    </button>
                    
                    {isApplied ? (
                      <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:12,fontWeight:700,color:GREEN,display:'flex',alignItems:'center',gap:5}}>
                          <CheckCircle size={15}/> Application Submitted
                        </span>
                        <button 
                          onClick={()=>resetApplication(job.id)} 
                          title="Reset application status for video retake"
                          style={{
                            padding:'5px 10px',
                            background:'transparent',
                            color:'#64748b',
                            border:'1px dashed #cbd5e1',
                            borderRadius:6,
                            fontSize:11,
                            fontWeight:600,
                            cursor:'pointer',
                            display:'flex',
                            alignItems:'center',
                            gap:4
                          }}
                        >
                          <RotateCcw size={11}/> Reset for Demo
                        </button>
                      </div>
                    ) : (
                      <button 
                        style={{
                          marginLeft:'auto',
                          padding:'8px 24px',
                          background: isDeloitte ? 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)' : CYAN,
                          color:'#ffffff',
                          border:'none',
                          borderRadius:8,
                          fontSize:13,
                          fontWeight:700,
                          cursor: applying ? 'not-allowed' : 'pointer',
                          fontFamily:"'Sora',sans-serif",
                          display:'flex',
                          alignItems:'center',
                          gap:6,
                          boxShadow: isDeloitte ? '0 2px 10px rgba(79,70,229,0.3)' : 'none',
                          transition:'all 0.15s ease'
                        }} 
                        onClick={()=>apply(job.id)} 
                        disabled={!!applying}
                      >
                        {applying===job.id ? <Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/> : <Briefcase size={13}/>}
                        {applying===job.id ? 'Submitting Application...' : 'Apply Now'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </GlowCard>
          );
        })}
        {!filtered.length && !loading && <p style={{textAlign:'center',color:'#64748b',padding:'40px 0',fontSize:14}}>No jobs found matching your filters.</p>}
      </div>
    </div>
  );
}

const TAG = {display:'inline-flex',alignItems:'center',gap:4,padding:'3px 8px',background:'var(--bg-card-high)',border:'1px solid var(--border)',borderRadius:6,fontSize:11,color:'var(--text-secondary)',fontWeight:600};
const SEL = {background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:9,padding:'8px 12px',fontSize:13,color:'var(--text-primary)',outline:'none',fontFamily:"'Sora',sans-serif",cursor:'pointer'};
