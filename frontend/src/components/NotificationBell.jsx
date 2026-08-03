// src/components/NotificationBell.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import { notificationsAPI } from '../api/axios';

const POLL_MS = 30000;

function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)   return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open,    setOpen]    = useState(false);
  const [count,   setCount]   = useState(0);
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const fetchCount = useCallback(async () => {
    try {
      const { data } = await notificationsAPI.unreadCount();
      setCount(data.count || 0);
    } catch { /* silent — polling */ }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await notificationsAPI.list({ limit: 30 });
      setItems(data.notifications || []);
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  }, []);

  // Poll unread count
  useEffect(() => {
    fetchCount();
    const t = setInterval(fetchCount, POLL_MS);
    return () => clearInterval(t);
  }, [fetchCount]);

  // Load list when opened
  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const openItem = async (n) => {
    if (!n.is_read) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      setCount(c => Math.max(0, c - 1));
      try { await notificationsAPI.markRead(n.id); } catch { /* ignore */ }
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const markAll = async () => {
    setItems(prev => prev.map(x => ({ ...x, is_read: true })));
    setCount(0);
    try { await notificationsAPI.markAllRead(); } catch { /* ignore */ }
  };

  const remove = async (e, id) => {
    e.stopPropagation();
    const wasUnread = items.find(x => x.id === id && !x.is_read);
    setItems(prev => prev.filter(x => x.id !== id));
    if (wasUnread) setCount(c => Math.max(0, c - 1));
    try { await notificationsAPI.remove(id); } catch { /* ignore */ }
  };

  return (
    <div ref={wrapRef} style={s.wrap}>
      <button style={s.bellBtn} onClick={() => setOpen(o => !o)} aria-label="Notifications" title="Notifications">
        <Bell size={18} />
        {count > 0 && (
          <span style={s.badge}>{count > 99 ? '99+' : count}</span>
        )}
      </button>

      {open && (
        <div style={s.panel}>
          <div style={s.header}>
            <span style={s.headerTitle}>Notifications</span>
            {items.some(x => !x.is_read) && (
              <button style={s.markAllBtn} onClick={markAll}>
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div style={s.list}>
            {loading ? (
              <div style={s.empty}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /></div>
            ) : items.length === 0 ? (
              <div style={s.empty}>
                <Bell size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 13 }}>No notifications yet</p>
              </div>
            ) : (
              items.map(n => (
                <div
                  key={n.id}
                  onClick={() => openItem(n)}
                  style={{ ...s.item, background: n.is_read ? 'transparent' : 'var(--cyan-dim)', cursor: n.link ? 'pointer' : 'default' }}
                >
                  {!n.is_read && <span style={s.dot} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={s.itemTitle}>{n.title}</p>
                    {n.body && <p style={s.itemBody}>{n.body}</p>}
                    <p style={s.itemTime}>{timeAgo(n.created_at)}</p>
                  </div>
                  <button style={s.delBtn} onClick={(e) => remove(e, n.id)} title="Delete" aria-label="Delete notification">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:     { position: 'fixed', top: 16, right: 16, zIndex: 900 },
  bellBtn:  { position: 'relative', width: 40, height: 40, borderRadius: 12, background: 'var(--bg-card-raised)', border: '1px solid var(--border-mid)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  badge:    { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-subtle)', fontFamily: "'Sora',sans-serif" },
  panel:    { position: 'absolute', top: 48, right: 0, width: 340, maxHeight: 460, background: 'var(--bg-card, #0b1a2e)', border: '1px solid var(--border-mid, #1e3a5f)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  header:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border, #1e3a5f)' },
  headerTitle: { fontSize: 14, fontWeight: 800, color: 'var(--text-primary, #f0f6ff)', fontFamily: "'Sora',sans-serif" },
  markAllBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--cyan, #00c8f0)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Sora',sans-serif" },
  list:     { overflowY: 'auto', flex: 1 },
  empty:    { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', color: 'var(--text-muted, #475569)' },
  item:     { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border, #16283f)', position: 'relative' },
  dot:      { width: 7, height: 7, borderRadius: '50%', background: 'var(--cyan, #00c8f0)', marginTop: 6, flexShrink: 0 },
  itemTitle:{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #e2e8f0)' },
  itemBody: { margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.4 },
  itemTime: { margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted, #475569)' },
  delBtn:   { background: 'none', border: 'none', color: 'var(--text-muted, #475569)', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 },
};
