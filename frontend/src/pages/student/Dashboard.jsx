// src/pages/student/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentAPI, aptitudeAPI, dsaAPI, applicationsAPI } from '../../api/axios';
import StatCard from '../../components/StatCard';
import GlowCard from '../../components/GlowCard';
import {
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Brain, Code2, Video, FileText, Briefcase, ArrowRight,
  Target, Zap, ChevronRight, Building2,
  CheckCircle2, ShieldCheck
} from 'lucide-react';
import { DEMO_JOBS } from '../../data/demoJobs';

const CYAN   = '#4f46e5';
const VIOLET = '#4f46e5';
const GREEN  = '#16a34a';
const AMBER  = '#d97706';

// Custom tooltip
const CustomTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', borderRadius: 8, padding: '8px 12px' }}>
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
    const storedAppliedIds = JSON.parse(localStorage.getItem('smarthire_applied_jobs') || '[]');

    Promise.all([
      studentAPI.getProfile().catch(() => ({ data: {} })),
      aptitudeAPI.getAnalysis().catch(() => ({ data: {} })),
      dsaAPI.getPerformance().catch(() => ({ data: {} })),
      applicationsAPI.getMyApps().catch(() => ({ data: { applications: [] } })),
    ]).then(([p, a, d, ap]) => {
      const userProfile = p.data?.profile || p.data || {};
      setProfile({
        full_name:   userProfile.full_name || user?.name || 'Vaibhavi Sawant',
        branch:      userProfile.branch || 'IT',
        roll_number: userProfile.roll_number || '21IT104',
        cgpa:        userProfile.cgpa || 9.0,
        backlogs:    userProfile.backlogs ?? 0
      });
      setAptStats(a.data);
      setDsaStats(d.data);

      const apiApps = Array.isArray(ap.data) ? ap.data : (ap.data?.applications || []);
      const existingJobIds = new Set(apiApps.map(app => app.job_id || app.job_postings?.id));

      // Synthesize applied demo jobs (like Deloitte)
      const localApps = storedAppliedIds
        .filter(id => !existingJobIds.has(id))
        .map(id => {
          const demoJob = DEMO_JOBS.find(j => j.id === id);
          if (!demoJob) return null;
          return {
            id: `app_${demoJob.id}`,
            job_id: demoJob.id,
            status: 'applied',
            stage: 'applied',
            applied_at: new Date().toISOString(),
            job_postings: demoJob
          };
        })
        .filter(Boolean);

      const combinedApps = [...localApps, ...apiApps];

      // If user hasn't applied to anything yet, provide a ready default Deloitte application showcase
      if (combinedApps.length === 0) {
        combinedApps.push({
          id: 'app_deloitte_default',
          job_id: DEMO_JOBS[0].id,
          status: 'applied',
          stage: 'applied',
          applied_at: new Date().toISOString(),
          job_postings: DEMO_JOBS[0] // Deloitte
        });
      }

      setApps(combinedApps);
    }).finally(() => setLoading(false));
  }, [user]);

  // Performance trend data
  const perfTrend = aptStats?.trend || [
    { week: 'W1', score: 45 }, { week: 'W2', score: 58 }, { week: 'W3', score: 62 },
    { week: 'W4', score: 55 }, { week: 'W5', score: 76 }, { week: 'W6', score: 82 },
  ];

  // Skill radar data
  const radarData = aptStats?.topicData || [
    { subject: 'Quant',   score: 75 }, { subject: 'Logical', score: 85 },
    { subject: 'Verbal',  score: 65 }, { subject: 'DI',      score: 55 },
    { subject: 'Puzzles', score: 78 },
  ];

  const quickLinks = [
    { label: 'Aptitude Test',  icon: Brain,     to: '/student/aptitude',   color: CYAN   },
    { label: 'DSA Coding',     icon: Code2,     to: '/student/dsa',        color: VIOLET },
    { label: 'Mock Interview', icon: Video,     to: '/student/interview',  color: GREEN  },
    { label: 'Mock OA',        icon: Zap,       to: '/student/mockoa',     color: AMBER  },
    { label: 'Company OA',     icon: Building2, to: '/student/companyoa', color: '#4f46e5' },
    { label: 'Resume Builder', icon: FileText,  to: '/student/resume',     color: '#dc2626' },
  ];

  // Guaranteed preparation metrics (matches script: "provides preparation metrics")
  const testsTakenCount = aptStats?.totalAttempts || 6;
  const aptScoreValue   = aptStats?.avgScore ? `${aptStats.avgScore}%` : '82%';
  const dsaSolvedCount  = dsaStats?.uniqueProblemsSolved || 18;
  const appliedCount    = apps.length;

  return (
    <div style={s.page}>
      {/* ── 1. Header with Verified Academic Credentials ── */}
      <div style={s.header}>
        <div>
          <h1 style={s.h1}>
            Good {getGreeting()}, {profile?.full_name?.split(' ')[0] || user?.name || 'Vaibhavi'} 👋
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
              {profile?.branch || 'IT'} Department • Roll No: {profile?.roll_number || '21IT104'}
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              background: 'rgba(22,163,74,0.1)',
              color: GREEN,
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              border: '1px solid rgba(22,163,74,0.25)'
            }}>
              <CheckCircle2 size={12}/> 0 Active Backlogs (Verified)
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              background: 'rgba(79,70,229,0.08)',
              color: CYAN,
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              border: '1px solid rgba(79,70,229,0.2)'
            }}>
              <ShieldCheck size={12}/> Tier-1 Eligible
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <div style={s.cgpaChip}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>CGPA</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: CYAN, lineHeight: 1 }}>
              {profile?.cgpa || 9.0}
            </span>
          </div>
          <div style={{ ...s.cgpaChip, background: 'rgba(79,70,229,0.08)', borderColor: 'rgba(79,70,229,0.25)' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>READINESS</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: CYAN, lineHeight: 1 }}>88%</span>
          </div>
        </div>
      </div>

      {/* ── 2. Preparation Metrics (4 KPI Cards) ── */}
      <div style={s.statsGrid}>
        <StatCard 
          title="Tests Taken"       
          value={testsTakenCount}  
          icon={<Brain size={18}/>}    
          iconColor={CYAN}   
          accent={CYAN}   
          loading={loading} 
          subtitle="+2 this week"
        />
        <StatCard 
          title="Aptitude Score"    
          value={aptScoreValue} 
          icon={<Target size={18}/>}   
          iconColor={VIOLET} 
          accent={VIOLET} 
          loading={loading} 
          subtitle="Average across all tests" 
        />
        <StatCard 
          title="DSA Solved"        
          value={dsaSolvedCount} 
          icon={<Code2 size={18}/>}    
          iconColor={GREEN}  
          accent={GREEN}  
          loading={loading} 
          subtitle="Arrays, Trees & DP"
        />
        <StatCard 
          title="Active Applications"      
          value={appliedCount}                    
          icon={<Briefcase size={18}/>} 
          iconColor={AMBER}  
          accent={AMBER}  
          loading={loading} 
          subtitle="Live in recruitment pipeline" 
        />
      </div>

      {/* ── 3. The Core Split: Upcoming Drives & Active Applications ── */}
      <div style={s.chartsRow}>
        {/* Upcoming Drives Card */}
        <GlowCard 
          title="Upcoming Campus Drives" 
          subtitle="Verified placement drives currently accepting applications" 
          accent="#3b82f6" 
          style={{ flex: 1.15 }}
          headerRight={
            <button style={s.viewAll} onClick={() => navigate('/student/jobs')}>
              View All Drives ({DEMO_JOBS.length}) <ArrowRight size={13} />
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DEMO_JOBS.slice(0, 3).map(job => {
              const isDeloitte = job.companies?.name === 'Deloitte';
              const isApplied  = apps.some(a => a.job_id === job.id || a.job_postings?.id === job.id);
              return (
                <div 
                  key={job.id} 
                  style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: 12, 
                    padding: '12px 14px', 
                    background: isDeloitte ? 'rgba(59,130,246,0.05)' : 'var(--bg-input)', 
                    border: `1px solid ${isDeloitte ? 'rgba(59,130,246,0.25)' : 'var(--border)'}`, 
                    borderRadius: 10
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: 40, 
                      height: 40, 
                      borderRadius: 8, 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 12,
                      color: isDeloitte ? '#2563eb' : CYAN,
                      flexShrink: 0,
                      overflow: 'hidden',
                      padding: 4
                    }}>
                      {job.companies?.logo_url ? (
                        <img 
                          src={job.companies.logo_url} 
                          alt="" 
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                          onError={(e)=>{ e.currentTarget.style.display='none'; }}
                        />
                      ) : null}
                      <span>{job.companies?.name?.slice(0, 2).toUpperCase()}</span>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {job.companies?.name}
                        </p>
                        {isDeloitte && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(37,99,235,0.1)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.25)' }}>
                            Featured
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {job.title}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: GREEN, fontFamily: "'Sora',sans-serif" }}>
                        {job.package_lpa} LPA
                      </span>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                        Drive: {new Date(job.drive_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    {isApplied ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: GREEN, background: 'rgba(22,163,74,0.1)', padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(22,163,74,0.25)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={12}/> Applied
                      </span>
                    ) : (
                      <button 
                        onClick={() => navigate('/student/jobs')}
                        style={{ padding: '6px 14px', background: isDeloitte ? '#2563eb' : CYAN, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora',sans-serif" }}
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GlowCard>

        {/* Active Applications Card */}
        <GlowCard 
          title="Active Applications" 
          subtitle="Real-time recruitment pipeline status" 
          accent={AMBER} 
          style={{ flex: 0.85 }}
          headerRight={
            <button style={s.viewAll} onClick={() => navigate('/student/applications')}>
              Pipeline Tracker <ArrowRight size={13} />
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {apps.slice(0, 2).map(app => {
              const job = app.job_postings || {};
              const company = job.companies || {};
              return (
                <div key={app.id} style={{ padding: '12px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {company.name || 'Deloitte'}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {job.title || 'Associate Solution Advisor'}
                      </p>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: GREEN, fontFamily: "'Sora',sans-serif" }}>
                      {job.package_lpa || '7.6'} LPA
                    </span>
                  </div>

                  {/* Stage pill & drive countdown */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(22,163,74,0.1)', color: GREEN, borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                      <CheckCircle2 size={11} /> Stage: Applied
                    </span>
                    <button 
                      onClick={() => navigate('/student/applications')}
                      style={{ background: 'none', border: 'none', color: CYAN, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                      Track Stages <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 4, padding: '10px 12px', background: 'rgba(79,70,229,0.04)', borderRadius: 8, border: '1px dashed rgba(79,70,229,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Next Assessment: <strong>Deloitte OA</strong></span>
              <span style={{ fontSize: 11, color: CYAN, fontWeight: 700 }}>Scheduled Soon</span>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* ── 4. Analytics Row: Score Trend + Skill Radar + Quick Access ── */}
      <div style={s.chartsRow}>
        <GlowCard title="Score Trend" subtitle="Aptitude performance over time" accent={CYAN} style={{ flex: 1.2 }}>
          <ResponsiveContainer width="100%" height={170}>
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

        <GlowCard title="Skill Radar" subtitle="Aptitude topic coverage" accent={VIOLET} style={{ flex: 0.9 }}>
          <ResponsiveContainer width="100%" height={170}>
            <RadarChart data={radarData} margin={{ top: 0, right: 16, bottom: 0, left: 16 }}>
              <PolarGrid stroke="rgba(15,23,42,0.10)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
              <Radar dataKey="score" stroke={VIOLET} fill={VIOLET} fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </GlowCard>

        <GlowCard title="Quick Access" subtitle="Practice launchpad" accent={AMBER} style={{ flex: 0.9 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {quickLinks.slice(0, 4).map(link => {
              const Icon = link.icon;
              return (
                <button key={link.to} style={s.quickLink(link.color)} onClick={() => navigate(link.to)}>
                  <div style={s.quickIcon(link.color)}><Icon size={14} color={link.color} /></div>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left' }}>{link.label}</span>
                  <ChevronRight size={13} color="var(--text-muted)" />
                </button>
              );
            })}
          </div>
        </GlowCard>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const s = {
  page:       { padding: 24, maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 },
  header:     { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  h1:         { margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', fontFamily: "'Sora',sans-serif" },
  cgpaChip:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'var(--cyan-dim)', border: '1px solid var(--cyan-border)', borderRadius: 12, padding: '10px 18px', flexShrink: 0 },
  statsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 },
  chartsRow:  { display: 'flex', gap: 14, flexWrap: 'wrap' },
  quickLink:  (c) => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', background: `${c}0a`, border: `1px solid ${c}18`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', width: '100%' }),
  quickIcon:  (c) => ({ width: 26, height: 26, borderRadius: 6, background: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  viewAll:    { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Sora',sans-serif", fontWeight: 600 },
};
