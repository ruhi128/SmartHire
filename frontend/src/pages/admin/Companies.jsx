// src/pages/admin/Companies.jsx
import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/axios';
import GlowCard from '../../components/GlowCard';
import { Building2, Search, Plus, Users, Calendar, TrendingUp } from 'lucide-react';

const AMBER='#f5a623', GREEN='#10c98a', CYAN='#00c8f0', VIOLET='#7c5cfc';

const DEMO_COMPANIES = [
  { id:'c1', name:'TCS',      industry:'IT Services',    total_drives:3, total_hired:45, avg_package:7.5,  status:'active',  last_drive:'Dec 2024' },
  { id:'c2', name:'Infosys',  industry:'IT Services',    total_drives:2, total_hired:38, avg_package:5.5,  status:'active',  last_drive:'Dec 2024' },
  { id:'c3', name:'Wipro',    industry:'IT Services',    total_drives:2, total_hired:29, avg_package:9.0,  status:'active',  last_drive:'Dec 2024' },
  { id:'c4', name:'Amazon',   industry:'E-Commerce',     total_drives:1, total_hired:12, avg_package:24.0, status:'active',  last_drive:'Jan 2025' },
  { id:'c5', name:'Accenture',industry:'Consulting',     total_drives:2, total_hired:22, avg_package:6.5,  status:'active',  last_drive:'Jan 2025' },
  { id:'c6', name:'Deloitte', industry:'Consulting',     total_drives:1, total_hired:15, avg_package:8.0,  status:'active',  last_drive:'Feb 2025' },
  { id:'c7', name:'Google',   industry:'Tech',           total_drives:1, total_hired:3,  avg_package:42.0, status:'pending', last_drive:'—' },
  { id:'c8', name:'Microsoft',industry:'Tech',           total_drives:1, total_hired:5,  avg_package:35.0, status:'active',  last_drive:'Nov 2024' },
];

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    adminAPI.getCompanies()
      .then(r => setCompanies(r.data?.companies?.length ? r.data.companies : DEMO_COMPANIES))
      .catch(() => setCompanies(DEMO_COMPANIES))
      .finally(() => setLoading(false));
  }, []);

  const filtered = companies.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.industry?.toLowerCase().includes(search.toLowerCase())
  );

  const totalHired  = companies.reduce((s,c) => s + (c.total_hired||0), 0);
  const avgPackage  = companies.length ? (companies.reduce((s,c) => s + (c.avg_package||0), 0) / companies.length).toFixed(1) : 0;

  return (
    <div style={s.page}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div><h1 style={s.h1}>Companies</h1><p style={s.sub}>{companies.length} companies in placement pool</p></div>
      </div>

      {/* Summary chips */}
      <div style={{display:'flex',gap:12,marginBottom:20}}>
        {[{icon:Building2,label:'Companies',val:companies.length,color:VIOLET},{icon:Users,label:'Total Hired',val:totalHired,color:GREEN},{icon:TrendingUp,label:'Avg Package',val:`${avgPackage} LPA`,color:AMBER}].map(item=>(
          <div key={item.label} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 18px',background:`${item.color}0a`,border:`1px solid ${item.color}20`,borderRadius:12}}>
            <item.icon size={18} color={item.color}/>
            <div>
              <p style={{margin:0,fontSize:18,fontWeight:800,color:item.color,fontFamily:"'Sora',sans-serif",lineHeight:1}}>{item.val}</p>
              <p style={{margin:'2px 0 0',fontSize:11,color:'#475569'}}>{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{display:'flex',alignItems:'center',gap:8,background:'#071525',border:'1px solid rgba(255,255,255,0.08)',borderRadius:9,padding:'9px 12px',maxWidth:340,marginBottom:16}}>
        <Search size={13} color="#475569"/>
        <input style={{background:'none',border:'none',outline:'none',fontSize:13,color:'#e2e8f0',flex:1,fontFamily:"'Sora',sans-serif"}} placeholder="Search company or industry..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
        {filtered.map(company=>(
          <GlowCard key={company.id} accent={VIOLET} hoverable>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:44,height:44,borderRadius:12,background:`${VIOLET}18`,border:`1px solid ${VIOLET}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:VIOLET,fontFamily:"'Sora',sans-serif"}}>
                  {company.name[0]}
                </div>
                <div>
                  <p style={{margin:0,fontSize:15,fontWeight:700,color:'#e2e8f0'}}>{company.name}</p>
                  <p style={{margin:'2px 0 0',fontSize:11,color:'#475569'}}>{company.industry}</p>
                </div>
              </div>
              <span style={{padding:'2px 9px',borderRadius:999,fontSize:10,fontWeight:700,background:company.status==='active'?'rgba(16,201,138,0.12)':'rgba(245,166,35,0.12)',color:company.status==='active'?GREEN:AMBER,border:`1px solid ${company.status==='active'?GREEN:AMBER}22`}}>
                {company.status}
              </span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {[{label:'Drives',val:company.total_drives||0},{label:'Hired',val:company.total_hired||0},{label:'Avg Pkg',val:`${company.avg_package||0} L`}].map(m=>(
                <div key={m.label} style={{textAlign:'center',padding:'8px',background:'rgba(255,255,255,0.02)',borderRadius:8}}>
                  <p style={{margin:0,fontSize:16,fontWeight:800,color:'#e2e8f0',fontFamily:"'Sora',sans-serif"}}>{m.val}</p>
                  <p style={{margin:'2px 0 0',fontSize:10,color:'#475569'}}>{m.label}</p>
                </div>
              ))}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5,marginTop:12,paddingTop:10,borderTop:'1px solid rgba(255,255,255,0.05)'}}>
              <Calendar size={11} color="#475569"/>
              <span style={{fontSize:11,color:'#475569'}}>Last drive: {company.last_drive||'—'}</span>
            </div>
          </GlowCard>
        ))}
      </div>
    </div>
  );
}

const s = {
  page: { padding:24, maxWidth:1200, margin:'0 auto' },
  h1:   { margin:0, fontSize:24, fontWeight:800, color:'#f0f6ff', fontFamily:"'Sora',sans-serif" },
  sub:  { margin:'6px 0 0', fontSize:13, color:'#475569' },
};
