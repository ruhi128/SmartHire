// utils/notify.js
// Central helper for creating in-app notifications.
// Fire-and-forget friendly: callers should not block on these.

const supabase = require('../config/supabase');
const { sendPushToUsers } = require('./pushNotifications');

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
    // Do not delay the API response on a third-party delivery service. The
    // persisted in-app notification is still available if push delivery fails.
    sendPushToUsers([userId], { title, body, type, link, metadata, id: data.id }).catch(() => {});
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
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length || !title) return 0;
  try {
    const rows = ids.map((user_id) => ({ user_id, title, body, type, link, metadata }));
    // Select the generated IDs. Every recipient needs its own persisted UUID in
    // Expo data so tapping its push can mark the correct inbox record read.
    const { data: inserted, error } = await supabase
      .from('notifications')
      .insert(rows)
      .select('id, user_id');
    if (error) throw error;

    const notificationIdsByUser = Object.fromEntries((inserted || [])
      .filter((row) => row?.id && row?.user_id)
      .map((row) => [row.user_id, row.id]));
    // Send only to recipients for whom the persistence layer returned an ID.
    // This is normally every requested recipient, but it prevents a malformed
    // or partial database response from ever creating a tap payload without a
    // matching inbox notification to mark read.
    const persistedRecipientIds = Object.keys(notificationIdsByUser);
    if (persistedRecipientIds.length) {
      sendPushToUsers(persistedRecipientIds, { title, body, type, link, metadata, notificationIdsByUser }).catch(() => {});
    }
    return (inserted || []).length;
  } catch (err) {
    console.error('[notifyMany] failed:', err.message);
    return 0;
  }
}

module.exports = { notify, notifyMany };
