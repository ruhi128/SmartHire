// src/components/Sidebar.jsx
// Updated with CSS variable system for professional light/dark mode support

import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Briefcase, ClipboardList, Code2, Brain,
  Video, FileText, FileQuestion, BarChart3, Megaphone, User,
  ChevronLeft, ChevronRight, LogOut, Settings,
  Building2, Users, TrendingUp, PlusCircle,
  GraduationCap, BookOpen, Trophy, Cpu, Menu, X,
  ChevronDown, ChevronUp, Sun, Moon, CheckSquare,
} from 'lucide-react';

// ── Nav config per role ──
const NAV = {
  student: [
    {
      group: 'Overview',
      items: [
        { label: 'Dashboard',      icon: LayoutDashboard,  to: '/student/dashboard' },
        { label: 'Job Listings',   icon: Briefcase,        to: '/student/jobs' },
        { label: 'Announcements',  icon: Megaphone,        to: '/student/announcements' },
      ],
    },
    {
      group: 'Assessments',
      items: [
        { label: 'Aptitude Test',  icon: Brain,            to: '/student/aptitude' },
        { label: 'Apt. Analysis',  icon: BarChart3,        to: '/student/aptitude/analysis' },
        { label: 'DSA Coding',     icon: Code2,            to: '/student/dsa' },
        { label: 'DSA Performance',icon: Trophy,           to: '/student/dsa/performance' },
      ],
    },
    {
      group: 'Mock Practice',
      items: [
        { label: 'Mock Interview', icon: Video, to: '/student/interview' },
        { label: 'Mock OA',        icon: Cpu,   to: '/student/mockoa' },
        { label: 'Company OA',     icon: Building2, to: '/student/companyoa', badge: 'new' },
      ],
    },
    {
      group: 'Resume',
      items: [
        { label: 'Resume Builder', icon: FileText,         to: '/student/resume' },
        { label: 'ATS Scorer',     icon: ClipboardList,    to: '/student/ats' },
      ],
    },
    {
      group: 'Account',
      items: [
        { label: 'My Profile',     icon: User,             to: '/student/profile' },
      ],
    },
  ],

  recruiter: [
    {
      group: 'Overview',
      items: [
        { label: 'Dashboard',      icon: LayoutDashboard,  to: '/recruiter/dashboard' },
        { label: 'Post a Job',     icon: PlusCircle,       to: '/recruiter/post-job' },
        { label: 'Applicants',     icon: Users,            to: '/recruiter/applicants' },
      ],
    },
    {
      group: 'Assessments',
      items: [
        { label: 'Upload Company OA', icon: FileText, to: '/recruiter/upload-oa' },
      ],
    },
    {
      group: 'Account',
      items: [
        { label: 'Settings',       icon: Settings,         to: '/recruiter/settings' },
      ],
    },
  ],

  admin: [
    {
      group: 'Management',
      items: [
        { label: 'Dashboard',      icon: LayoutDashboard,  to: '/admin/dashboard' },
        { label: 'Students',       icon: GraduationCap,    to: '/admin/students' },
        { label: 'Companies',      icon: Building2,        to: '/admin/companies' },
      ],
    },
    {
      group: 'Analytics',
      items: [
        { label: 'Reports',               icon: TrendingUp,    to: '/admin/reports' },
        { label: 'Job Approvals',         icon: CheckSquare,   to: '/admin/job-approvals', badge: 'pending' },
        { label: 'Company OA Approvals',  icon: FileText,      to: '/admin/company-oa-approvals', badge: 'pending' },
      ],
    },
  ],
};

// ── Accent color per role ──
const ROLE_ACCENT = {
  student:   'var(--cyan)',
  recruiter: 'var(--violet)',
  admin:     'var(--amber)',
};

const ROLE_LABEL = {
  student:   'Student Portal',
  recruiter: 'Recruiter Portal',
  admin:     'Admin Dashboard',
};

