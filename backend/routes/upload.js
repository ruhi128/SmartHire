// backend/routes/upload.js
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const multer  = require('multer');
const upload  = multer({ storage: multer.memoryStorage() });

router.post('/resume', auth, upload.single('file'), async (req, res) => {
  try {
    console.log('✅ Upload route hit');
    console.log('User:', req.user?.id);
    console.log('File:', req.file?.size, 'bytes');
    console.log('supabaseAdmin:', !!supabaseAdmin); // is it defined?

    if (!req.file) {
      return res.status(400).json({ error: 'No file received' });
    }

    const userId   = req.user.id;
    const buffer   = req.file.buffer;
    const filename = `${userId}/resume_${Date.now()}.pdf`;

    console.log('Uploading to path:', filename);

    const { data, error } = await supabaseAdmin.storage
      .from('resumes')
      .upload(filename, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    console.log('Upload result:', { data, error });

    if (error) throw error;

    const { data: urlData } = supabaseAdmin.storage
      .from('resumes')
      .getPublicUrl(filename);

    console.log('✅ Upload success:', urlData.publicUrl);
    res.json({ url: urlData.publicUrl });

  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload/job-doc
// Recruiter uploads a job document (JD PDF or evaluation-details PDF).
// Stored in the existing public `resumes` bucket under a `job-docs/<userId>/` prefix.
// Body: multipart/form-data with `file` (PDF) and optional `kind` = 'jd' | 'eval'.
router.post('/job-doc', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' });
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed.' });
    }
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large (max 10 MB).' });
    }

    const kind     = (req.body.kind === 'eval') ? 'eval' : 'jd';
    const filename = `job-docs/${req.user.id}/${kind}_${Date.now()}.pdf`;

    const { error } = await supabaseAdmin.storage
      .from('resumes')
      .upload(filename, req.file.buffer, { contentType: 'application/pdf', upsert: true });
    if (error) throw error;

    const { data: urlData } = supabaseAdmin.storage.from('resumes').getPublicUrl(filename);
    res.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error('❌ Job-doc upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;