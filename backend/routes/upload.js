const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const { supabaseAdmin } = require('../config/supabase');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed.'));
  },
});

router.post('/resume', auth, roles('student'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file received.' });
    }

    const filePath = `${req.user.id}/resume_${Date.now()}.pdf`;

    const { error } = await supabaseAdmin.storage
      .from('student-resumes')
      .upload(filePath, req.file.buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (error) throw error;

    const { error: profileError } = await supabaseAdmin
      .from('student_profiles')
      .upsert(
        { id: req.user.id, resume_url: filePath },
        { onConflict: 'id' }
      );

    if (profileError) {
      await supabaseAdmin.storage
        .from('student-resumes')
        .remove([filePath]);

      throw profileError;
    }
    res.json({ path: filePath });
  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(500).json({ error: err.message || 'Resume upload failed.' });
  }
});

// Recruiter job documents remain in the existing public bucket.
router.post('/job-doc', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' });

    const kind = req.body.kind === 'eval' ? 'eval' : 'jd';
    const filename = `job-docs/${req.user.id}/${kind}_${Date.now()}.pdf`;

    const { error } = await supabaseAdmin.storage
      .from('resumes')
      .upload(filename, req.file.buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabaseAdmin.storage
      .from('resumes')
      .getPublicUrl(filename);

    res.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error('Job-doc upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;