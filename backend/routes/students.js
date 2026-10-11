const express = require('express');
const router = express.Router();
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

// ── Fix: import whichever name the config exports ─────────────────────────
const _supabaseModule = require('../config/supabase');
const supabase = _supabaseModule.supabaseAdmin
               || _supabaseModule.supabase
               || _supabaseModule.default
               || _supabaseModule;

// Multer: store file in memory, then upload to Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed for resume upload.'));
  },
});


// ATS PDF analysis is deliberately separate from profile-resume storage. The
// source PDF is held only in Multer memory while text is extracted, then it is
// discarded; it is never uploaded to Supabase or associated with a profile.
const ATS_MAX_PDF_BYTES = 8 * 1024 * 1024;
const atsUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ATS_MAX_PDF_BYTES, files: 1 },
});

function runAtsUpload(req, res, next) {
  atsUpload.single('document')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Choose a PDF no larger than 8 MB.' });
    }
    return res.status(400).json({ error: error.message || 'Could not read the selected PDF.' });
  });
}

function isPdfUpload(file) {
  if (!file?.buffer?.length) return false;
  const namedPdf = /\.pdf$/i.test(String(file.originalname || ''));
  const typedPdf = String(file.mimetype || '').toLowerCase() === 'application/pdf';
  // The header test blocks renamed images while still accepting Android/iOS
  // pickers that omit or generalize the MIME type.
  const header = file.buffer.subarray(0, Math.min(file.buffer.length, 1024)).toString('latin1');
  return (namedPdf || typedPdf) && header.includes('%PDF-');
}

function avatarSchemaUnavailable(error) {
  const message = String(error?.message || '');
  // Existing Supabase projects may receive the backend deployment before the
  // incremental avatar migration is applied. Keep non-avatar profile/dashboard
  // reads working during that rollout, while making the missing migration
  // visible in server logs instead of turning it into a generic 500.
  return error?.code === '42703'
    || (/(?:avatar_path|avatar_updated_at)/i.test(message)
      && /(does not exist|could not find|schema cache|column)/i.test(message));
}

async function attachOwnAvatar(profile, userId) {
  if (!profile) return profile;
  const { data: user, error } = await supabase
    .from('users')
    .select('avatar_path, avatar_updated_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    if (avatarSchemaUnavailable(error)) {
      console.warn('Avatar metadata is unavailable; apply db/migrations/006_profile_avatars.sql.', error.message);
      return { ...profile, avatar_url: null, avatar_updated_at: null };
    }
    throw error;
  }
  const updated = user?.avatar_updated_at || null;
  return {
    ...profile,
    avatar_url: user?.avatar_path
      ? `/api/auth/avatar${updated ? `?v=${encodeURIComponent(updated)}` : ''}`
      : null,
    avatar_updated_at: updated,
  };
}

