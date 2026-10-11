const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const { supabaseAuth } = require('../config/supabase');
const { sendOtpEmail } = require('../config/email');
const auth = require('../middleware/auth');

// The regular client is service-role backed in this project. Use the explicitly
// named admin client when available so avatar storage never depends on a
// browser/mobile storage credential.
const supabaseAdmin = supabase.supabaseAdmin || supabase;

const OTP_TTL_MIN = 10;          // code lifetime
const OTP_MAX_ATTEMPTS = 5;      // wrong-code attempts before invalidation
const RESEND_COOLDOWN_S = 60;    // min seconds between code sends


// ── Private profile avatars -------------------------------------------------
// A common `users.avatar_path` field lets students, recruiters, and admins use
// the same authenticated photo capability. Files never receive a public URL;
// the app fetches them through the bearer-protected route below.
const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
});

function avatarMeta(user) {
  const updated = user?.avatar_updated_at || null;
  return {
    avatar_url: user?.avatar_path
      ? `/api/auth/avatar${updated ? `?v=${encodeURIComponent(updated)}` : ''}`
      : null,
    avatar_updated_at: updated,
  };
}

function avatarSchemaUnavailable(error) {
  const message = String(error?.message || '');
  return error?.code === '42703'
    || (/(?:avatar_path|avatar_updated_at)/i.test(message)
      && /(does not exist|could not find|schema cache|column)/i.test(message));
}

async function accountWithAvatar(userId, fields, lookup = 'maybeSingle') {
  const read = (includeAvatar) => {
    const selectedFields = includeAvatar ? `${fields}, avatar_path, avatar_updated_at` : fields;
    return supabase
      .from('users')
      .select(selectedFields)
      .eq('id', userId)[lookup]();
  };

  const primary = await read(true);
  if (!avatarSchemaUnavailable(primary.error)) return { ...primary, avatarSchemaMissing: false };

  // A migration may be applied just after an API deploy. Login/account reads
  // remain available without avatar metadata; avatar endpoints below return an
  // explicit setup message until migration 006 has been applied.
  console.warn('Avatar metadata is unavailable; apply db/migrations/006_profile_avatars.sql.', primary.error?.message);
  const fallback = await read(false);
  return {
    ...fallback,
    data: fallback.data ? { ...fallback.data, avatar_path: null, avatar_updated_at: null } : fallback.data,
    avatarSchemaMissing: true,
  };
}

function avatarSetupUnavailable(res) {
  return res.status(503).json({
    error: 'Profile-photo setup is not ready. Apply database migration 006_profile_avatars.sql, then try again.',
  });
}

function detectedAvatarType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', extension: 'png' };
  }
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mime: 'image/webp', extension: 'webp' };
  }
  return null;
}

function runAvatarUpload(req, res, next) {
  avatarUpload.single('avatar')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Profile photo must be 2 MB or smaller.' });
    }
    return res.status(400).json({ error: error.message || 'Could not read the selected profile photo.' });
  });
}


// Generate + store a fresh OTP for a user and email it.
async function issueOtp(userId, email, name) {
  const code = String(crypto.randomInt(100000, 1000000)); // 6 digits
  const code_hash = await bcrypt.hash(code, 10);
  const expires_at = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString();

  // Invalidate previous unconsumed codes for this user
  await supabase
    .from('email_verifications')
    .update({ consumed: true })
    .eq('user_id', userId)
    .eq('consumed', false);

  await supabase
    .from('email_verifications')
    .insert({ user_id: userId, email, code_hash, expires_at });

  await sendOtpEmail(email, name, code, OTP_TTL_MIN);
  return true;
}

const registerRules = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['student', 'recruiter', 'admin']).withMessage('Invalid role'),
  // full_name only required for students
  body('full_name').if(body('role').equals('student')).notEmpty().withMessage('Full name is required'),
];

