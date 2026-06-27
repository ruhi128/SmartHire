// src/pages/student/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentAPI, aptitudeAPI, dsaAPI, applicationsAPI } from '../../api/axios';
import StatCard from '../../components/StatCard';
import GlowCard from '../../components/GlowCard';
import {
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Brain, Code2, Video, FileText, Briefcase, ArrowRight,
  Trophy, TrendingUp, Target, Zap, ChevronRight,Building2
} from 'lucide-react';

const CYAN   = '#00c8f0';
const VIOLET = '#7c5cfc';
const GREEN  = '#10c98a';
const AMBER  = '#f5a623';

// Custom tooltip
const CustomTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0b1a2e', border: '1px solid rgba(0,200,240,0.2)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 700, color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [profile,  setProfile]  = useState(null);
  const [aptStats, setAptStats] = useState(null);
  const [dsaStats, setDsaStats] = useState(null);
  const [apps,     setApps]     = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      studentAPI.getProfile().catch(() => ({ data: {} })),
      aptitudeAPI.getAnalysis().catch(() => ({ data: {} })),
      dsaAPI.getPerformance().catch(() => ({ data: {} })),
      applicationsAPI.getMyApps().catch(() => ({ data: { applications: [] } })),
    ]).then(([p, a, d, ap]) => {
      setProfile(p.data?.profile);
      setAptStats(a.data);
      setDsaStats(d.data);
      setApps(ap.data?.applications || []);
    }).finally(() => setLoading(false));
  }, []);

  // Mock chart data if real data unavailable
  const perfTrend = aptStats?.trend || [
    { week: 'W1', score: 42 }, { week: 'W2', score: 58 }, { week: 'W3', score: 61 },
    { week: 'W4', score: 55 }, { week: 'W5', score: 74 }, { week: 'W6', score: 80 },
  ];

  const radarData = aptStats?.topicData || [
    { subject: 'Quant',   score: 72 }, { subject: 'Logical', score: 85 },
    { subject: 'Verbal',  score: 60 }, { subject: 'DI',      score: 50 },
    { subject: 'Puzzles', score: 78 },
  ];

  const dsaBar = dsaStats?.topicStats?.slice(0, 6) || [
    { topic: 'Arrays',   accuracy: 88 }, { topic: 'Trees',    accuracy: 65 },
    { topic: 'DP',       accuracy: 50 }, { topic: 'Graphs',   accuracy: 42 },
    { topic: 'Strings',  accuracy: 78 }, { topic: 'Greedy',   accuracy: 60 },
  ];

  const quickLinks = [
    { label: 'Aptitude Test',  icon: Brain,     to: '/student/aptitude',   color: CYAN   },
    { label: 'DSA Coding',     icon: Code2,     to: '/student/dsa',        color: VIOLET },
    { label: 'Mock Interview', icon: Video,     to: '/student/interview',  color: GREEN  },
    { label: 'Mock OA',        icon: Zap,       to: '/student/mockoa',     color: AMBER  },
    { label: 'Company OA', icon: Building2, to: '/student/companyoa', color: '#7c5cfc' },
    { label: 'Resume Builder', icon: FileText,  to: '/student/resume',     color: '#f04b4b' },
    { label: 'Browse Jobs',    icon: Briefcase, to: '/student/jobs',       color: '#10b981' },
  ];

  const placedCount  = apps.filter(a => a.status === 'selected').length;
  const appliedCount = apps.length;

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <div style={s.header}>
        <div>
          <h1 style={s.h1}>
            Good {getGreeting()}, {profile?.full_name?.split(' ')[0] || user?.name || 'there'} 👋
          </h1>
          <p style={s.sub}>Here's your placement journey at a glance</p>
        </div>
        {profile?.cgpa && (
          <div style={s.cgpaChip}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>CGPA</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: CYAN, lineHeight: 1 }}>{profile.cgpa}</span>
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div style={s.statsGrid}>
        <StatCard title="Tests Taken"       value={aptStats?.totalAttempts ?? '—'}  icon={<Brain size={18}/>}    iconColor={CYAN}   accent={CYAN}   loading={loading} />
        <StatCard title="Aptitude Score"    value={aptStats?.avgScore ? `${aptStats.avgScore}%` : '—'} icon={<Target size={18}/>}   iconColor={VIOLET} accent={VIOLET} loading={loading} subtitle="Average across all tests" />
        <StatCard title="DSA Solved"        value={dsaStats?.uniqueProblemsSolved ?? '—'} icon={<Code2 size={18}/>}    iconColor={GREEN}  accent={GREEN}  loading={loading} />
        <StatCard title="Jobs Applied"      value={appliedCount}                    icon={<Briefcase size={18}/>} iconColor={AMBER}  accent={AMBER}  loading={loading} subtitle={`${placedCount} offer(s) received`} />
      </div>

      {/* ── Charts row ── */}
      <div style={s.chartsRow}>

        {/* Performance trend */}
        <GlowCard title="Score Trend" subtitle="Aptitude performance over time" accent={CYAN} style={{ flex: 2 }}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={perfTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CYAN}   stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CYAN}   stopOpacity={0}    />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTip />} />
              <Area type="monotone" dataKey="score" name="Score" stroke={CYAN} strokeWidth={2.5} fill="url(#cg)" dot={{ fill: CYAN, r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </GlowCard>

        {/* Radar */}
        <GlowCard title="Skill Radar" subtitle="Aptitude topic coverage" accent={VIOLET} style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
              <Radar dataKey="score" stroke={VIOLET} fill={VIOLET} fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </GlowCard>
      </div>

      {/* ── DSA bar + quick links ── */}
      <div style={s.chartsRow}>

        {/* DSA topic bars */}
        <GlowCard title="DSA Topic Accuracy" subtitle="% solved correctly per topic" accent={GREEN} style={{ flex: 2 }}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dsaBar} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="topic" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTip />} />
              <Bar dataKey="accuracy" name="Accuracy %" fill={GREEN} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </GlowCard>

        {/* Quick links */}
        <GlowCard title="Quick Access" accent={AMBER} style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {quickLinks.map(link => {
              const Icon = link.icon;
              return (
                <button key={link.to} style={s.quickLink(link.color)} onClick={() => navigate(link.to)}>
                  <div style={s.quickIcon(link.color)}><Icon size={15} color={link.color} /></div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#cbd5e1', textAlign: 'left' }}>{link.label}</span>
                  <ChevronRight size={14} color="#334155" />
                </button>
              );
            })}
          </div>
        </GlowCard>
      </div>

      {/* ── Recent Applications ── */}
      {apps.length > 0 && (
        <GlowCard
          title="Recent Applications"
          accent={AMBER}
          headerRight={
            <button style={s.viewAll} onClick={() => navigate('/student/jobs')}>
              View all <ArrowRight size={12} />
            </button>
          }
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Company', 'Role', 'Applied', 'Status'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apps.slice(0, 5).map(a => (
                  <tr key={a.id}>
                    <td style={s.td}>{a.job_postings?.companies?.name || '—'}</td>
                    <td style={s.td}>{a.job_postings?.title || '—'}</td>
                    <td style={s.td}>{new Date(a.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    <td style={s.td}><span style={s.badge(a.status)}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlowCard>
      )}

      {/* ── Placement tip ── */}
      <GlowCard accent="#7c5cfc" style={{ background: 'linear-gradient(135deg, #0d1a3a, #150d2e)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 32 }}>💡</div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Today's Tip</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
              Solve at least 2 DSA problems daily. Companies like TCS and Infosys heavily test on Arrays, Strings, and basic DP. Consistency beats cramming.
            </p>
          </div>
          <button style={s.tipBtn} onClick={() => navigate('/student/dsa')}>Practice Now</button>
        </div>
      </GlowCard>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const STATUS_COLORS = { applied: '#00c8f0', shortlisted: '#f5a623', selected: '#10c98a', rejected: '#f04b4b' };

const s = {
  page:       { padding: 28, maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 },
  header:     { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  h1:         { margin: 0, fontSize: 26, fontWeight: 800, color: '#f0f6ff', letterSpacing: '-0.02em', fontFamily: "'Sora',sans-serif" },
  sub:        { margin: '6px 0 0', fontSize: 13, color: '#475569' },
  cgpaChip:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'rgba(0,200,240,0.08)', border: '1px solid rgba(0,200,240,0.2)', borderRadius: 12, padding: '12px 20px', flexShrink: 0 },
  statsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 },
  chartsRow:  { display: 'flex', gap: 16, flexWrap: 'wrap' },
  quickLink:  (c) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: `${c}0a`, border: `1px solid ${c}18`, borderRadius: 9, cursor: 'pointer', transition: 'all 0.15s', width: '100%' }),
  quickIcon:  (c) => ({ width: 30, height: 30, borderRadius: 8, background: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  viewAll:    { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#00c8f0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Sora',sans-serif", fontWeight: 600 },
  th:         { padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' },
  td:         { padding: '10px 12px', fontSize: 13, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.03)' },
  badge:      (st) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[st] || '#475569'}18`, color: STATUS_COLORS[st] || '#475569', textTransform: 'capitalize', border: `1px solid ${STATUS_COLORS[st] || '#475569'}33` }),
  tipBtn:     { flexShrink: 0, padding: '8px 16px', background: 'rgba(124,92,252,0.2)', border: '1px solid rgba(124,92,252,0.4)', borderRadius: 8, color: '#7c5cfc', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora',sans-serif", whiteSpace: 'nowrap' },
};
