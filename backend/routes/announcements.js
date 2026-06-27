// NOTE: Student reads announcements via this dedicated route
// Admin creates them via /api/admin/announcements

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const supabase = require('../config/supabase');

// GET /api/announcements  — all roles can read
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, content, priority, created_at, companies(name, logo_url)')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
