// src/pages/student/Profile.jsx
import { useState, useEffect, useRef } from 'react';
import { authAPI, studentAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import GlowCard from '../../components/GlowCard';
import {
  User, Mail, Phone, Github, Linkedin, BookOpen,
  Award, Edit3, Save, X, CheckCircle, Loader2, Camera, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const CYAN = '#4f46e5', GREEN = '#16a34a', AMBER = '#d97706', VIOLET = '#4f46e5', RED = '#dc2626';

const BRANCHES = ['CE', 'CST', 'ENC', 'DS', 'AI', 'IT'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const PLACEMENT_STATUSES = [
  { value: 'unplaced',  label: 'Unplaced',  color: AMBER },
  { value: 'placed',    label: 'Placed',    color: GREEN },
  { value: 'opted_out', label: 'Opted Out', color: '#475569' },
];

export default function Profile() {
  const { user, updateUserLocally } = useAuth();
  const [profile,    setProfile]    = useState(null);
  const [editing,    setEditing]    = useState(false);
  const [form,       setForm]       = useState({});
  const [saving,     setSaving]     = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [skillInput, setSkillInput] = useState('');
  const [certInput,  setCertInput]  = useState('');
  const [activeTab,  setActiveTab]  = useState('overview');

  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    studentAPI.getProfile()
      .then(r => {
        if (!active) return;
        const p = r.data?.profile;
        if (!p) throw new Error('The server did not return a profile.');
        const merged = {
          full_name: p.full_name || user?.name || '',
          email: p.email || user?.email || '',
          cgpa: p.cgpa ?? null,
          branch: p.branch || '',
          roll_number: p.roll_number || '',
          semester: p.semester ?? null,
          phone: p.phone || '',
          linkedin_url: p.linkedin_url || '',
          github_url: p.github_url || '',
          tenth_percent: p.tenth_percent ?? null,
          twelfth_percent: p.twelfth_percent ?? null,
          backlogs: p.backlogs ?? 0,
          skills: Array.isArray(p.skills) ? p.skills : [],
          certifications: Array.isArray(p.certifications) ? p.certifications : [],
          placement_status: p.placement_status || 'unplaced',
          resume_url: p.resume_url || '',
          avatar_url: p.avatar_url || null,
          avatar_updated_at: p.avatar_updated_at || null,
        };
        setProfile(merged);
        setForm(merged);
      })
      .catch((err) => { if (active) setLoadError(err.response?.data?.error || err.message || 'Could not load profile.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, refreshKey]);

  // Avatar files live in a private bucket. Fetch them with Axios so the
  // existing bearer token is attached; a normal <img src> cannot do that.
  const avatarMarker = profile ? profile.avatar_url : (user?.avatar_url || null);
  const avatarRevision = profile ? profile.avatar_updated_at : (user?.avatar_updated_at || null);

  useEffect(() => {
    let active = true;
    let objectUrl = null;
    setAvatarUrl(null);
    if (!avatarMarker) return () => {};

    authAPI.getAvatar()
      .then((response) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data);
        setAvatarUrl(objectUrl);
      })
      .catch(() => {
        // A stale profile marker or a removed image should gracefully fall
        // back to initials instead of exposing a Storage error to the user.
        if (active) setAvatarUrl(null);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [avatarMarker, avatarRevision]);

  const isAllowedAvatarFile = (file) => {
    if (!file) return false;
    if (file.type) return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type.toLowerCase());
    return /\.(jpe?g|png|webp)$/i.test(file.name || '');
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    // Let someone choose the same file again after a rejected/failed upload.
    event.target.value = '';
    if (!file) return;
    if (!isAllowedAvatarFile(file)) {
      toast.error('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Profile photos must be 2 MB or smaller.');
      return;
    }

    setAvatarBusy(true);
    try {
      const body = new FormData();
      body.append('avatar', file);
      const { data } = await authAPI.uploadAvatar(body);
      const patch = {
        avatar_url: data.avatar_url || null,
        avatar_updated_at: data.avatar_updated_at || null,
      };
      setProfile((current) => ({ ...(current || {}), ...patch }));
      setForm((current) => ({ ...(current || {}), ...patch }));
      updateUserLocally?.(patch);
      toast.success(data.message || 'Profile photo updated.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update your profile photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    if (!window.confirm('Remove your profile photo? Your initials will be shown instead.')) return;
    setAvatarBusy(true);
    try {
      const { data } = await authAPI.removeAvatar();
      const patch = { avatar_url: null, avatar_updated_at: null };
      setAvatarUrl(null);
      setProfile((current) => ({ ...(current || {}), ...patch }));
      setForm((current) => ({ ...(current || {}), ...patch }));
      updateUserLocally?.(patch);
      toast.success(data.message || 'Profile photo removed.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not remove your profile photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  // ── Save to DB ───────────────────────────────────────────────────────────
  const save = async () => {
    if (!form.full_name?.trim()) {
      toast.error('Full name is required');
      return;
    }
    const optionalNumber = (value, label, min, max, whole = false) => {
      if (value === null || value === undefined || String(value).trim() === '') return null;
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < min || parsed > max || (whole && !Number.isInteger(parsed))) {
        toast.error(`${label} must be ${whole ? 'a whole number ' : ''}between ${min} and ${max}.`);
        return undefined;
      }
      return parsed;
    };
    const cgpa = optionalNumber(form.cgpa, 'CGPA', 0, 10);
    const tenth = optionalNumber(form.tenth_percent, '10th percentage', 0, 100);
    const twelfth = optionalNumber(form.twelfth_percent, '12th percentage', 0, 100);
    const backlogs = optionalNumber(form.backlogs, 'Backlogs', 0, 20, true);
    const semester = optionalNumber(form.semester, 'Semester', 1, 8, true);
    if ([cgpa, tenth, twelfth, backlogs, semester].includes(undefined)) return;

    for (const field of ['linkedin_url', 'github_url']) {
      const value = String(form[field] || '').trim();
      if (!value) continue;
      try {
        const url = new URL(value);
        if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error('Invalid URL');
      } catch {
        toast.error(`${field === 'linkedin_url' ? 'LinkedIn' : 'GitHub'} must be an http(s) URL.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone,
        branch: form.branch,
        semester,
        cgpa,
        tenth_percent: tenth,
        twelfth_percent: twelfth,
        backlogs: backlogs ?? 0,
        skills: form.skills || [],
        certifications: form.certifications || [],
        linkedin_url: form.linkedin_url?.trim() || null,
        github_url: form.github_url?.trim() || null,
      };

      const r = await studentAPI.updateProfile(payload);
      // A save is successful only when the server confirms the persisted row.
      const saved = r.data?.profile;
      if (!saved || typeof saved !== 'object') throw new Error('The server did not confirm the saved profile.');
      setProfile(saved);
      setForm(saved);
      if (updateUserLocally) updateUserLocally({ name: saved.full_name });
      setEditing(false);
      toast.success('Profile saved successfully!');
    } catch (err) {
      console.error('Profile save error:', err);
      const msg = err.response?.data?.error || err.message || 'Update failed. Please try again.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(profile);
    setSkillInput('');
    setCertInput('');
  };

  const addSkill = () => {
    const sk = skillInput.trim();
    if (!sk) return;
    if ((form.skills || []).map(s => s.toLowerCase()).includes(sk.toLowerCase())) {
      toast.error('Skill already added');
      return;
    }
    setForm(f => ({ ...f, skills: [...(f.skills || []), sk] }));
    setSkillInput('');
  };

  const removeSkill = (i) =>
    setForm(f => ({ ...f, skills: (f.skills || []).filter((_, idx) => idx !== i) }));

  const addCert = () => {
    const c = certInput.trim();
    if (!c) return;
    setForm(f => ({ ...f, certifications: [...(f.certifications || []), c] }));
    setCertInput('');
  };

  const removeCert = (i) =>
    setForm(f => ({ ...f, certifications: (f.certifications || []).filter((_, idx) => idx !== i) }));

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: '80px 24px 24px', textAlign: 'center' }}>
      <Loader2 size={28} color={CYAN} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
      <p style={{ color: '#475569', marginTop: 12 }}>Loading profile...</p>
    </div>
  );

  if (loadError || !profile) return (
    <div style={{ padding: '70px 24px 24px', textAlign: 'center' }}>
      <p role="alert" style={{ color: RED }}>{loadError || 'Could not load your profile.'}</p>
      <button type="button" style={BTN(CYAN)} onClick={() => setRefreshKey(key => key + 1)}>Retry</button>
    </div>
  );

  const F = form;
  const statusInfo = PLACEMENT_STATUSES.find(s => s.value === profile.placement_status) || PLACEMENT_STATUSES[0];
  const cgpaVal    = parseFloat(F.cgpa);
  const cgpaColor  = cgpaVal >= 8 ? GREEN : cgpaVal >= 6 ? AMBER : cgpaVal > 0 ? RED : '#475569';

  const TABS = [
    { id: 'overview', label: '👤 Overview' },
    { id: 'academic', label: '🎓 Academic' },
    { id: 'contact',  label: '📞 Contact'  },
    { id: 'skills',   label: '💻 Skills'   },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Sora',sans-serif" }}>
            My Profile
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#475569' }}>
            Your academic and placement information
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!editing ? (
            <button style={BTN(CYAN)} onClick={() => setEditing(true)}>
              <Edit3 size={14} /> Edit Profile
            </button>
          ) : (
            <>
              <button style={BTN('#475569')} onClick={cancelEdit}>
                <X size={14} /> Cancel
              </button>
              <button
                style={{ ...BTN(GREEN), background: GREEN, color: '#ffffff', border: 'none' }}
                onClick={save}
                disabled={saving}
              >
                {saving
                  ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Save size={14} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile Hero Card */}
      <GlowCard accent={CYAN} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>

          {/* Avatar — an object URL is used because the private endpoint needs the bearer token. */}
          <div style={{ width: 80, flexShrink: 0 }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, overflow: 'hidden', background: `${CYAN}18`, border: `2px solid ${CYAN}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: CYAN, fontFamily: "'Sora',sans-serif" }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setAvatarUrl(null)} />
                : (F.full_name || user?.name || 'S')[0].toUpperCase()}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={uploadAvatar}
              style={{ display: 'none' }}
            />
            <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarBusy}
                title="Upload or replace profile photo"
                style={{ ...BTN(CYAN), padding: '6px 8px', fontSize: 11, opacity: avatarBusy ? 0.6 : 1 }}
              >
                {avatarBusy ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={12} />}
                {avatarMarker ? 'Change' : 'Photo'}
              </button>
              {avatarMarker && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  disabled={avatarBusy}
                  title="Remove profile photo"
                  style={{ ...BTN(RED), padding: '6px 7px', opacity: avatarBusy ? 0.6 : 1 }}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 200 }}>
            {editing ? (
              <input
                value={F.full_name || ''}
                onChange={e => set('full_name', e.target.value)}
                style={{ ...INPUT, fontSize: 18, fontWeight: 700, marginBottom: 8 }}
                placeholder="Full Name *"
              />
            ) : (
              <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Sora',sans-serif" }}>
                {F.full_name || '—'}
              </h2>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <BookOpen size={11} /> {F.roll_number || 'No Roll No.'}
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>•</span>

              {editing ? (
                <select value={F.branch || ''} onChange={e => set('branch', e.target.value)}
                  style={{ ...INPUT, width: 'auto', padding: '3px 8px', fontSize: 12 }}>
                  <option value="">Branch</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              ) : (
                <span style={{ fontSize: 12, color: '#64748b' }}>{F.branch || '—'}</span>
              )}

              <span style={{ fontSize: 12, color: '#64748b' }}>•</span>

              {editing ? (
                <select value={F.semester || ''} onChange={e => set('semester', e.target.value)}
                  style={{ ...INPUT, width: 'auto', padding: '3px 8px', fontSize: 12 }}>
                  <option value="">Semester</option>
                  {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
                </select>
              ) : (
                <span style={{ fontSize: 12, color: '#64748b' }}>{F.semester ? `Sem ${F.semester}` : '—'}</span>
              )}

              <span title="Managed by the placement team" style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: `${statusInfo.color}18`, color: statusInfo.color, border: `1px solid ${statusInfo.color}33` }}>
                {statusInfo.label}
              </span>
            </div>

            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={12} color="#475569" />
              <span style={{ fontSize: 12, color: '#475569' }}>{F.email || user?.email || '—'}</span>
            </div>
          </div>

          {/* CGPA */}
          <div style={{ textAlign: 'center', padding: '12px 20px', background: `${cgpaColor}08`, border: `1px solid ${cgpaColor}22`, borderRadius: 14, flexShrink: 0 }}>
            <p style={{ margin: '0 0 4px', fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>CGPA</p>
            {editing ? (
              <input type="number" min="0" max="10" step="0.01"
                value={F.cgpa ?? ''}
                onChange={e => set('cgpa', e.target.value)}
                style={{ ...INPUT, width: 80, textAlign: 'center', fontSize: 22, fontWeight: 900, padding: '4px 8px' }}
              />
            ) : (
              <p style={{ margin: 0, fontSize: 36, fontWeight: 900, color: cgpaColor, fontFamily: "'Sora',sans-serif", lineHeight: 1 }}>
                {F.cgpa ?? '—'}
              </p>
            )}
            <p style={{ margin: '4px 0 0', fontSize: 10, color: '#475569' }}>/ 10.0</p>
          </div>
        </div>

        {/* Resume */}
        {F.resume_url && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={14} color={GREEN} />
              <span style={{ fontSize: 13, color: GREEN, fontWeight: 600 }}>Resume uploaded</span>
            </div>
            <a href={F.resume_url} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: CYAN, textDecoration: 'none', fontWeight: 600 }}>
              View Resume →
            </a>
          </div>
        )}
      </GlowCard>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-card-high)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, fontFamily: "'Sora',sans-serif",
            background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
            color: activeTab === tab.id ? CYAN : '#64748b',
            boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <GlowCard title="Quick Stats" accent={CYAN}>
            {[
              { label: 'CGPA',      value: F.cgpa ?? '—',                          color: cgpaColor, suffix: F.cgpa != null ? '/ 10' : '' },
              { label: '10th %',    value: F.tenth_percent != null ? `${F.tenth_percent}%` : '—', color: 'var(--text-primary)' },
              { label: '12th %',    value: F.twelfth_percent != null ? `${F.twelfth_percent}%` : '—', color: 'var(--text-primary)' },
              { label: 'Backlogs',  value: F.backlogs ?? '0',                    color: F.backlogs > 0 ? RED : GREEN },
              { label: 'Semester',  value: F.semester ? `Sem ${F.semester}` : '—', color: 'var(--text-primary)' },
              { label: 'Placement', value: statusInfo.label,                     color: statusInfo.color },
            ].map(({ label, value, color, suffix }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>
                  {value} {suffix && <span style={{ fontSize: 11, color: '#475569', fontWeight: 400 }}>{suffix}</span>}
                </span>
              </div>
            ))}
          </GlowCard>

          <GlowCard title="Skills" accent={GREEN}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {(F.skills || []).length > 0
                ? (F.skills || []).map((sk, i) => (
                    <span key={i} style={{ padding: '4px 12px', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 999, fontSize: 12, fontWeight: 600, color: GREEN }}>
                      {sk}
                    </span>
                  ))
                : <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>No skills added. Go to Skills tab.</p>
              }
            </div>
          </GlowCard>

          <GlowCard title="Certifications" accent={AMBER} style={{ gridColumn: '1/-1' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(F.certifications || []).length > 0
                ? (F.certifications || []).map((c, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.25)', borderRadius: 999, fontSize: 12, fontWeight: 600, color: AMBER }}>
                      <Award size={12} /> {c}
                    </span>
                  ))
                : <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>No certifications added yet.</p>
              }
            </div>
          </GlowCard>
        </div>
      )}

      {/* ── Tab: Academic ─────────────────────────────────────────────────── */}
      {activeTab === 'academic' && (
        <GlowCard title="Academic Details" accent={VIOLET}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Roll Number',     key: 'roll_number',     type: 'text',    disabled: true  },
              { label: 'Branch',          key: 'branch',          type: 'select'                   },
              { label: 'Semester',        key: 'semester',        type: 'select2'                  },
              { label: 'CGPA',            key: 'cgpa',            type: 'number',  min: 0, max: 10,  step: 0.01 },
              { label: '10th Percentage', key: 'tenth_percent',   type: 'number',  min: 0, max: 100, step: 0.01 },
              { label: '12th Percentage', key: 'twelfth_percent', type: 'number',  min: 0, max: 100, step: 0.01 },
              { label: 'Active Backlogs', key: 'backlogs',        type: 'number',  min: 0, max: 20  },
              { label: 'Placement Status (managed by placement team)', key: 'placement_status', type: 'text', disabled: true },
            ].map(({ label, key, type, disabled, min, max, step }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
                {!editing || disabled ? (
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: disabled ? '#475569' : 'var(--text-primary)', padding: '8px 0' }}>
                    {key === 'placement_status' ? statusInfo.label
                     : key === 'semester' ? (F[key] ? `Semester ${F[key]}` : '—')
                     : F[key] ?? '—'}
                  </p>
                ) : type === 'select' ? (
                  <select value={F[key] || ''} onChange={e => set(key, e.target.value)} style={INPUT}>
                    <option value="">Select Branch</option>
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                ) : type === 'select2' ? (
                  <select value={F[key] || ''} onChange={e => set(key, e.target.value)} style={INPUT}>
                    <option value="">Select Semester</option>
                    {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                ) : (
                  <input type={type} min={min} max={max} step={step}
                    value={F[key] ?? ''}
                    onChange={e => set(key, e.target.value)}
                    style={INPUT} />
                )}
              </div>
            ))}
          </div>
        </GlowCard>
      )}

      {/* ── Tab: Contact ──────────────────────────────────────────────────── */}
      {activeTab === 'contact' && (
        <GlowCard title="Contact Information" accent={CYAN}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { icon: Mail,     label: 'Email Address', key: 'email',       type: 'email', disabled: true,  placeholder: 'your@email.com' },
              { icon: Phone,    label: 'Phone Number',  key: 'phone',       type: 'tel',   disabled: false, placeholder: '+91 98765 43210' },
              { icon: Linkedin, label: 'LinkedIn URL',  key: 'linkedin_url',type: 'url',   disabled: false, placeholder: 'https://linkedin.com/in/yourname' },
              { icon: Github,   label: 'GitHub URL',    key: 'github_url',  type: 'url',   disabled: false, placeholder: 'https://github.com/yourname' },
            ].map(({ icon: Icon, label, key, type, disabled, placeholder }) => (
              <div key={key} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${CYAN}10`, border: `1px solid ${CYAN}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Icon size={16} color={CYAN} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
                  {editing && !disabled ? (
                    <input type={type} value={F[key] || ''} onChange={e => set(key, e.target.value)}
                      style={INPUT} placeholder={placeholder} />
                  ) : (
                    <p style={{ margin: 0, fontSize: 14, color: F[key] ? 'var(--text-primary)' : 'var(--text-muted)', wordBreak: 'break-all' }}>
                      {F[key] || (disabled ? '—' : <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Not added yet</span>)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlowCard>
      )}

      {/* ── Tab: Skills ───────────────────────────────────────────────────── */}
      {activeTab === 'skills' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <GlowCard title="Technical Skills" accent={GREEN}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: editing ? 14 : 0 }}>
              {(F.skills || []).length > 0
                ? (F.skills || []).map((sk, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 999, fontSize: 12, fontWeight: 700, color: GREEN }}>
                      {sk}
                      {editing && (
                        <button onClick={() => removeSkill(i)}
                          style={{ background: 'none', border: 'none', color: GREEN, cursor: 'pointer', padding: 0, display: 'flex', lineHeight: 1 }}>
                          <X size={11} />
                        </button>
                      )}
                    </span>
                  ))
                : <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                    {editing ? 'Add your first skill below' : 'No skills added yet. Click Edit Profile to add skills.'}
                  </p>
              }
            </div>
            {editing && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                  style={INPUT} placeholder="e.g. React.js, Python, AWS — press Enter to add" />
                <button onClick={addSkill}
                  style={{ ...BTN(GREEN), background: GREEN, color: '#ffffff', border: 'none', padding: '9px 16px', whiteSpace: 'nowrap' }}>
                  + Add
                </button>
              </div>
            )}
          </GlowCard>

          <GlowCard title="Certifications & Achievements" accent={AMBER}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: editing ? 14 : 0 }}>
              {(F.certifications || []).length > 0
                ? (F.certifications || []).map((c, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.25)', borderRadius: 999, fontSize: 12, fontWeight: 700, color: AMBER }}>
                      <Award size={11} /> {c}
                      {editing && (
                        <button onClick={() => removeCert(i)}
                          style={{ background: 'none', border: 'none', color: AMBER, cursor: 'pointer', padding: 0, display: 'flex', lineHeight: 1 }}>
                          <X size={11} />
                        </button>
                      )}
                    </span>
                  ))
                : <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                    {editing ? 'Add your first certification below' : 'No certifications added yet.'}
                  </p>
              }
            </div>
            {editing && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={certInput} onChange={e => setCertInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCert(); } }}
                  style={INPUT} placeholder="e.g. AWS Cloud Practitioner — Amazon (2024)" />
                <button onClick={addCert}
                  style={{ ...BTN(AMBER), background: AMBER, color: '#ffffff', border: 'none', padding: '9px 16px', whiteSpace: 'nowrap' }}>
                  + Add
                </button>
              </div>
            )}
          </GlowCard>
        </div>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const INPUT = {
  background:  'var(--bg-input)',
  border:      '1px solid var(--border)',
  borderRadius: 8,
  padding:     '9px 12px',
  fontSize:    13,
  color:       'var(--text-primary)',
  outline:     'none',
  width:       '100%',
  fontFamily:  "'Sora',sans-serif",
  boxSizing:   'border-box',
};

const BTN = (c) => ({
  display:    'inline-flex',
  alignItems: 'center',
  gap:        7,
  padding:    '9px 18px',
  background: `${c}14`,
  border:     `1px solid ${c}33`,
  borderRadius: 9,
  color:      c,
  fontSize:   13,
  fontWeight: 700,
  cursor:     'pointer',
  fontFamily: "'Sora',sans-serif",
});