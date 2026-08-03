// src/pages/student/DSAHub.jsx
// Combines the DSA "Coding" and "Performance" views under a single nav entry
// with a tab bar. Uses nested routes via <Outlet/>.
import { Outlet } from 'react-router-dom';
import { Code2, Trophy } from 'lucide-react';
import TabBar from '../../components/TabBar';

const TABS = [
  { to: '/student/dsa',             end: true,  label: 'Coding',      icon: Code2 },
  { to: '/student/dsa/performance', end: false, label: 'Performance', icon: Trophy },
];

export default function DSAHub() {
  return (
    <div>
      <div style={{ padding: '24px 24px 0', maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Sora',sans-serif" }}>DSA Practice</h1>
        <p style={{ margin: '6px 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>Solve coding problems and track your progress</p>
        <TabBar tabs={TABS} />
      </div>
      <Outlet />
    </div>
  );
}