export default function Sidebar() {
  const { user, logout }       = useAuth();
  const { isDark, toggle }     = useTheme(); // This is correct - useTheme from your ThemeContext
  const location               = useLocation();
  const navigate               = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const role   = user?.role || 'student';
  const accent = ROLE_ACCENT[role];
  const navGroups = NAV[role] || [];

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Responsive: auto-collapse on small screens
  useEffect(() => {
    const handle = () => {
      if (window.innerWidth < 768) setCollapsed(true);
    };
    handle();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  function toggleGroup(group) {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  }

  const sidebarContent = (
    <aside
      className="sidebar"
      style={{
        width: collapsed ? 64 : 240,
        minHeight: '100vh',
        background: 'var(--bg-subtle)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        position: 'relative',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* ── Logo ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '20px 14px 16px',
        borderBottom: '1px solid var(--border)',
        position: 'relative',
        minHeight: 68,
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-md)',
          background: 'var(--cyan-dim)',
          border: '1px solid var(--cyan-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <GraduationCap size={20} style={{ color: accent }} />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <p style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              fontFamily: 'var(--font-main)',
              whiteSpace: 'nowrap',
            }}>
              CampusReady
            </p>
            <p style={{
              margin: '1px 0 0',
              fontSize: 10,
              color: accent,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>
              {ROLE_LABEL[role]}
            </p>
          </div>
        )}
        {/* Collapse toggle — desktop */}
        <button
          className="theme-toggle"
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label="Toggle sidebar"
        >
          {collapsed
            ? <ChevronRight size={14} />
            : <ChevronLeft  size={14} />
          }
        </button>
      </div>

      {/* ── User chip ── */}
      {!collapsed && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          margin: '8px 10px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-mid)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--cyan-dim)',
            border: '1px solid var(--cyan-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 800,
            color: accent,
            flexShrink: 0,
            fontFamily: 'var(--font-main)',
          }}>
            {(user?.name || 'U')[0].toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <p style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {user?.name || 'User'}
            </p>
            <p style={{
              margin: '1px 0 0',
              fontSize: 10,
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {user?.email}
            </p>
          </div>
        </div>
      )}
      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--cyan-dim)',
            border: '1px solid var(--cyan-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 800,
            color: accent,
            fontFamily: 'var(--font-main)',
          }}>
            {(user?.name || 'U')[0].toUpperCase()}
          </div>
        </div>
      )}

      {/* ── Nav groups ── */}
      <nav style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '8px 8px 0',
      }}>
        {navGroups.map((group) => {
          const isGroupCollapsed = collapsedGroups[group.group];
          return (
            <div key={group.group} style={{ marginBottom: collapsed ? 8 : 4 }}>
              {/* Group label */}
              {!collapsed && (
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 8px 4px',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                  }}
                  onClick={() => toggleGroup(group.group)}
                >
                  <span>{group.group.toUpperCase()}</span>
                  {isGroupCollapsed
                    ? <ChevronDown size={10} />
                    : <ChevronUp   size={10} />
                  }
                </button>
              )}

              {/* Nav items */}
              {!isGroupCollapsed && group.items.map((item) => {
                const Icon    = item.icon;
                const isActive = location.pathname === item.to ||
                               location.pathname.startsWith(item.to + '/');

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    style={({ isActive: ra }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: collapsed ? '10px' : '9px 10px',
                      marginBottom: 2,
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      position: 'relative',
                      background: (ra || isActive) ? 'var(--cyan-dim)' : 'transparent',
                      border: (ra || isActive) ? '1px solid var(--cyan-border)' : '1px solid transparent',
                      transition: 'var(--transition)',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                    })}
                    title={collapsed ? item.label : undefined}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? accent : 'var(--text-muted)',
                      flexShrink: 0,
                      transition: 'var(--transition)',
                    }}>
                      <Icon size={16} />
                    </div>
                    {!collapsed && (
                      <span style={{
                        fontSize: 13,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? accent : 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        letterSpacing: isActive ? '-0.01em' : 'normal',
                        transition: 'var(--transition)',
                      }}>
                        {item.label}
                      </span>
                    )}
                    {item.badge && !collapsed && (
                      <span className="badge badge-amber" style={{
                        marginLeft: 'auto',
                        fontSize: 9,
                        padding: '2px 6px',
                      }}>
                        {item.badge === 'new' ? 'NEW' : 'PENDING'}
                      </span>
                    )}
                    {/* Active indicator */}
                    {isActive && (
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        top: '20%',
                        height: '60%',
                        width: 3,
                        background: accent,
                        borderRadius: '3px 0 0 3px',
                        boxShadow: 'var(--shadow-cyan)',
                      }} />
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div style={{
        padding: '8px 8px 16px',
        borderTop: '1px solid var(--border)',
      }}>
        {!collapsed && (
          <div className="divider-glow" style={{ margin: '0 0 8px' }} />
        )}
        {/* Theme toggle */}
        <button
          className="theme-toggle"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: collapsed ? '9px' : '9px 10px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card-raised)',
            border: '1px solid var(--border-mid)',
            cursor: 'pointer',
            marginBottom: 4,
            justifyContent: collapsed ? 'center' : 'flex-start',
            position: 'relative',
            overflow: 'hidden',
          }}
          onClick={toggle}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {/* Sun icon */}
          <Sun 
            size={16} 
            color="var(--amber)"
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
            color="var(--violet)"
            style={{
              position: 'absolute',
              transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
              opacity: isDark ? 1 : 0,
              transform: isDark ? 'translateY(0) rotate(0deg)' : 'translateY(10px) rotate(-90deg)',
            }}
          />
          {!collapsed && (
            <span style={{
              marginLeft: 26,
              fontSize: 13,
              fontWeight: 500,
              transition: 'var(--transition)',
            }}>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>
        
        {/* Logout */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '9px 10px',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            border: '1px solid transparent',
            cursor: 'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'var(--transition)',
            color: 'var(--text-secondary)',
          }}
          onClick={logout}
          title="Log out"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--red-dim)';
            e.currentTarget.style.color = 'var(--red)';
            e.currentTarget.style.border = '1px solid var(--red-border)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.border = '1px solid transparent';
          }}
        >
          <LogOut size={16} />
          {!collapsed && <span style={{ fontSize: 13 }}>Log Out</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* ── Mobile hamburger ── */}
      <button
        className="theme-toggle"
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 1000,
          display: 'flex',
          '@media (min-width: 768px)': { display: 'none' },
        }}
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* ── Mobile overlay backdrop ── */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-overlay)',
            zIndex: 999,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 1001,
        transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        boxShadow: 'var(--shadow-lg)',
      }}
      className="md:hidden">
        {sidebarContent}
      </div>

      {/* ── Desktop sidebar ── */}
      <div className="hidden md:block" style={{ flexShrink: 0 }}>
        {sidebarContent}
      </div>
    </>
  );
}