// ────────────────────────────────────────────────
// GET /api/students/profile
// Own profile — student only
// ────────────────────────────────────────────────
router.get('/profile', auth, roles('student'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      // If profile doesn't exist yet, create a blank one
      if (error.code === 'PGRST116') {
        const { data: newProfile, error: insertErr } = await supabase
          .from('student_profiles')
          .insert({ id: req.user.id, full_name: req.user.name || '' })
          .select()
          .single();
        if (insertErr) return res.status(500).json({ error: insertErr.message });
        return res.json({ profile: await attachOwnAvatar(newProfile, req.user.id) });
      }
      return res.status(404).json({ error: 'Profile not found.' });
    }

    res.json({ profile: await attachOwnAvatar(data, req.user.id) });
  } catch (err) {
    console.error('GET /profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ────────────────────────────────────────────────
// PUT /api/students/profile
// Upsert own profile — creates if not exists
// ────────────────────────────────────────────────
router.put('/profile', auth, roles('student'), async (req, res) => {
  try {
    const {
      full_name, phone, branch, semester, cgpa,
      skills, certifications, linkedin_url, github_url,
      tenth_percent, twelfth_percent, backlogs, placement_status,
    } = req.body;

    const updatePayload = {
      id: req.user.id,           // needed for upsert
      full_name:       full_name       || null,
      phone:           phone           || null,
      branch:          branch          || null,
      semester:        semester        ? parseInt(semester)           : null,
      cgpa:            cgpa            ? parseFloat(cgpa)             : null,
      skills:          Array.isArray(skills)          ? skills          : [],
      certifications:  Array.isArray(certifications)  ? certifications  : [],
      linkedin_url:    linkedin_url    || null,
      github_url:      github_url      || null,
      tenth_percent:   tenth_percent   ? parseFloat(tenth_percent)    : null,
      twelfth_percent: twelfth_percent ? parseFloat(twelfth_percent)  : null,
      backlogs:        backlogs        ? parseInt(backlogs)            : 0,
      placement_status: placement_status || 'unplaced',
    };

    // Use upsert so it works even if profile row doesn't exist yet
    const { data, error } = await supabase
      .from('student_profiles')
      .upsert(updatePayload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Profile upsert error:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Profile updated successfully.', profile: await attachOwnAvatar(data, req.user.id) });
  } catch (err) {
    console.error('PUT /profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ────────────────────────────────────────────────
// POST /api/students/ats/extract-pdf
// Transient PDF-to-text extraction for the ATS guide. Unlike /resume, this
// route never persists the uploaded file or a storage URL.
// ────────────────────────────────────────────────
router.post('/ats/extract-pdf', auth, roles('student'), runAtsUpload, async (req, res) => {
  let parser = null;
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a PDF to extract.' });
    if (!isPdfUpload(req.file)) {
      return res.status(400).json({ error: 'Choose a valid PDF document.' });
    }

    parser = new PDFParse({ data: req.file.buffer });
    const parsed = await parser.getText();
    const text = String(parsed?.text || '').replace(/\u0000/g, '').trim();
    const readableLength = text.replace(/\s+/g, ' ').trim().length;
    if (readableLength < 50) {
      return res.status(422).json({
        error: 'We could not extract enough selectable text from this PDF. It may be image-scanned; paste the text instead.',
      });
    }

    res.json({
      text,
      word_count: text.split(/\s+/).filter(Boolean).length,
    });
  } catch (err) {
    console.error('POST /ats/extract-pdf error:', err?.message || err);
    res.status(422).json({
      error: 'We could not extract readable text from this PDF. It may be image-scanned or protected; paste the text instead.',
    });
  } finally {
    if (parser) await parser.destroy().catch(() => {});
  }
});

// ────────────────────────────────────────────────
// POST /api/students/resume
// Upload PDF resume to Supabase Storage
// ────────────────────────────────────────────────
router.post('/resume', auth, roles('student'), upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const fileName = `${req.user.id}/resume_${Date.now()}.pdf`;

    const { error: storageError } = await supabase.storage
      .from('resumes')
      .upload(fileName, req.file.buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (storageError) return res.status(500).json({ error: storageError.message });

    const { data: { publicUrl } } = supabase.storage
      .from('resumes')
      .getPublicUrl(fileName);

    await supabase
      .from('student_profiles')
      .upsert({ id: req.user.id, resume_url: publicUrl }, { onConflict: 'id' });

    res.json({ message: 'Resume uploaded successfully.', resume_url: publicUrl });
  } catch (err) {
    console.error('POST /resume error:', err);
    res.status(500).json({ error: 'Failed to upload resume' });
  }
});

// ────────────────────────────────────────────────
// GET /api/students/dashboard
// Aggregated stats for student dashboard
// ────────────────────────────────────────────────
router.get('/dashboard', auth, roles('student'), async (req, res) => {
  try {
    const id = req.user.id;

    const [profile, applications, aptitudeAttempts, dsaSubmissions, oaAttempts] =
      await Promise.all([
        supabase.from('student_profiles').select('*').eq('id', id).single(),
        supabase.from('applications').select('id, status, applied_at, job_postings(title, companies(name))').eq('student_id', id),
        supabase.from('aptitude_attempts').select('score, total_marks, submitted_at').eq('student_id', id).order('submitted_at', { ascending: false }).limit(10),
        supabase.from('dsa_submissions').select('status, submitted_at').eq('student_id', id),
        supabase.from('mock_oa_attempts').select('score, submitted_at').eq('student_id', id),
      ]);

    const appCounts = {
      total:       applications.data?.length || 0,
      shortlisted: applications.data?.filter(a => a.status === 'shortlisted').length || 0,
      selected:    applications.data?.filter(a => a.status === 'selected').length || 0,
      rejected:    applications.data?.filter(a => a.status === 'rejected').length || 0,
    };

    const dsaCounts = {
      total:    dsaSubmissions.data?.length || 0,
      accepted: dsaSubmissions.data?.filter(s => s.status === 'Accepted').length || 0,
    };
    const dashboardProfile = await attachOwnAvatar(profile.data || null, id);

    res.json({
      profile:             dashboardProfile,
      applications:        appCounts,
      recentApplications:  applications.data?.slice(0, 5) || [],
      aptitudeScores:      aptitudeAttempts.data || [],
      dsa:                 dsaCounts,
      oaAttempts:          oaAttempts.data?.length || 0,
    });
  } catch (err) {
    console.error('GET /dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// ────────────────────────────────────────────────
// GET /api/students/all  (admin/recruiter only)
// ────────────────────────────────────────────────
router.get('/all', auth, roles('admin', 'recruiter'), async (req, res) => {
  try {
    const { branch, min_cgpa, placement_status, search } = req.query;

    let query = supabase
      .from('student_profiles')
      .select('*, users(email, is_active)')
      .order('full_name');

    if (branch)            query = query.eq('branch', branch);
    if (min_cgpa)          query = query.gte('cgpa', parseFloat(min_cgpa));
    if (placement_status)  query = query.eq('placement_status', placement_status);
    if (search)            query = query.ilike('full_name', `%${search}%`);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('GET /all error:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// ────────────────────────────────────────────────
// GET /api/students/:id  (admin/recruiter)
// ────────────────────────────────────────────────
router.get('/:id', auth, roles('admin', 'recruiter'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Student not found.' });
    res.json(data);
  } catch (err) {
    console.error('GET /:id error:', err);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

module.exports = router;