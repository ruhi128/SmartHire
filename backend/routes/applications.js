const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const supabase = require('../config/supabase');
const { sendShortlistEmail, sendSelectionEmail, sendRejectionEmail } = require('../config/email');
const { notify } = require('../utils/notify');

// Ordered recruitment pipeline stages + display metadata
const STAGE_ORDER = ['applied', 'oa_cleared', 'interview_1_cleared', 'interview_2_cleared', 'selected', 'rejected'];
const STAGE_LABEL = {
  applied:              'Application submitted',
  oa_cleared:           'Cleared Online Assessment',
  interview_1_cleared:  'Cleared Interview Round 1',
  interview_2_cleared:  'Cleared Interview Round 2',
  selected:             'Selected 🎉',
  rejected:             'Not selected',
};
// Map a pipeline stage to the coarse application status
function stageToStatus(stage) {
  if (stage === 'selected') return 'selected';
  if (stage === 'rejected') return 'rejected';
  if (stage === 'applied')  return 'applied';
  return 'shortlisted';
}

// ────────────────────────────────────────────────
// POST /api/applications
// Student applies to a job
// ────────────────────────────────────────────────
router.post('/', auth, roles('student'), async (req, res) => {
  const { job_id } = req.body;
  if (!job_id) return res.status(400).json({ error: 'job_id is required.' });

  // Check job exists and is active
  const { data: job } = await supabase
    .from('job_postings')
    .select('id, title, status, min_cgpa, max_backlogs, eligible_branches, deadline, companies(name)')
    .eq('id', job_id)
    .single();

  if (!job) return res.status(404).json({ error: 'Job not found.' });
  if (job.status !== 'active') return res.status(400).json({ error: 'This job is no longer accepting applications.' });
  if (job.deadline && new Date(job.deadline) < new Date())
    return res.status(400).json({ error: 'Application deadline has passed.' });

  // Check student eligibility
  const { data: profile } = await supabase
    .from('student_profiles')
    .select('cgpa, backlogs, branch')
    .eq('id', req.user.id)
    .single();

  if (!profile) return res.status(404).json({ error: 'Student profile not found.' });

  if (profile.cgpa < job.min_cgpa)
    return res.status(403).json({ error: `Minimum CGPA required: ${job.min_cgpa}. Your CGPA: ${profile.cgpa}.` });

  if (profile.backlogs > job.max_backlogs)
    return res.status(403).json({ error: `Maximum backlogs allowed: ${job.max_backlogs}. You have: ${profile.backlogs}.` });

  if (job.eligible_branches?.length && !job.eligible_branches.includes(profile.branch))
    return res.status(403).json({ error: `Your branch (${profile.branch}) is not eligible for this job.` });

  // Insert application (UNIQUE constraint will prevent duplicate)
  const { data, error } = await supabase
    .from('applications')
    .insert({ student_id: req.user.id, job_id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') // unique violation
      return res.status(409).json({ error: 'You have already applied to this job.' });
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({ message: 'Application submitted successfully.', application: data });
});

// ────────────────────────────────────────────────
// GET /api/applications/my
// Student: see all own applications
// ────────────────────────────────────────────────
router.get('/my', auth, roles('student'), async (req, res) => {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      id, job_id, status, stage, stage_history, applied_at, updated_at,
      job_postings(id, title, package_lpa, drive_date, companies(name, logo_url))
    `)
    .eq('student_id', req.user.id)
    .order('applied_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ────────────────────────────────────────────────
// GET /api/applications/job/:jobId
// Recruiter / admin: see all applicants for a job
// ────────────────────────────────────────────────
router.get('/job/:jobId', auth, roles('recruiter', 'admin'), async (req, res) => {
  const { status } = req.query;

  let query = supabase
    .from('applications')
    .select(`
      id, status, stage, stage_history, applied_at,
      student_profiles(
        full_name, roll_number, branch, cgpa, backlogs,
        skills, resume_url, linkedin_url, github_url, phone,
        users(email)
      )
    `)
    .eq('job_id', req.params.jobId)
    .order('applied_at');

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ────────────────────────────────────────────────
// PATCH /api/applications/:id/status
// Recruiter / admin: update application status
// ────────────────────────────────────────────────
router.patch('/:id/status', auth, roles('recruiter', 'admin'), async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['applied', 'shortlisted', 'rejected', 'selected', 'on_hold'];

  if (!validStatuses.includes(status))
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });

  // Get full application details for notification
  const { data: app } = await supabase
    .from('applications')
    .select(`
      id, student_id,
      student_profiles(full_name, users(email)),
      job_postings(title, companies(name))
    `)
    .eq('id', req.params.id)
    .single();

  if (!app) return res.status(404).json({ error: 'Application not found.' });

  // Update status
  const { data, error } = await supabase
    .from('applications')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // Send email notification
  const studentEmail = app.student_profiles?.users?.email;
  const studentName  = app.student_profiles?.full_name;
  const companyName  = app.job_postings?.companies?.name;
  const jobTitle     = app.job_postings?.title;

  try {
    if (status === 'shortlisted')
      await sendShortlistEmail(studentEmail, studentName, companyName, jobTitle);
    else if (status === 'selected')
      await sendSelectionEmail(studentEmail, studentName, companyName, jobTitle);
    else if (status === 'rejected')
      await sendRejectionEmail(studentEmail, studentName, companyName, jobTitle);
  } catch (emailErr) {
    console.error('Email notification failed:', emailErr.message);
    // Don't fail the request if email fails
  }

  // If selected, update student placement_status
  if (status === 'selected') {
    await supabase
      .from('student_profiles')
      .update({ placement_status: 'placed' })
      .eq('id', app.student_id);
  }

  // In-app notification for the student
  notify(app.student_id, {
    title: `${companyName || 'Company'} — application ${status}`,
    body: `Your application for ${jobTitle || 'the role'} is now: ${status}.`,
    type: status === 'selected' ? 'selected' : status === 'rejected' ? 'rejected' : 'stage_advanced',
    link: '/student/jobs',
    metadata: { applicationId: app.id, status },
  });

  res.json({ message: `Status updated to ${status}.`, application: data });
});

// ────────────────────────────────────────────────
// PATCH /api/applications/:id/stage
// Recruiter / admin: advance a candidate through the recruitment pipeline
// Body: { stage }  — one of STAGE_ORDER
// ────────────────────────────────────────────────
router.patch('/:id/stage', auth, roles('recruiter', 'admin'), async (req, res) => {
  const { stage } = req.body;
  if (!STAGE_ORDER.includes(stage))
    return res.status(400).json({ error: `Invalid stage. Must be one of: ${STAGE_ORDER.join(', ')}` });

  // Load application + context for notification/email
  const { data: app } = await supabase
    .from('applications')
    .select(`
      id, student_id, stage, stage_history,
      student_profiles(full_name, users(email)),
      job_postings(title, companies(name))
    `)
    .eq('id', req.params.id)
    .single();

  if (!app) return res.status(404).json({ error: 'Application not found.' });

  const now = new Date().toISOString();
  const history = Array.isArray(app.stage_history) ? app.stage_history : [];
  history.push({ stage, at: now });

  const { data, error } = await supabase
    .from('applications')
    .update({ stage, status: stageToStatus(stage), stage_history: history, updated_at: now })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  const companyName = app.job_postings?.companies?.name || 'The company';
  const jobTitle    = app.job_postings?.title || 'the role';
  const studentName = app.student_profiles?.full_name;
  const studentEmail = app.student_profiles?.users?.email;

  // In-app notification for the student
  notify(app.student_id, {
    title: `${companyName} — ${STAGE_LABEL[stage]}`,
    body: `Your application for ${jobTitle} moved to: ${STAGE_LABEL[stage]}.`,
    type: stage === 'selected' ? 'selected' : stage === 'rejected' ? 'rejected' : 'stage_advanced',
    link: '/student/jobs',
    metadata: { applicationId: app.id, stage },
  });

  // Emails only on terminal stages to avoid spam
  try {
    if (stage === 'selected')      await sendSelectionEmail(studentEmail, studentName, companyName, jobTitle);
    else if (stage === 'rejected') await sendRejectionEmail(studentEmail, studentName, companyName, jobTitle);
  } catch (e) {
    console.error('Stage email failed:', e.message);
  }

  // Keep placement status in sync on selection
  if (stage === 'selected') {
    await supabase.from('student_profiles').update({ placement_status: 'placed' }).eq('id', app.student_id);
  }

  res.json({ message: `Stage updated to ${STAGE_LABEL[stage]}.`, application: data });
});

// ────────────────────────────────────────────────
// DELETE /api/applications/:id
// Student withdraws application (only if status = 'applied')
// ────────────────────────────────────────────────
router.delete('/:id', auth, roles('student'), async (req, res) => {
  const { data: app } = await supabase
    .from('applications')
    .select('status, student_id')
    .eq('id', req.params.id)
    .single();

  if (!app) return res.status(404).json({ error: 'Application not found.' });
  if (app.student_id !== req.user.id) return res.status(403).json({ error: 'Not your application.' });
  if (app.status !== 'applied') return res.status(400).json({ error: 'Cannot withdraw — application is already being processed.' });

  await supabase.from('applications').delete().eq('id', req.params.id);
  res.json({ message: 'Application withdrawn.' });
});

module.exports = router;