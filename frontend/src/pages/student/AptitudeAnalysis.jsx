// src/pages/student/AptitudeAnalysis.jsx
import { useState, useEffect } from 'react';
import { aptitudeAPI } from '../../api/axios';
import GlowCard from '../../components/GlowCard';
import StatCard from '../../components/StatCard';
import { AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Brain, Target, TrendingUp, Clock } from 'lucide-react';

const CYAN='#00c8f0', GREEN='#10c98a', AMBER='#f5a623', RED='#f04b4b', VIOLET='#7c5cfc';

const Tip = ({ active, payload, label }) => active && payload?.length
  ? <div style={{ background: '#0b1a2e', border: '1px solid rgba(0,200,240,0.2)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{label}</p>
      {payload.map((p,i) => <p key={i} style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 700, color: p.color }}>{p.name}: {p.value}</p>)}
    </div>
  : null;

const DEMO_TOPICS = [
  { topic:'Quantitative', correct:18, wrong:6, unattempted:1, accuracy:72, avgTime:45 },
  { topic:'Logical Reasoning', correct:22, wrong:3, unattempted:0, accuracy:88, avgTime:38 },
  { topic:'Verbal',correct:14,wrong:8,unattempted:3,accuracy:56,avgTime:30 },
  { topic:'Data Interpretation',correct:10,wrong:8,unattempted:2,accuracy:50,avgTime:65 },
  { topic:'Puzzles',correct:16,wrong:4,unattempted:0,accuracy:80,avgTime:55 },
];
const DEMO_TREND = [
  {test:'Test 1',score:42},{test:'Test 2',score:55},{test:'Test 3',score:61},
  {test:'Test 4',score:58},{test:'Test 5',score:74},{test:'Test 6',score:82},
];
const DEMO_RADAR = [
  {subject:'Quant',score:72},{subject:'Logical',score:88},{subject:'Verbal',score:56},
  {subject:'DI',score:50},{subject:'Puzzles',score:80},
];

export default function AptitudeAnalysis() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aptitudeAPI.getAnalysis()
      .then(r => setData(r.data))
      .catch(() => setData({ topicData: DEMO_TOPICS, trend: DEMO_TREND, totalAttempts: 6, avgScore: 62, totalCorrect: 80, totalWrong: 29 }))
      .finally(() => setLoading(false));
  }, []);

  const topics    = data?.topicData  || DEMO_TOPICS;
  const trend     = data?.trend      || DEMO_TREND;
  const radarData = data?.radarData  || DEMO_RADAR;

  const strengthLabel = (acc) => acc >= 75 ? { label:'Strong', color: GREEN } : acc >= 50 ? { label:'Average', color: AMBER } : { label:'Weak', color: RED };

  return (
    <div style={pg}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={h1}>Aptitude Analysis</h1>
        <p style={sub}>Detailed breakdown of your performance by topic</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:20 }}>
        <StatCard title="Tests Taken"   value={data?.totalAttempts ?? '—'} icon={<Brain size={18}/>}    iconColor={CYAN}   accent={CYAN}   loading={loading} />
        <StatCard title="Avg Score"     value={data?.avgScore ? `${data.avgScore}%`:'—'} icon={<Target size={18}/>}   iconColor={VIOLET} accent={VIOLET} loading={loading} />
        <StatCard title="Total Correct" value={data?.totalCorrect ?? '—'} icon={<TrendingUp size={18}/>} iconColor={GREEN}  accent={GREEN}  loading={loading} />
        <StatCard title="Total Wrong"   value={data?.totalWrong ?? '—'}   icon={<Clock size={18}/>}    iconColor={AMBER}  accent={AMBER}  loading={loading} />
      </div>

      <div style={{ display:'flex', gap:16, marginBottom:20 }}>
        <GlowCard title="Score Trend" accent={CYAN} style={{ flex:2 }}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend} margin={{top:4,right:4,bottom:0,left:-20}}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CYAN} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={CYAN} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="test" tick={{fill:'#475569',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#475569',fontSize:11}} axisLine={false} tickLine={false} domain={[0,100]}/>
              <Tooltip content={<Tip/>}/>
              <Area type="monotone" dataKey="score" name="Score" stroke={CYAN} strokeWidth={2.5} fill="url(#g1)" dot={{fill:CYAN,r:4}}/>
            </AreaChart>
          </ResponsiveContainer>
        </GlowCard>

        <GlowCard title="Topic Coverage" accent={VIOLET} style={{ flex:1 }}>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} margin={{top:0,right:20,bottom:0,left:20}}>
              <PolarGrid stroke="rgba(255,255,255,0.06)"/>
              <PolarAngleAxis dataKey="subject" tick={{fill:'#64748b',fontSize:10}}/>
              <Radar dataKey="score" stroke={VIOLET} fill={VIOLET} fillOpacity={0.25} strokeWidth={2}/>
            </RadarChart>
          </ResponsiveContainer>
        </GlowCard>
      </div>

      <GlowCard title="Topic-wise Accuracy" accent={GREEN}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={topics} margin={{top:4,right:4,bottom:0,left:-20}}>
            <XAxis dataKey="topic" tick={{fill:'#475569',fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:'#475569',fontSize:10}} axisLine={false} tickLine={false} domain={[0,100]}/>
            <Tooltip content={<Tip/>}/>
            <Bar dataKey="accuracy" name="Accuracy %" fill={GREEN} radius={[4,4,0,0]} maxBarSize={40}/>
          </BarChart>
        </ResponsiveContainer>
      </GlowCard>

      <GlowCard title="Topic-wise Breakdown" accent={AMBER} style={{ marginTop: 16 }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Topic','Correct','Wrong','Unattempted','Accuracy','Avg Time','Strength'].map(h=>(
                <th key={h} style={{padding:'8px 12px',fontSize:11,fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:'0.07em',borderBottom:'1px solid rgba(255,255,255,0.05)',textAlign:'left'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {topics.map((t,i)=>{
                const s = strengthLabel(t.accuracy);
                return (
                  <tr key={i}>
                    <td style={td}>{t.topic}</td>
                    <td style={{...td,color:GREEN}}>{t.correct}</td>
                    <td style={{...td,color:RED}}>{t.wrong}</td>
                    <td style={{...td,color:'#64748b'}}>{t.unattempted}</td>
                    <td style={td}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{flex:1,height:5,background:'#0f2040',borderRadius:3}}>
                          <div style={{width:`${t.accuracy}%`,height:'100%',background:s.color,borderRadius:3}}/>
                        </div>
                        <span style={{fontSize:12,fontWeight:700,color:s.color,minWidth:36}}>{t.accuracy}%</span>
                      </div>
                    </td>
                    <td style={td}>{t.avgTime}s</td>
                    <td style={td}><span style={{padding:'2px 10px',borderRadius:999,fontSize:11,fontWeight:700,background:`${s.color}18`,color:s.color,border:`1px solid ${s.color}33`}}>{s.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlowCard>
    </div>
  );
}

const pg  = { padding:24, maxWidth:1100, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 };
const h1  = { margin:0, fontSize:24, fontWeight:800, color:'#f0f6ff', fontFamily:"'Sora',sans-serif" };
const sub = { margin:'6px 0 0', fontSize:13, color:'#475569' };
const td  = { padding:'11px 12px', fontSize:13, color:'#94a3b8', borderBottom:'1px solid rgba(255,255,255,0.03)' };
