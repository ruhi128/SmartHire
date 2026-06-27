// src/pages/student/DSAPerformance.jsx
import { useState, useEffect } from 'react';
import { dsaAPI } from '../../api/axios';
import GlowCard from '../../components/GlowCard';
import StatCard from '../../components/StatCard';
import { LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Code2, CheckCircle, Target, Trophy } from 'lucide-react';

const CYAN='#00c8f0', GREEN='#10c98a', AMBER='#f5a623', RED='#f04b4b', VIOLET='#7c5cfc';
const Tip = ({ active, payload, label }) => active && payload?.length
  ? <div style={{background:'#0b1a2e',border:'1px solid rgba(0,200,240,0.2)',borderRadius:8,padding:'8px 12px'}}>
      <p style={{margin:0,fontSize:11,color:'#64748b'}}>{label}</p>
      {payload.map((p,i)=><p key={i} style={{margin:'3px 0 0',fontSize:13,fontWeight:700,color:p.color}}>{p.name}: {p.value}</p>)}
    </div> : null;

export default function DSAPerformance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    dsaAPI.getPerformance().then(r=>setData(r.data)).catch(()=>setData({
      totalAttempts:24,accepted:16,accuracy:67,uniqueProblemsSolved:14,
      byDifficulty:{Easy:{solved:8,total:9},Medium:{solved:5,total:10},Hard:{solved:1,total:5}},
      topicStats:[{topic:'Arrays',attempted:8,solved:7,accuracy:88},{topic:'Strings',attempted:5,solved:4,accuracy:80},{topic:'Trees',attempted:4,solved:2,accuracy:50},{topic:'DP',attempted:4,solved:1,accuracy:25},{topic:'Graphs',attempted:3,solved:2,accuracy:67}],
      recentSubmissions:[{id:'s1',title:'Two Sum',difficulty:'Easy',status:'Accepted',language:'javascript',runtime:45,submittedAt:new Date().toISOString()},{id:'s2',title:'Merge Intervals',difficulty:'Medium',status:'Wrong Answer',language:'python',runtime:0,submittedAt:new Date().toISOString()}],
    })).finally(()=>setLoading(false));
  },[]);
  const trend = Array.from({length:8},(_,i)=>({day:`D${i+1}`,solved:Math.floor(Math.random()*4)+1,attempted:Math.floor(Math.random()*3)+2}));
  const radar = data?.topicStats?.map(t=>({subject:t.topic.slice(0,8),score:t.accuracy}))||[];
  return (
    <div style={{padding:24,maxWidth:1100,margin:'0 auto',display:'flex',flexDirection:'column',gap:20}}>
      <div><h1 style={{margin:0,fontSize:24,fontWeight:800,color:'#f0f6ff',fontFamily:"'Sora',sans-serif"}}>DSA Performance</h1><p style={{margin:'6px 0 0',fontSize:13,color:'#475569'}}>Your coding progress and topic mastery</p></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
        <StatCard title="Total Attempts"   value={data?.totalAttempts??'—'} icon={<Code2 size={18}/>} iconColor={CYAN} accent={CYAN} loading={loading}/>
        <StatCard title="Problems Solved"  value={data?.uniqueProblemsSolved??'—'} icon={<CheckCircle size={18}/>} iconColor={GREEN} accent={GREEN} loading={loading}/>
        <StatCard title="Accuracy"         value={data?.accuracy?`${data.accuracy}%`:'—'} icon={<Target size={18}/>} iconColor={AMBER} accent={AMBER} loading={loading}/>
        <StatCard title="Accepted"         value={data?.accepted??'—'} icon={<Trophy size={18}/>} iconColor={VIOLET} accent={VIOLET} loading={loading}/>
      </div>
      <div style={{display:'flex',gap:16}}>
        <GlowCard title="Daily Activity" accent={CYAN} style={{flex:2}}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trend} margin={{top:4,right:4,bottom:0,left:-20}}>
              <XAxis dataKey="day" tick={{fill:'#475569',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#475569',fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>}/>
              <Bar dataKey="solved" name="Solved" fill={GREEN} radius={[4,4,0,0]} maxBarSize={28}/>
              <Bar dataKey="attempted" name="Attempted" fill={CYAN} radius={[4,4,0,0]} maxBarSize={28}/>
            </BarChart>
          </ResponsiveContainer>
        </GlowCard>
        <GlowCard title="Topic Mastery" accent={VIOLET} style={{flex:1}}>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radar} margin={{top:0,right:20,bottom:0,left:20}}>
              <PolarGrid stroke="rgba(255,255,255,0.06)"/>
              <PolarAngleAxis dataKey="subject" tick={{fill:'#64748b',fontSize:10}}/>
              <Radar dataKey="score" stroke={VIOLET} fill={VIOLET} fillOpacity={0.25} strokeWidth={2}/>
            </RadarChart>
          </ResponsiveContainer>
        </GlowCard>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {['Easy','Medium','Hard'].map(d=>{
          const stat = data?.byDifficulty?.[d]||{solved:0,total:0};
          const pct  = stat.total>0?Math.round((stat.solved/stat.total)*100):0;
          const col  = {Easy:GREEN,Medium:AMBER,Hard:RED}[d];
          return (
            <GlowCard key={d} accent={col}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <span style={{fontSize:13,fontWeight:700,color:'#e2e8f0'}}>{d}</span>
                <span style={{fontSize:20,fontWeight:800,color:col,fontFamily:"'Sora',sans-serif"}}>{stat.solved}/{stat.total}</span>
              </div>
              <div style={{height:6,background:'#0f2040',borderRadius:3}}>
                <div style={{width:`${pct}%`,height:'100%',background:col,borderRadius:3,transition:'width 0.6s ease'}}/>
              </div>
              <p style={{margin:'6px 0 0',fontSize:12,color:'#475569'}}>{pct}% solved</p>
            </GlowCard>
          );
        })}
      </div>
      <GlowCard title="Recent Submissions" accent={AMBER}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{['Problem','Difficulty','Status','Language','Runtime'].map(h=><th key={h} style={{padding:'8px 12px',fontSize:11,fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:'0.07em',borderBottom:'1px solid rgba(255,255,255,0.05)',textAlign:'left'}}>{h}</th>)}</tr></thead>
          <tbody>
            {(data?.recentSubmissions||[]).map(s=>(
              <tr key={s.id}>
                <td style={{padding:'10px 12px',fontSize:13,color:'#e2e8f0',fontWeight:600}}>{s.title}</td>
                <td style={{padding:'10px 12px',fontSize:12}}><span style={{padding:'2px 8px',borderRadius:999,fontSize:11,fontWeight:700,background:`${{Easy:GREEN,Medium:AMBER,Hard:RED}[s.difficulty]}18`,color:{Easy:GREEN,Medium:AMBER,Hard:RED}[s.difficulty]}}>{s.difficulty}</span></td>
                <td style={{padding:'10px 12px',fontSize:12,color:s.status==='Accepted'?GREEN:RED,fontWeight:700}}>{s.status}</td>
                <td style={{padding:'10px 12px',fontSize:12,color:'#64748b'}}>{s.language}</td>
                <td style={{padding:'10px 12px',fontSize:12,color:'#64748b'}}>{s.runtime?`${s.runtime}ms`:'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlowCard>
    </div>
  );
}
