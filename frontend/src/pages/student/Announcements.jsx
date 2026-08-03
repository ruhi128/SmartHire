// src/pages/student/Announcements.jsx
import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/axios';
import { subscribeToAnnouncements } from '../../supabaseClient';
import GlowCard from '../../components/GlowCard';
import { Megaphone, Bell, AlertTriangle, Info, CheckCircle, Building2, Clock } from 'lucide-react';

const PRIORITY = {
  urgent:  { color:'#dc2626', icon:AlertTriangle,  label:'Urgent'      },
  warning: { color:'#d97706', icon:AlertTriangle,   label:'Important'   },
  success: { color:'#16a34a', icon:CheckCircle,      label:'Good News'  },
  info:    { color:'#4f46e5', icon:Info,             label:'Information' },
};

const DEMO = [
  { id:'a1', title:'TCS NQT Drive – Registration Open!', content:'TCS is visiting our campus on Dec 15, 2024. Eligible students: All branches with CGPA >= 6.0, no active backlogs. Register on the portal before Dec 10.', priority:'urgent', created_at:new Date().toISOString(), companies:{name:'TCS'} },
  { id:'a2', title:'Infosys InfyTQ Certification', content:'Complete the InfyTQ certification to be eligible for the Infosys placement drive in January 2025. The exam is free. Link will be shared on WhatsApp group.', priority:'warning', created_at:new Date(Date.now()-86400000).toISOString(), companies:{name:'Infosys'} },
  { id:'a3', title:'Resume Submission Deadline Extended', content:'The deadline to submit your updated resume to the T&P cell has been extended to November 30. Please ensure your resume is ATS-friendly.', priority:'info', created_at:new Date(Date.now()-172800000).toISOString(), companies:null },
  { id:'a4', title:'Students Placed at Wipro', content:'Congratulations to 23 students who have been placed at Wipro through the recent drive. Offer letters will be distributed this week.', priority:'success', created_at:new Date(Date.now()-259200000).toISOString(), companies:{name:'Wipro'} },
];

export default function Announcements() {
  const [items,   setItems]   = useState(DEMO);
  const [filter,  setFilter]  = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getAnnouncements()
      .then(r => setItems(r.data?.announcements?.length ? r.data.announcements : DEMO))
      .catch(()=> setItems(DEMO))
      .finally(()=>setLoading(false));

    // Real-time updates (skip admin-only types like OA pending-approval notices)
    const sub = subscribeToAnnouncements(newItem => {
      if (newItem?.type === 'oa_pending') return;
      setItems(prev => [newItem, ...prev]);
    });
    return () => sub.unsubscribe?.();
  }, []);

  const filtered = filter==='all' ? items : items.filter(i=>i.priority===filter);

  return (
    <div style={{padding:24,maxWidth:900,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div><h1 style={{margin:0,fontSize:24,fontWeight:800,color:'var(--text-primary)',fontFamily:"'Sora',sans-serif"}}>Announcements</h1><p style={{margin:'6px 0 0',fontSize:13,color:'#475569'}}>Latest placement notices and company updates</p></div>
        <div style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8}}>
          <Bell size={13} color='#dc2626'/>
          <span style={{fontSize:12,fontWeight:700,color:'#dc2626'}}>{items.filter(i=>i.priority==='urgent').length} Urgent</span>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{display:'flex',gap:8,marginBottom:20}}>
        {['all','urgent','warning','success','info'].map(f=>(
          <button key={f} style={{padding:'5px 14px',borderRadius:999,fontSize:12,fontWeight:700,background:filter===f?(PRIORITY[f]||{color:'#4f46e5'}).color+'22':'var(--bg-card-high)',border:`1px solid ${filter===f?(PRIORITY[f]||{color:'#4f46e5'}).color+'44':'var(--border)'}`,color:filter===f?(PRIORITY[f]||{color:'#4f46e5'}).color:'#64748b',cursor:'pointer',fontFamily:"'Sora',sans-serif",textTransform:'capitalize'}} onClick={()=>setFilter(f)}>{f==='all'?'All':PRIORITY[f]?.label}</button>
        ))}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        {filtered.map(item=>{
          const cfg = PRIORITY[item.priority]||PRIORITY.info;
          const Icon = cfg.icon;
          const age  = getAge(item.created_at);
          return (
            <GlowCard key={item.id} accent={cfg.color}>
              <div style={{display:'flex',gap:14}}>
                <div style={{width:40,height:40,borderRadius:10,background:`${cfg.color}18`,border:`1px solid ${cfg.color}33`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Icon size={18} color={cfg.color}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:6}}>
                    <p style={{margin:0,fontSize:15,fontWeight:700,color:'var(--text-primary)',lineHeight:1.4}}>{item.title}</p>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                      <span style={{padding:'2px 8px',borderRadius:999,fontSize:10,fontWeight:700,background:`${cfg.color}18`,color:cfg.color,border:`1px solid ${cfg.color}33`}}>{cfg.label}</span>
                      <span style={{fontSize:11,color:'#475569',display:'flex',alignItems:'center',gap:3,whiteSpace:'nowrap'}}><Clock size={11}/>{age}</span>
                    </div>
                  </div>
                  <p style={{margin:'0 0 8px',fontSize:13,color:'var(--text-secondary)',lineHeight:1.7}}>{item.content}</p>
                  {item.companies && (
                    <div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'2px 10px',background:'var(--bg-card-high)',border:'1px solid var(--border)',borderRadius:999}}>
                      <Building2 size={11} color="#475569"/>
                      <span style={{fontSize:11,color:'#64748b',fontWeight:600}}>{item.companies.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </GlowCard>
          );
        })}
        {!filtered.length && <p style={{textAlign:'center',color:'var(--text-muted)',padding:'40px 0',fontSize:14}}>No announcements found.</p>}
      </div>
    </div>
  );
}
function getAge(iso) {
  const d = (Date.now()-new Date(iso).getTime())/1000;
  if(d<3600) return `${Math.floor(d/60)}m ago`;
  if(d<86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}
