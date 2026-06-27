// src/layouts/AdminLayout.jsx
import { Outlet } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';

export default function AdminLayout() {
  const { isDark } = useTheme();
  return (
    <div style={{ display:'flex', minHeight:'100vh', background: isDark ? '#040c18' : '#f0f4f8' }}>
      <Sidebar />
      <main style={{ flex:1, overflowX:'hidden', overflowY:'auto', minWidth:0 }}>
        <Outlet />
      </main>
    </div>
  );
}
