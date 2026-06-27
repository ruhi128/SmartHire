// src/components/ThemeToggle.jsx
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ style = {} }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="theme-toggle"
      data-tooltip={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Sun icon */}
      <Sun 
        size={16} 
        color="#f5a623"
        style={{
          position: 'absolute',
          transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
          opacity: isDark ? 0 : 1,
          transform: isDark ? 'translateY(-10px) rotate(90deg)' : 'translateY(0) rotate(0deg)',
        }}
      />
      
      {/* Moon icon */}
      <Moon 
        size={16} 
        color="#6d28d9"
        style={{
          position: 'absolute',
          transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
          opacity: isDark ? 1 : 0,
          transform: isDark ? 'translateY(0) rotate(0deg)' : 'translateY(10px) rotate(-90deg)',
        }}
      />
    </button>
  );
}