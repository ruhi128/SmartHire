// routes/notifications.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

const EXPO_TOKEN_PATTERN = /^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

function isMissingDeviceRegistry(error) {
  const detail = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || (
    detail.includes('mobile_devices') && (detail.includes('not find') || detail.includes('does not exist'))
  );
}

function deviceRegistryFailure(res, error, fallback) {
  if (isMissingDeviceRegistry(error)) {
    return res.status(503).json({
      error: 'Mobile push devices are not ready. Apply migration 009_enable_mobile_push_devices.sql, then restart the API.',
    });
  }
  console.error(fallback, error);
  return res.status(500).json({ error: 'Could not update device notification settings' });
}

function parseExpoPushToken(value) {
  if (typeof value !== 'string') return { error: 'A valid Expo push token is required.' };
  const expoPushToken = value.trim();
  if (expoPushToken.length > 512 || !EXPO_TOKEN_PATTERN.test(expoPushToken)) {
    return { error: 'A valid Expo push token is required.' };
  }
  return { expoPushToken };
}

function optionalText(value, field, limit) {
  if (value === undefined || value === null || value === '') return { value: null };
  if (typeof value !== 'string') return { error: `${field} must be text.` };
  return { value: value.trim().slice(0, limit) || null };
}

// POST /api/notifications/devices — attach the current Expo device token to
// the authenticated account. The request body intentionally has no user_id;
// a token may only be registered for req.user.id.
router.post('/devices', auth, async (req, res) => {
  const token = parseExpoPushToken(req.body?.expoPushToken);
  if (token.error) return res.status(400).json({ error: token.error });

  const platform = String(req.body?.platform || '').trim().toLowerCase();
  if (!['android', 'ios'].includes(platform)) {
    return res.status(400).json({ error: 'platform must be android or ios.' });
  }
  const deviceName = optionalText(req.body?.deviceName, 'deviceName', 160);
  const appVersion = optionalText(req.body?.appVersion, 'appVersion', 80);
  if (deviceName.error || appVersion.error) {
    return res.status(400).json({ error: deviceName.error || appVersion.error });
  }

  try {
    const { data, error } = await supabase
      .from('mobile_devices')
      .upsert({
        user_id: req.user.id,
        expo_push_token: token.expoPushToken,
        platform,
        device_name: deviceName.value,
        app_version: appVersion.value,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: 'expo_push_token' })
      .select('id, platform, last_seen_at')
      .single();
    if (error) throw error;
    return res.status(201).json({ device: data });
  } catch (error) {
    return deviceRegistryFailure(res, error, 'POST /notifications/devices error:');
  }
});

// DELETE /api/notifications/devices — detach only a token that belongs to the
// current authenticated user. It is intentionally declared before /:id below.
router.delete('/devices', auth, async (req, res) => {
  const token = parseExpoPushToken(req.body?.expoPushToken);
  if (token.error) return res.status(400).json({ error: token.error });

  try {
    const { data, error } = await supabase
      .from('mobile_devices')
      .delete()
      .eq('user_id', req.user.id)
      .eq('expo_push_token', token.expoPushToken)
      .select('id');
    if (error) throw error;
    return res.json({ removed: Boolean(data?.length) });
  } catch (error) {
    return deviceRegistryFailure(res, error, 'DELETE /notifications/devices error:');
  }
});

// GET /api/notifications — list current user's notifications
// Query: ?unread=true&limit=30
router.get('/', auth, async (req, res) => {
  try {
    const { unread, limit = 30 } = req.query;
    let query = supabase
      .from('notifications')
      .select('id, title, body, type, link, is_read, metadata, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (unread === 'true') query = query.eq('is_read', false);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ notifications: data || [] });
  } catch (err) {
    console.error('GET /notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err) {
    console.error('GET /notifications/unread-count error:', err);
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error('PATCH /notifications/:id/read error:', err);
    res.status(500).json({ error: 'Failed to update' });
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);
    if (error) throw error;
    res.json({ message: 'All marked as read' });
  } catch (err) {
    console.error('PATCH /notifications/read-all error:', err);
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE /notifications/:id error:', err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

module.exports = router;
