// src/pages/student/Jobs.jsx
import { useState, useEffect } from 'react';
import { jobsAPI, applicationsAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import GlowCard from '../../components/GlowCard';
import { Briefcase, Search, Clock, TrendingUp, Building2, ChevronDown, ChevronUp, CheckCircle, Loader2, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const CYAN='#00c8f0', GREEN='#10c98a', AMBER='#f5a623', RED='#f04b4b', VIOLET='#7c5cfc';

const DEMO_JOBS = [
  { id:'j1', title:'Software Engineer', description:'Join TCS as a Software Engineer. You will work on enterprise applications and client projects across various technologies.', min_cgpa:6.0, eligible_branches:['CSE','IT','ECE'], required_skills:['Java','SQL','Problem Solving'], package_lpa:7.0, job_type:'full-time', deadline:'2024-12-15', drive_date:'2024-12-20', max_backlogs:1, status:'active', companies:{id:'c1',name:'TCS',logo_url:null} },
  { id:'j2', title:'Systems Engineer', description:'Infosys is hiring fresh graduates for the Systems Engineer role. Training provided for 3 months at Mysore campus.', min_cgpa:6.5, eligible_branches:['CSE','IT','ECE','EEE'], required_skills:['C++','Python','Communication'], package_lpa:5.0, job_type:'full-time', deadline:'2024-12-10', drive_date:'2024-12-18', max_backlogs:0, status:'active', companies:{id:'c2',name:'Infosys',logo_url:null} },
  { id:'j3', title:'Software Developer', description:'Wipro is looking for passionate developers to join their Digital Business unit. Work on cutting-edge technology projects.', min_cgpa:7.0, eligible_branches:['CSE','IT'], required_skills:['React.js','Node.js','MongoDB'], package_lpa:8.0, job_type:'full-time', deadline:'2024-12-20', drive_date:'2024-12-28', max_backlogs:0, status:'active', companies:{id:'c3',name:'Wipro',logo_url:null} },
  { id:'j4', title:'Associate Software Engineer', description:'Amazon is hiring for their operations tech team. Strong DSA skills required. 2 coding rounds + HR.', min_cgpa:7.5, eligible_branches:['CSE','IT'], required_skills:['DSA','Python','System Design'], package_lpa:24.0, job_type:'full-time', deadline:'2024-11-30', drive_date:'2024-12-05', max_backlogs:0, status:'active', companies:{id:'c4',name:'Amazon',logo_url:null} },
];

export default function Jobs() {
  const { user }      = useAuth();
  const [jobs,   setJobs]   = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ minPkg:'', branch:'' });
  const [expanded, setExpanded] = useState(null);
  const [applying, setApplying] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      jobsAPI.getAll().catch(()=>({data:{jobs:DEMO_JOBS}})),
      applicationsAPI.getMyApps().catch(()=>({data:{applications:[]}})),
    ]).then(([j,a])=>{
      setJobs(j.data?.jobs||DEMO_JOBS);
      setMyApps((a.data?.applications||[]).map(ap=>ap.job_id));
    }).finally(()=>setLoading(false));
  },[]);

  const apply = async (jobId) => {
    setApplying(jobId);
    try {
      await applicationsAPI.apply(jobId);
      setMyApps(prev=>[...prev,jobId]);
      toast.success('Application submitted!');
    } catch(err){ toast.error(err.response?.data?.error||'Already applied or not eligible'); }
    finally { setApplying(null); }
  };

  const filtered = jobs.filter(j=>{
    if(search && !j.title.toLowerCase().includes(search.toLowerCase()) && !j.companies?.name.toLowerCase().includes(search.toLowerCase())) return false;
    if(filter.minPkg && j.package_lpa < parseFloat(filter.minPkg)) return false;
    return true;
  });

  const applied = (id) => myApps.includes(id);
  const daysLeft = (d) => { const n=Math.ceil((new Date(d)-Date.now())/86400000); return n>0?`${n}d left`:'Closed'; };

  return (
    <div style={{padding:24,maxWidth:1000,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:'#f0f6ff',fontFamily:"'Sora',sans-serif"}}>Job Openings</h1>
          <p style={{margin:'6px 0 0',fontSize:13,color:'#475569'}}>{filtered.length} active opportunities</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'rgba(16,201,138,0.1)',border:'1px solid rgba(16,201,138,0.2)',borderRadius:8}}>
          <CheckCircle size={13} color={GREEN}/>
          <span style={{fontSize:12,fontWeight:700,color:GREEN}}>{myApps.length} Applied</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,background:'#071525',border:'1px solid rgba(0,200,240,0.15)',borderRadius:9,padding:'8px 12px',flex:1,maxWidth:320}}>
          <Search size={15} color="#475569"/>
          <input style={{background:'none',border:'none',outline:'none',fontSize:13,color:'#e2e8f0',flex:1,fontFamily:"'Sora',sans-serif"}} placeholder="Search company or role..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select style={SEL} value={filter.minPkg} onChange={e=>setFilter(f=>({...f,minPkg:e.target.value}))}>
          <option value="">Any Package</option>
          <option value="5">5+ LPA</option>
          <option value="10">10+ LPA</option>
          <option value="20">20+ LPA</option>
        </select>
      </div>

      {/* Job cards */}
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        {filtered.map(job=>{
          const isApplied  = applied(job.id);
          const isExpanded = expanded===job.id;
          const deadlineTxt = daysLeft(job.deadline);
          const isUrgent    = deadlineTxt.includes('d') && parseInt(deadlineTxt)<5;

          return (
            <GlowCard key={job.id} accent={isApplied?GREEN:CYAN}>
              <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
                {/* Logo */}
                <div style={{width:48,height:48,borderRadius:12,background:isApplied?'rgba(16,201,138,0.12)':'rgba(0,200,240,0.1)',border:`1px solid ${isApplied?GREEN:CYAN}33`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Building2 size={20} color={isApplied?GREEN:CYAN}/>
                </div>

                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:6}}>
                    <div>
                      <p style={{margin:'0 0 2px',fontSize:16,fontWeight:700,color:'#e2e8f0'}}>{job.title}</p>
                      <p style={{margin:0,fontSize:13,color:isApplied?GREEN:CYAN,fontWeight:600}}>{job.companies?.name}</p>
                    </div>
                    <div style={{display:'flex',gap:8,flexShrink:0,alignItems:'center'}}>
                      <span style={{fontSize:16,fontWeight:800,color:GREEN,fontFamily:"'Sora',sans-serif"}}>{job.package_lpa} LPA</span>
                      {isApplied && <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',background:'rgba(16,201,138,0.12)',border:'1px solid rgba(16,201,138,0.25)',borderRadius:999,fontSize:11,fontWeight:700,color:GREEN}}><CheckCircle size={11}/>Applied</span>}
                    </div>
                  </div>

                  {/* Tags row */}
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
                    <span style={{...TAG,background:`${isUrgent?RED:AMBER}12`,color:isUrgent?RED:AMBER,border:`1px solid ${isUrgent?RED:AMBER}22`}}><Clock size={10}/>{deadlineTxt}</span>
                    <span style={TAG}>CGPA ≥ {job.min_cgpa}</span>
                    <span style={TAG}>{job.job_type}</span>
                    {job.max_backlogs===0&&<span style={{...TAG,color:'#f04b4b',background:'rgba(240,75,75,0.08)',border:'1px solid rgba(240,75,75,0.15)'}}>No backlogs</span>}
                    <span style={TAG}>{(job.eligible_branches||[]).join(', ')}</span>
                  </div>

                  {/* Expand / collapse */}
                  {isExpanded && (
                    <div style={{marginBottom:12}}>
                      <p style={{margin:'0 0 8px',fontSize:13,color:'#94a3b8',lineHeight:1.7}}>{job.description}</p>
                      <p style={{margin:'0 0 4px',fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.07em'}}>Required Skills</p>
                      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
                        {(job.required_skills||[]).map(sk=><span key={sk} style={{padding:'2px 8px',background:'rgba(0,200,240,0.08)',border:'1px solid rgba(0,200,240,0.2)',borderRadius:6,fontSize:11,color:CYAN,fontWeight:600}}>{sk}</span>)}
                      </div>
                      {job.drive_date && <p style={{margin:0,fontSize:12,color:'#64748b'}}>Drive Date: <strong style={{color:'#e2e8f0'}}>{new Date(job.drive_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</strong></p>}
                    </div>
                  )}

                  <div style={{display:'flex',gap:10,alignItems:'center'}}>
                    <button style={{display:'flex',alignItems:'center',gap:5,background:'none',border:'none',color:CYAN,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'Sora',sans-serif",padding:0}} onClick={()=>setExpanded(isExpanded?null:job.id)}>
                      {isExpanded?<><ChevronUp size={13}/>Less</>:<><ChevronDown size={13}/>Details</>}
                    </button>
                    {!isApplied && (
                      <button style={{marginLeft:'auto',padding:'8px 20px',background:CYAN,color:'#040c18',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:"'Sora',sans-serif",display:'flex',alignItems:'center',gap:6}} onClick={()=>apply(job.id)} disabled={!!applying}>
                        {applying===job.id?<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>:<Briefcase size={13}/>}
                        {applying===job.id?'Applying...':'Apply Now'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </GlowCard>
          );
        })}
        {!filtered.length && !loading && <p style={{textAlign:'center',color:'#334155',padding:'40px 0',fontSize:14}}>No jobs found matching your filters.</p>}
      </div>
    </div>
  );
}
const TAG = {display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,fontSize:11,color:'#64748b',fontWeight:600};
const SEL = {background:'#071525',border:'1px solid rgba(0,200,240,0.12)',borderRadius:9,padding:'8px 12px',fontSize:13,color:'#e2e8f0',outline:'none',fontFamily:"'Sora',sans-serif",cursor:'pointer'};