const loginRules = [
  body('email').trim().toLowerCase().isEmail().withMessage('Invalid email'),
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

  const { email, password, role, full_name, roll_number, branch, cgpa, company_name } = req.body;

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

    await supabase.from('users').insert({ id: userId, email, role, is_active: true, email_verified: false });

    if (role === 'student') {
      const { error: profileErr } = await supabase.from('student_profiles').insert({
        id: userId,
        full_name,
        roll_number: roll_number || null,
        branch: branch || null,
        cgpa: cgpa ? parseFloat(cgpa) : null,
      });
      if (profileErr) console.error('student_profiles insert failed:', profileErr.message);
    } else if (role === 'recruiter') {
      await supabase
        .from('companies')
        .insert({ name: company_name || 'Company', recruiter_id: userId });
    }

    // Issue an email verification code (OTP)
    try {
      await issueOtp(userId, email, full_name || email.split('@')[0]);
    } catch (otpErr) {
      console.error('OTP send failed:', otpErr.message);
    }

    res.status(201).json({
      message: 'Registration successful. Enter the 6-digit code sent to your email to verify your account.',
      email,
      needsVerification: true,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', loginRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });

  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password;

  try {
    // Step 1: Authenticate with Supabase Auth
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Supabase auth error:', error.message);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    console.log('✅ Auth OK for:', data.user.email, '| ID:', data.user.id);

    // Step 2: Fetch from public.users using maybeSingle (won't throw if not found)
    const { data: userRow, error: userErr } = await accountWithAvatar(
      data.user.id,
      'id, email, role, is_active, email_verified',
    );

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

    // Block login until the email OTP has been verified
    if (finalUser.email_verified === false) {
      // Re-issue a fresh code so the user can complete verification
      try { await issueOtp(finalUser.id, finalUser.email, null); } catch (_) {}
      return res.status(403).json({
        error: 'Please verify your email. We just sent you a new 6-digit code.',
        needsVerification: true,
        email: finalUser.email,
      });
    }

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
      profile = sp ? { ...sp, ...avatarMeta(finalUser) } : null;
    }

   // POST /api/auth/login — replace the final res.json
res.json({
  token,
  role: finalUser.role,
  userId: finalUser.id,
  name: profile?.full_name || null,
  profile,
  ...avatarMeta(finalUser),
});
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/verify-email
// Body: { email, code }
router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'email and code are required.' });

  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, email_verified')
      .eq('email', email)
      .maybeSingle();

    if (!user) return res.status(404).json({ error: 'Account not found.' });
    if (user.email_verified) return res.json({ message: 'Email already verified. You can log in.' });

    const { data: rec } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('consumed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!rec) return res.status(400).json({ error: 'No active code. Please request a new one.' });

    if (new Date(rec.expires_at) < new Date()) {
      await supabase.from('email_verifications').update({ consumed: true }).eq('id', rec.id);
      return res.status(400).json({ error: 'Code expired. Please request a new one.' });
    }

    if (rec.attempts >= OTP_MAX_ATTEMPTS) {
      await supabase.from('email_verifications').update({ consumed: true }).eq('id', rec.id);
      return res.status(429).json({ error: 'Too many attempts. Please request a new code.' });
    }

    const ok = await bcrypt.compare(String(code), rec.code_hash);
    if (!ok) {
      await supabase.from('email_verifications').update({ attempts: rec.attempts + 1 }).eq('id', rec.id);
      return res.status(400).json({ error: 'Incorrect code. Please try again.' });
    }

    // Success — consume the code and mark the account verified
    await supabase.from('email_verifications').update({ consumed: true }).eq('id', rec.id);
    await supabase.from('users').update({ email_verified: true }).eq('id', user.id);

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Server error during verification.' });
  }
});

