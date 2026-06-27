const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const auth     = require('../middleware/auth');
const roles    = require('../middleware/roles');
const supabase = require('../config/supabase');

// ── GET /api/jobs — students see approved jobs only ──────────────────────────
router.get('/', auth, async (req, res) => {
  const { branch, job_type, search } = req.query;

  // Students only see approved jobs; admin/recruiter see all
  let query = supabase
    .from('job_postings')
    .select(`id, title, description, min_cgpa, eligible_branches,
      required_skills, package_lpa, job_type, deadline, drive_date,
      max_backlogs, status, approval_status, rounds, created_at,
      companies(id, name, logo_url, website)`)
    .order('created_at', { ascending: false });

  if (req.user.role === 'student') {
    query = query.eq('status', 'active').eq('approval_status', 'approved');
  } else if (req.user.role === 'recruiter') {
    // Recruiter sees their own company's jobs regardless of approval
    const { data: company } = await supabase.from('companies').select('id').eq('recruiter_id', req.user.id).single();
    if (company) query = query.eq('company_id', company.id);
  }
  // Admin sees all

  if (job_type) query = query.eq('job_type', job_type);
  if (search)   query = query.ilike('title', `%${search}%`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  let jobs = data || [];
  if (branch) jobs = jobs.filter(j => !j.eligible_branches?.length || j.eligible_branches.includes(branch));

  // Attach application status for students
  if (req.user.role === 'student') {
    const { data: apps } = await supabase.from('applications').select('job_id, status').eq('student_id', req.user.id);
    const map = {};
    apps?.forEach(a => (map[a.job_id] = a.status));
    jobs = jobs.map(j => ({ ...j, application_status: map[j.id] || null }));
  }

  res.json(jobs);
});

// ── GET /api/jobs/pending — admin sees pending approvals ─────────────────────
router.get('/pending', auth, roles('admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('job_postings')
    .select(`*, companies(id, name, logo_url, website)`)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── GET /api/jobs/:id ─────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('job_postings').select(`*, companies(id, name, logo_url, website)`)
    .eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Job not found.' });
  res.json(data);
});

// ── POST /api/jobs — recruiter creates job (pending approval) ─────────────────
router.post('/', auth, roles('recruiter', 'admin'), [
  body('title').notEmpty(),
  body('package_lpa').isNumeric(),
  body('deadline').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, min_cgpa, eligible_branches, required_skills,
          package_lpa, job_type, deadline, drive_date, max_backlogs, rounds } = req.body;

  // Get recruiter's company
  let company_id = req.body.company_id;
  if (req.user.role === 'recruiter' && !company_id) {
    const { data: company } = await supabase.from('companies').select('id').eq('recruiter_id', req.user.id).single();
    if (!company) return res.status(403).json({ error: 'No company found for your account. Contact admin.' });
    company_id = company.id;
  }

  const { data, error } = await supabase.from('job_postings').insert({
    company_id, title, description,
    min_cgpa: parseFloat(min_cgpa) || 0,
    eligible_branches: eligible_branches || [],
    required_skills: required_skills || [],
    package_lpa: parseFloat(package_lpa),
    job_type: job_type || 'full-time',
    deadline,
    drive_date: drive_date || null,
    max_backlogs: parseInt(max_backlogs) || 0,
    rounds: rounds || '',
    status: 'active',
    approval_status: req.user.role === 'admin' ? 'approved' : 'pending', // admin posts skip approval
    posted_by: req.user.id,
  }).select().single();

  if (error) return res.status(400).json({ error: error.message });

  // Notify admin via announcement if recruiter posted
  if (req.user.role === 'recruiter') {
    await supabase.from('announcements').insert({
      title: `📋 New Job Pending Approval: ${title}`,
      content: `A recruiter has posted a new job "${title}" offering ${package_lpa} LPA. Please review and approve it in the Admin → Job Approvals section.`,
      priority: 'high',
      type: 'job_pending',
      job_id: data.id,
    }).catch(() => {}); // non-fatal
  }

  res.status(201).json({
    message: req.user.role === 'admin'
      ? 'Job posted and published.'
      : 'Job submitted for admin approval. It will be visible to students once approved.',
    job: data
  });
});

// ── PATCH /api/jobs/:id/approve — admin approves/rejects ─────────────────────
router.patch('/:id/approve', auth, roles('admin'), async (req, res) => {
  const { action, reason } = req.body; // action: 'approve' | 'reject'
  if (!['approve','reject'].includes(action)) return res.status(400).json({ error: 'action must be approve or reject' });

  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  const { data: job, error } = await supabase
    .from('job_postings')
    .update({ approval_status: newStatus, approval_note: reason || '' })
    .eq('id', req.params.id)
    .select(`*, companies(name)`)
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // If approved — create announcement for students
  if (action === 'approve') {
    await supabase.from('announcements').insert({
      title: `🎯 New Job Opening: ${job.title} at ${job.companies?.name || 'Company'}`,
      content: `${job.companies?.name || 'A company'} is hiring for ${job.title}. Package: ${job.package_lpa} LPA. Apply before ${new Date(job.deadline).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}. Check the Jobs section to apply now!`,
      priority: 'high',
      type: 'job_approved',
      job_id: job.id,
    }).catch(() => {});
  }

  res.json({ message: `Job ${newStatus}.`, job });
});

// ── PUT /api/jobs/:id — update job ───────────────────────────────────────────
router.put('/:id', auth, roles('recruiter', 'admin'), async (req, res) => {
  const allowed = ['title','description','min_cgpa','eligible_branches','required_skills',
    'package_lpa','job_type','deadline','drive_date','max_backlogs','rounds','status'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  const { data, error } = await supabase.from('job_postings').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Job updated.', job: data });
});

// ── DELETE /api/jobs/:id ─────────────────────────────────────────────────────
router.delete('/:id', auth, roles('recruiter', 'admin'), async (req, res) => {
  await supabase.from('job_postings').update({ status: 'closed' }).eq('id', req.params.id);
  res.json({ message: 'Job closed.' });
});

module.exports = router;
