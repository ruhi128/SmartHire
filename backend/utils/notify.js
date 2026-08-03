// utils/notify.js
// Central helper for creating in-app notifications.
// Fire-and-forget friendly: callers should not block on these.

const supabase = require('../config/supabase');

/**
 * Create a single notification.
 * @param {string} userId
 * @param {{title:string, body?:string, type?:string, link?:string, metadata?:object}} n
 */
async function notify(userId, { title, body = '', type = 'system', link = null, metadata = {} } = {}) {
  if (!userId || !title) return null;
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({ user_id: userId, title, body, type, link, metadata })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[notify] failed:', err.message);
    return null;
  }
}

/**
 * Create the same notification for many users (bulk insert).
 * @param {string[]} userIds
 */
async function notifyMany(userIds, { title, body = '', type = 'system', link = null, metadata = {} } = {}) {
  const ids = (userIds || []).filter(Boolean);
  if (!ids.length || !title) return 0;
  try {
    const rows = ids.map((user_id) => ({ user_id, title, body, type, link, metadata }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) throw error;
    return rows.length;
  } catch (err) {
    console.error('[notifyMany] failed:', err.message);
    return 0;
  }
}

module.exports = { notify, notifyMany };
