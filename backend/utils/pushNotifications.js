// Expo Push API integration. Failures are deliberately non-fatal: in-app
// notifications remain the canonical record even when a device is offline.
const axios = require('axios');
const supabase = require('../config/supabase');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_MESSAGES_PER_REQUEST = 100;

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function sendPushToUsers(userIds, notification = {}) {
  // Keep push opt-in at deployment time. In-app notifications are always
  // persisted regardless of this flag.
  if (process.env.MOBILE_PUSH_ENABLED !== 'true') return 0;
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length || !notification.title) return 0;

  try {
    const { data: devices, error } = await supabase
      .from('mobile_devices')
      .select('user_id, expo_push_token')
      .in('user_id', ids);
    if (error) throw error;

    // A token is unique, but keep its owner while deduplicating so a bulk
    // notification can include the correct per-user inbox UUID on every
    // device. A single global ID would mark the wrong record (or none) read.
    const devicesByToken = new Map();
    (devices || []).forEach((device) => {
      if (device?.expo_push_token && !devicesByToken.has(device.expo_push_token)) {
        devicesByToken.set(device.expo_push_token, device);
      }
    });
    const messages = [...devicesByToken.values()].map((device) => ({
      to: device.expo_push_token,
      sound: 'default',
      title: String(notification.title).slice(0, 120),
      body: String(notification.body || '').slice(0, 500),
      data: {
        link: notification.link || '',
        notificationId: notification.notificationIdsByUser?.[device.user_id] || notification.id || '',
        type: notification.type || 'system',
      },
      channelId: 'default',
      priority: 'high',
    }));

    for (const group of chunks(messages, MAX_MESSAGES_PER_REQUEST)) {
      const response = await axios.post(EXPO_PUSH_URL, group, {
        timeout: 10000,
        headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
      });
      // Expo reports malformed/expired tokens per message. Keep the record for
      // temporary errors; remove only tokens it marks permanently unregistered.
      const tickets = response.data?.data || [];
      const invalid = tickets
        .map((ticket, index) => ticket?.details?.error === 'DeviceNotRegistered' ? group[index]?.to : null)
        .filter(Boolean);
      if (invalid.length) await supabase.from('mobile_devices').delete().in('expo_push_token', invalid);
    }
    return messages.length;
  } catch (err) {
    console.error('[push] delivery failed:', err.response?.data || err.message);
    return 0;
  }
}

module.exports = { sendPushToUsers };
