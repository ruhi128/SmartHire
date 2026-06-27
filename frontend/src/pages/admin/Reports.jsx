// src/pages/admin/Reports.jsx
import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/axios';
import GlowCard from '../../components/GlowCard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Download, TrendingUp, Award, Building2, Users } from 'lucide-react';
import StatCard from '../../components/StatCard';

const AMBER='#f5a623', GREEN='#10c98a', CYAN='#00c8f0', VIOLET='#7c5cfc';
const Tip = ({active,payload,label}) => active&&payload?.length ? <div style={{background:'#0b1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 12px'}}><p style={{margin:0,fontSize:11,color:'#64748b'}}>{label}</p>{payload.map((p,i)=><p key={i} style={{margin:'3px 0 0',fontSize:13,fontWeight:700,color:p.color}}>{p.name}: {p.value}</p>)}</div> : null;

export default function AdminReports() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getStats()
      .then(r => setData(r.data))
      .catch(() => setData(DEMO))
      .finally(() => setLoading(false));
  }, []);

  const downloadReport = async (fmt) => {
    try {
      const r = await adminAPI.getReport(fmt);
      if (fmt === 'csv') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([r.data],{type:'text/csv'}));
        a.download = 'placement_report.csv'; a.click();
      }
    } catch { /* fallback — download from demo data */
      const rows = [['Branch','Placed','Unplaced','Rate'],
        ...(data?.byBranch||DEMO.byBranch).map(b=>[b.branch,b.placed,b.unplaced,`${Math.round(b.placed/(b.placed+b.unplaced)*100)}%`])];
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'}));
      a.download = 'placement_report.csv'; a.click();
    }
  };

  const d = data || DEMO;

  return (
    <div style={s.page}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div><h1 style={s.h1}>Placement Reports</h1><p style={s.sub}>Analytics and downloadable reports</p></div>
        <div style={{display:'flex',gap:10}}>
          <button style={s.dlBtn} onClick={()=>downloadReport('csv')}><Download size={14}/>Download CSV</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:20}}>
        <StatCard title="Total Students"   value={d.totalStudents}   icon={<Users size={18}/>}      iconColor={CYAN}   accent={CYAN}   loading={loading}/>
        <StatCard title="Placed"           value={d.placed}           icon={<Award size={18}/>}      iconColor={GREEN}  accent={GREEN}  loading={loading} subtitle={`${d.placementRate}% rate`}/>
        <StatCard title="Avg Package"      value={`${d.avgPackage||0} LPA`} icon={<TrendingUp size={18}/>} iconColor={AMBER} accent={AMBER} loading={loading}/>
        <StatCard title="Highest Package"  value={`${d.highestPackage||0} LPA`} icon={<Award size={18}/>} iconColor={VIOLET} accent={VIOLET} loading={loading}/>
      </div>

      <div style={{display:'flex',gap:16,marginBottom:20}}>
        <GlowCard title="Branch-wise Placement" accent={AMBER} style={{flex:2}}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.byBranch} margin={{top:4,right:4,bottom:0,left:-20}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="branch" tick={{fill:'#475569',fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#475569',fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>}/>
              <Bar dataKey="placed"   name="Placed"   fill={GREEN}  radius={[4,4,0,0]} maxBarSize={24}/>
              <Bar dataKey="unplaced" name="Unplaced" fill={VIOLET} radius={[4,4,0,0]} maxBarSize={24}/>
            </BarChart>
          </ResponsiveContainer>
        </GlowCard>

        <GlowCard title="Year-wise Trend" accent={CYAN} style={{flex:1}}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={d.yearTrend||DEMO.yearTrend} margin={{top:4,right:4,bottom:0,left:-20}}>
              <XAxis dataKey="year" tick={{fill:'#475569',fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#475569',fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>}/>
              <Line type="monotone" dataKey="rate" name="Rate %" stroke={CYAN} strokeWidth={2.5} dot={{fill:CYAN,r:3}}/>
            </LineChart>
          </ResponsiveContainer>
        </GlowCard>
      </div>

      <GlowCard title="Top Hiring Companies" accent={GREEN}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{['Company','Students Hired','Package Range','Drive Date'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {(d.topCompanies||DEMO.topCompanies).map((c,i)=>(
              <tr key={i}>
                <td style={s.td}><p style={{margin:0,fontWeight:700,color:'#e2e8f0',fontSize:13}}>{c.name}</p></td>
                <td style={s.td}><span style={{color:GREEN,fontWeight:700,fontSize:14}}>{c.hired}</span></td>
                <td style={s.td}>{c.packageRange}</td>
                <td style={s.td}>{c.driveDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlowCard>
    </div>
  );
}

const s = {
  page:  { padding:24, maxWidth:1200, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 },
  h1:    { margin:0, fontSize:24, fontWeight:800, color:'#f0f6ff', fontFamily:"'Sora',sans-serif" },
  sub:   { margin:'6px 0 0', fontSize:13, color:'#475569' },
  dlBtn: { display:'flex', alignItems:'center', gap:7, padding:'9px 16px', background:`${AMBER}14`, border:`1px solid ${AMBER}33`, borderRadius:9, color:AMBER, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif" },
  th:    { padding:'8px 12px', fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid rgba(255,255,255,0.05)', textAlign:'left' },
  td:    { padding:'11px 12px', fontSize:13, color:'#94a3b8', borderBottom:'1px solid rgba(255,255,255,0.03)' },
};

const DEMO = {
  totalStudents:450, placed:312, placementRate:69, avgPackage:8.4, highestPackage:45,
  byBranch:[{branch:'CSE',placed:95,unplaced:25},{branch:'IT',placed:72,unplaced:18},{branch:'ECE',placed:58,unplaced:32},{branch:'EEE',placed:42,unplaced:28},{branch:'MECH',placed:28,unplaced:40},{branch:'CIVIL',placed:17,unplaced:35}],
  yearTrend:[{year:'2021',rate:54},{year:'2022',rate:61},{year:'2023',rate:65},{year:'2024',rate:69}],
  topCompanies:[{name:'TCS',hired:45,packageRange:'7–9 LPA',driveDate:'Dec 15'},{name:'Infosys',hired:38,packageRange:'5–7 LPA',driveDate:'Dec 18'},{name:'Wipro',hired:29,packageRange:'8–10 LPA',driveDate:'Dec 28'},{name:'Amazon',hired:12,packageRange:'20–28 LPA',driveDate:'Jan 5'},{name:'Accenture',hired:22,packageRange:'6–8 LPA',driveDate:'Jan 10'}],
};
