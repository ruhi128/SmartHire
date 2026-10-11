export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', options).format(date);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date);
}

export function relativeDate(value) {
  if (!value) return '—';
  const ms = Date.now() - new Date(value).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(value);
}

export function statusTone(status = '') {
  const normalized = status.toLowerCase();
  if (['selected', 'approved', 'active', 'accepted', 'placed'].includes(normalized)) return 'success';
  if (['rejected', 'closed', 'failed'].includes(normalized)) return 'danger';
  if (['pending', 'shortlisted', 'on_hold'].includes(normalized)) return 'warning';
  return 'info';
}

export function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SH';
}
