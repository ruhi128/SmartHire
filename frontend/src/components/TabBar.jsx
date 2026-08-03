// src/components/TabBar.jsx
// Reusable underline-style tab bar built on NavLink. Theme-token driven.
import { NavLink } from 'react-router-dom';

export default function TabBar({ tabs }) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
      {tabs.map(({ to, end, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'Sora',sans-serif",
            textDecoration: 'none',
            color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: `2px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
            marginBottom: -1,
            transition: 'color 0.15s, border-color 0.15s',
          })}
        >
          {Icon && <Icon size={15} />}
          {label}
        </NavLink>
      ))}
    </div>
  );
}
