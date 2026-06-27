const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');

const registerRules = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['student', 'recruiter', 'admin']).withMessage('Invalid role'),
  // full_name only required for students
  body('full_name').if(body('role').equals('student')).notEmpty().withMessage('Full name is required'),
];

const loginRules = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// POST /api/auth/register
router.post('/register', registerRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, password, role, full_name, roll_number, company_name } = req.body;

  try {
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      if (authError.message.includes('already registered'))
        return res.status(409).json({ error: 'Email already registered.' });
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    await supabase.from('users').insert({ id: userId, email, role, is_active: true });

    if (role === 'student') {
      await supabase.from('student_profiles').insert({
        id: userId,
        full_name,
        roll_number: roll_number || null,
      });
    } else if (role === 'recruiter') {
      await supabase
        .from('companies')
        .insert({ name: company_name || 'Company', recruiter_id: userId });
    }

    res.status(201).json({ message: 'Registration successful. You can now log in.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', loginRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  try {
    // Step 1: Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Supabase auth error:', error.message);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    console.log('✅ Auth OK for:', data.user.email, '| ID:', data.user.id);

    // Step 2: Fetch from public.users using maybeSingle (won't throw if not found)
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('id', data.user.id)
      .maybeSingle();

    console.log('📋 users table result:', { userRow, userErr });

    if (userErr) {
      console.error('DB error:', userErr);
      return res.status(500).json({ error: 'Database error: ' + userErr.message });
    }

    // Step 3: If not in public.users, auto-insert (fixes auth/db mismatch)
    let finalUser = userRow;
   if (!userRow) {
  return res.status(404).json({
    error: 'Account setup incomplete. Please register again.'
  });
}

    if (!finalUser.is_active)
      return res.status(403).json({ error: 'Account has been deactivated. Contact T&P cell.' });

    // Step 4: Issue JWT
    const token = signToken(finalUser);

    // Step 5: Fetch student profile for greeting
    let profile = null;
    if (finalUser.role === 'student') {
      const { data: sp } = await supabase
        .from('student_profiles')
        .select('full_name, roll_number, branch, cgpa, placement_status')
        .eq('id', finalUser.id)
        .maybeSingle();
      profile = sp;
    }

   // POST /api/auth/login — replace the final res.json
res.json({ 
  token, 
  role:   finalUser.role, 
  userId: finalUser.id,        // ✅ ADD THIS
  name:   profile?.full_name || null,  // ✅ ADD THIS
  profile 
});
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', require('../middleware/auth'), async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });

  const { error } = await supabase.auth.admin.updateUserById(req.user.id, {
    password: new_password,
  });

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Password updated successfully.' });
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('id, email, role, is_active, created_at')
    .eq('id', req.user.id)
    .single();

  res.json(user);
});

// GET /api/auth/debug — TEMPORARY
router.get('/debug', async (req, res) => {
  const { data, error } = await supabase.from('users').select('*').limit(5);
  res.json({ data, error, url: process.env.SUPABASE_URL ? 'URL set' : 'MISSING', key: process.env.SUPABASE_SERVICE_KEY ? 'KEY set' : 'MISSING' });
});

module.exports = router;