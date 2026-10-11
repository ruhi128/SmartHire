const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

const EXPO_TOKEN_RE = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

// Register (or transfer) the physical device token after a successful mobile login.
router.post('/devices', auth, async (req, res) => {
  const { expo_push_token, platform, device_name, app_version } = req.body || {};
  if (
    typeof expo_push_token !== 'string' ||
    expo_push_token.length > 255 ||
    !EXPO_TOKEN_RE.test(expo_push_token)
  ) {
    return res.status(400).json({ error: 'A valid Expo push token is required.' });
  }
  if (platform && !['ios', 'android'].includes(platform)) {
    return res.status(400).json({ error: 'platform must be ios or android.' });
  }

  try {
    const row = {
      user_id: req.user.id,
      expo_push_token,
      platform: platform || null,
      device_name: typeof device_name === 'string' ? device_name.slice(0, 160) : null,
      app_version: typeof app_version === 'string' ? app_version.slice(0, 80) : null,
      last_seen_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('mobile_devices')
      .upsert(row, { onConflict: 'expo_push_token' });
    if (error) throw error;
    res.status(201).json({ message: 'Device registered for mobile notifications.' });
  } catch (err) {
    console.error('POST /mobile/devices error:', err);
    res.status(500).json({ error: 'Could not register this device.' });
  }
});

// A device can only unregister its own token; this prevents cross-account deletion.
router.delete('/devices', auth, async (req, res) => {
  const { expo_push_token } = req.body || {};
  if (
    typeof expo_push_token !== 'string' ||
    expo_push_token.length > 255 ||
    !EXPO_TOKEN_RE.test(expo_push_token)
  ) {
    return res.status(400).json({ error: 'A valid Expo push token is required.' });
  }
  try {
    const { error } = await supabase
      .from('mobile_devices')
      .delete()
      .eq('user_id', req.user.id)
      .eq('expo_push_token', expo_push_token);
    if (error) throw error;
    res.json({ message: 'Device unregistered.' });
  } catch (err) {
    console.error('DELETE /mobile/devices error:', err);
    res.status(500).json({ error: 'Could not unregister this device.' });
  }
});

module.exports = router;