// POST /api/auth/resend-code
// Body: { email }
router.post('/resend-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required.' });

  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, email_verified')
      .eq('email', email)
      .maybeSingle();

    if (!user) return res.status(404).json({ error: 'Account not found.' });
    if (user.email_verified) return res.json({ message: 'Email already verified. You can log in.' });

    // Cooldown: reject if the last code was sent very recently
    const { data: last } = await supabase
      .from('email_verifications')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (last) {
      const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_S) {
        return res.status(429).json({
          error: `Please wait ${Math.ceil(RESEND_COOLDOWN_S - elapsed)}s before requesting another code.`,
        });
      }
    }

    await issueOtp(user.id, user.email, null);
    res.json({ message: 'A new verification code has been sent to your email.' });
  } catch (err) {
    console.error('Resend code error:', err);
    res.status(500).json({ error: 'Server error while resending code.' });
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
router.get('/me', auth, async (req, res) => {
  try {
    const { data: user, error } = await accountWithAvatar(
      req.user.id,
      'id, email, role, is_active, created_at',
      'single',
    );

    if (error || !user) return res.status(404).json({ error: 'Account not found.' });
    const { avatar_path, ...safeUser } = user;
    res.json({ ...safeUser, ...avatarMeta(user) });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    res.status(500).json({ error: 'Could not load account details.' });
  }
});

// POST /api/auth/avatar
// Stores a small verified image in the private avatars bucket for any role.
router.post('/avatar', auth, runAvatarUpload, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a profile photo to upload.' });

    const detected = detectedAvatarType(req.file.buffer);
    if (!detected) {
      return res.status(400).json({ error: 'Choose a valid JPEG, PNG, or WebP image.' });
    }
    const claimedType = String(req.file.mimetype || '').toLowerCase();
    if (claimedType && claimedType !== 'application/octet-stream' && claimedType !== detected.mime) {
      return res.status(400).json({ error: 'The selected file type does not match its image data.' });
    }

    const { data: currentUser, error: lookupError, avatarSchemaMissing } = await accountWithAvatar(
      req.user.id,
      'id',
    );
    if (avatarSchemaMissing) return avatarSetupUnavailable(res);
    if (lookupError || !currentUser) return res.status(404).json({ error: 'Account not found.' });

    const avatarPath = `${req.user.id}/avatar.${detected.extension}`;
    const { error: storageError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(avatarPath, req.file.buffer, {
        contentType: detected.mime,
        cacheControl: '0',
        upsert: true,
      });
    if (storageError) {
      console.error('Avatar storage upload error:', storageError.message);
      return res.status(500).json({ error: 'Could not save the profile photo.' });
    }

    const avatar_updated_at = new Date().toISOString();
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ avatar_path: avatarPath, avatar_updated_at })
      .eq('id', req.user.id)
      .select('avatar_path, avatar_updated_at')
      .single();

    if (updateError || !updatedUser) {
      console.error('Avatar user update error:', updateError?.message);
      // Do not expose an orphaned file when the account metadata update fails.
      await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([avatarPath]).catch(() => {});
      return res.status(500).json({ error: 'Could not update the account photo.' });
    }

    if (currentUser.avatar_path && currentUser.avatar_path !== avatarPath) {
      await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([currentUser.avatar_path]).catch(() => {});
    }

    res.json({ message: 'Profile photo updated.', ...avatarMeta(updatedUser) });
  } catch (err) {
    console.error('POST /api/auth/avatar error:', err);
    res.status(500).json({ error: 'Could not upload the profile photo.' });
  }
});

// GET /api/auth/avatar
// Delivers only the current authenticated account's photo. A browser <img>
// cannot attach the bearer token itself, so web clients load this as an Axios
// blob while React Native supplies the same header in Image.source.
router.get('/avatar', auth, async (req, res) => {
  try {
    const { data: user, error: userError, avatarSchemaMissing } = await accountWithAvatar(
      req.user.id,
      'id',
    );
    if (avatarSchemaMissing) return avatarSetupUnavailable(res);
    if (userError || !user?.avatar_path) return res.status(404).json({ error: 'No profile photo has been uploaded.' });

    const { data: object, error: downloadError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .download(user.avatar_path);
    if (downloadError || !object) return res.status(404).json({ error: 'Profile photo is unavailable.' });

    const bytes = Buffer.from(await object.arrayBuffer());
    const detected = detectedAvatarType(bytes);
    if (!detected) return res.status(500).json({ error: 'Stored profile photo is invalid.' });

    res.set({
      'Content-Type': detected.mime,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(bytes);
  } catch (err) {
    console.error('GET /api/auth/avatar error:', err);
    res.status(500).json({ error: 'Could not load the profile photo.' });
  }
});

// DELETE /api/auth/avatar
router.delete('/avatar', auth, async (req, res) => {
  try {
    const { data: user, error: lookupError, avatarSchemaMissing } = await accountWithAvatar(
      req.user.id,
      'id',
    );
    if (avatarSchemaMissing) return avatarSetupUnavailable(res);
    if (lookupError || !user) return res.status(404).json({ error: 'Account not found.' });

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_path: null, avatar_updated_at: null })
      .eq('id', req.user.id);
    if (updateError) return res.status(500).json({ error: 'Could not remove the profile photo.' });

    if (user.avatar_path) await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([user.avatar_path]).catch(() => {});
    res.json({ message: 'Profile photo removed.', avatar_url: null, avatar_updated_at: null });
  } catch (err) {
    console.error('DELETE /api/auth/avatar error:', err);
    res.status(500).json({ error: 'Could not remove the profile photo.' });
  }
});

module.exports = router;