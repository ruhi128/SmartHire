// src/pages/student/AptitudeHub.jsx
// Combines the Aptitude "Practice Test" and "Performance" (analysis) views
// under a single nav entry with a tab bar. Uses nested routes via <Outlet/>.
import { Outlet } from 'react-router-dom';
import { Brain, BarChart3 } from 'lucide-react';
import TabBar from '../../components/TabBar';

const TABS = [
  { to: '/student/aptitude',          end: true,  label: 'Practice Test', icon: Brain },
  { to: '/student/aptitude/analysis', end: false, label: 'Performance',   icon: BarChart3 },
];

export default function AptitudeHub() {
  return (
    <div>
      <div style={{ padding: '24px 24px 0', maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Sora',sans-serif" }}>Aptitude</h1>
        <p style={{ margin: '6px 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>Practice timed aptitude tests and track your performance</p>
        <TabBar tabs={TABS} />
      </div>
      <Outlet />
    </div>
  );
}
