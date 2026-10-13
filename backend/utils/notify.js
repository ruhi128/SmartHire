// utils/notify.js
// Central helper for SmartHire's persisted notifications inbox. A row in the
// notifications table is always written first and is the source of truth for
// web/mobile inboxes. When enabled, remote Expo/FCM delivery is additive and
// deliberately non-blocking.

const supabase = require('../config/supabase');
const { scheduleExpoPushNotifications } = require('./expoPush');

/**
 * Create a single persisted notification.
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

    // Do not await device delivery. A push outage must not roll back or delay
    // the inbox event that has already been persisted successfully.
    if (data) scheduleExpoPushNotifications([data]);
    return data;
  } catch (err) {
    console.error('[notify] failed:', err.message);
    return null;
  }
}

/**
 * Create the same persisted notification for many users (bulk insert).
 * @param {string[]} userIds
 */
async function notifyMany(userIds, { title, body = '', type = 'system', link = null, metadata = {} } = {}) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length || !title) return 0;
  try {
    const rows = ids.map((user_id) => ({ user_id, title, body, type, link, metadata }));
    const { data: inserted, error } = await supabase
      .from('notifications')
      .insert(rows)
      .select('id, user_id, title, body, type, link, metadata');
    if (error) throw error;

    // The number returned continues to describe database persistence, not
    // best-effort push acceptance by Expo.
    if (inserted?.length) scheduleExpoPushNotifications(inserted);
    return (inserted || []).length;
  } catch (err) {
    console.error('[notifyMany] failed:', err.message);
    return 0;
  }
}

module.exports = { notify, notifyMany };
