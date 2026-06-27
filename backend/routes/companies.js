const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const supabase = require('../config/supabase');

// GET /api/companies/mine
router.get('/mine', auth, roles('recruiter'), async (req, res) => {

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('recruiter_id', req.user.id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      error: error.message
    });
  }

  if (!data) {
    return res.status(404).json({
      error: 'No company linked to recruiter'
    });
  }

  res.json({
    company: data
  });
});

module.exports = router;