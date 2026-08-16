const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const auth     = require('../middleware/auth');
const roles    = require('../middleware/roles');
const supabase = require('../config/supabase');
const { sendJobOpeningEmail, sendJobPendingEmail, sendJobDecisionEmail } = require('../config/email');
const { notify, notifyMany } = require('../utils/notify');

// Find students eligible for a job (branch + cgpa + backlogs) with their email.
async function findEligibleStudents(job) {
  const { data: students } = await supabase
    .from('student_profiles')
    .select('id, full_name, branch, cgpa, backlogs, users(email, is_active)')
    .gte('cgpa', job.min_cgpa || 0);

  const branches = job.eligible_branches || [];
  return (students || []).filter((s) => {
    if (s.users?.is_active === false) return false;
    const branchOk = !branches.length || branches.includes(s.branch);
    const backlogOk = (s.backlogs ?? 0) <= (job.max_backlogs ?? 99);
    return branchOk && backlogOk;
  });
}

// Notify + email eligible students that a company is on campus (job approved).
async function announceJobToStudents(job) {
  try {
    const eligible = await findEligibleStudents(job);
    console.log(`[announceJobToStudents] "${job.title}" → ${eligible.length} eligible student(s) (min_cgpa=${job.min_cgpa}, max_backlogs=${job.max_backlogs}, branches=${JSON.stringify(job.eligible_branches || [])})`);
    if (!eligible.length) {
      console.warn(`[announceJobToStudents] no eligible students matched "${job.title}" — check that student profiles have branch/cgpa set.`);
      return;
    }

    const companyName = job.companies?.name || 'A company';
    const deadline = job.deadline
      ? new Date(job.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;

    // In-app notifications (bulk)
    await notifyMany(
      eligible.map((s) => s.id),
      {
        title: `🏢 ${companyName} is hiring — ${job.title}`,
        body: `${job.package_lpa ? job.package_lpa + ' LPA. ' : ''}Apply before ${deadline || 'the deadline'}.`,
        type: 'job_posted',
        link: '/student/jobs',
        metadata: { jobId: job.id },
      }
    );

    // Emails — awaited sequentially and logged so delivery is observable.
    let sent = 0, skipped = 0;
    for (const s of eligible) {
      if (!s.users?.email) { skipped += 1; continue; }
      try {
        await sendJobOpeningEmail(s.users.email, {
          studentName: s.full_name,
          companyName,
          jobTitle: job.title,
          packageLpa: job.package_lpa,
          deadline,
          driveDate: job.drive_date
            ? new Date(job.drive_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : null,
        });
        sent += 1;
        console.log(`[announceJobToStudents] ✅ job-opening email sent to ${s.users.email} for "${job.title}"`);
      } catch (e) {
        console.error(`[announceJobToStudents] ❌ email to ${s.users.email} failed: ${e.message}`);
      }
    }
    console.log(`[announceJobToStudents] emailed ${sent}/${eligible.length} eligible student(s) for "${job.title}"${skipped ? ` (${skipped} had no email)` : ''}`);
  } catch (err) {
    console.error('announceJobToStudents error:', err.message);
  }
}

// Email + in-app notify every active placement officer (admin) that a recruiter
// has submitted a new job that needs their approval.
async function notifyPlacementOfficers(job) {
  try {
    const { data: officers } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'admin')
      .eq('is_active', true);

    if (!officers || !officers.length) {
      console.warn('[notifyPlacementOfficers] no active placement officers found');
      return;
    }

    // Resolve company name for a friendlier message.
    let companyName = 'A recruiter';
    if (job.company_id) {
      const { data: co } = await supabase
        .from('companies').select('name').eq('id', job.company_id).single();
      if (co?.name) companyName = co.name;
    }

    const deadline = job.deadline
      ? new Date(job.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
    const driveDate = job.drive_date
      ? new Date(job.drive_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;

    // In-app notification for each officer.
    await notifyMany(officers.map((o) => o.id), {
      title: `📋 New job pending approval: ${job.title}`,
      body: `${companyName} submitted "${job.title}"${job.package_lpa ? ` (${job.package_lpa} LPA)` : ''}. Review it in Job Approvals.`,
      type: 'job_pending',
      link: '/admin/job-approvals',
      metadata: { jobId: job.id },
    });

    // Email each officer sequentially and log the outcome so delivery is
    // observable (Gmail SMTP is happier with serial sends than a burst).
    let sent = 0;
    for (const o of officers) {
      if (!o.email) continue;
      try {
        await sendJobPendingEmail(o.email, {
          officerName: null,
          companyName,
          jobTitle: job.title,
          packageLpa: job.package_lpa,
          jobType: job.job_type,
          deadline,
          driveDate,
          minCgpa: job.min_cgpa,
          maxBacklogs: job.max_backlogs,
          branches: job.eligible_branches || [],
        });
        sent += 1;
        console.log(`[notifyPlacementOfficers] ✅ pending-approval email sent to ${o.email} for "${job.title}"`);
      } catch (e) {
        console.error(`[notifyPlacementOfficers] ❌ email to ${o.email} failed: ${e.message}`);
      }
    }
    console.log(`[notifyPlacementOfficers] emailed ${sent}/${officers.length} officer(s) for "${job.title}"`);
  } catch (err) {
    console.error('notifyPlacementOfficers error:', err.message);
  }
}

// Notify the recruiter who posted a job that it was approved or rejected.
// In-app notification + email (with the officer's reason when rejected).
async function notifyRecruiterDecision(job, action, reason) {
  try {
    const recruiterId = job.posted_by;
    if (!recruiterId) return;

    const { data: recruiter } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', recruiterId)
      .single();
    if (!recruiter) return;

    const approved = action === 'approve';
    const companyName = job.companies?.name || '';

    await notify(recruiterId, {
      title: approved
        ? `✅ Job approved: ${job.title}`
        : `❌ Job not approved: ${job.title}`,
      body: approved
        ? `Your posting "${job.title}" is now live and eligible students have been notified.`
        : `Your posting "${job.title}" was not approved.${reason ? ` Reason: ${reason}` : ''}`,
      type: approved ? 'job_approved' : 'job_rejected',
      link: '/recruiter/dashboard',
      metadata: { jobId: job.id },
    });

    if (recruiter.email) {
      const deadline = job.deadline
        ? new Date(job.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;
      const driveDate = job.drive_date
        ? new Date(job.drive_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;
      try {
        await sendJobDecisionEmail(recruiter.email, {
          recruiterName: null,
          companyName,
          jobTitle: job.title,
          packageLpa: job.package_lpa,
          decision: action,
          reason: reason || '',
          deadline,
          driveDate,
        });
        console.log(`[notifyRecruiterDecision] ✅ ${action} email sent to ${recruiter.email} for "${job.title}"`);
      } catch (e) {
        console.error(`[notifyRecruiterDecision] ❌ email to ${recruiter.email} failed: ${e.message}`);
      }
    }
  } catch (err) {
    console.error('notifyRecruiterDecision error:', err.message);
  }
}

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
          package_lpa, job_type, deadline, drive_date, max_backlogs, rounds,
          jd_doc_url, eval_doc_url } = req.body;

  // Get recruiter's company
  let company_id = req.body.company_id;
  if (req.user.role === 'recruiter' && !company_id) {
    const { data: company } = await supabase.from('companies').select('id').eq('recruiter_id', req.user.id).single();
    if (!company) return res.status(403).json({ error: 'No company found for your account. Contact admin.' });
    company_id = company.id;
  }

  const jobRow = {
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
    jd_doc_url: jd_doc_url || null,
    eval_doc_url: eval_doc_url || null,
    status: 'active',
    approval_status: req.user.role === 'admin' ? 'approved' : 'pending', // admin posts skip approval
    posted_by: req.user.id,
  };

  let { data, error } = await supabase.from('job_postings').insert(jobRow).select().single();

  // Resilience: if the doc columns aren't migrated yet, retry without them so
  // job posting never breaks. (Migration 004 adds jd_doc_url / eval_doc_url.)
  if (error && /jd_doc_url|eval_doc_url|column/i.test(error.message)) {
    console.warn('[POST /jobs] doc columns missing, retrying without them:', error.message);
    delete jobRow.jd_doc_url;
    delete jobRow.eval_doc_url;
    ({ data, error } = await supabase.from('job_postings').insert(jobRow).select().single());
  }

  if (error) return res.status(400).json({ error: error.message });

  // Notify placement officers (admins) when a recruiter posts.
  // Admin-posted jobs skip this (they're auto-approved and need no review).
  if (req.user.role === 'recruiter') {
    // Keep the admin-only announcement (hidden from students) for the audit trail.
    const { error: annErr } = await supabase.from('announcements').insert({
      title: `📋 New Job Pending Approval: ${title}`,
      content: `A recruiter has posted a new job "${title}" offering ${package_lpa} LPA. Please review and approve it in the Admin → Job Approvals section.`,
      priority: 'high',
      type: 'job_pending',
      job_id: data.id,
    });
    if (annErr) console.error('job_pending announcement insert failed:', annErr.message); // non-fatal

    // Email + in-app notify every placement officer.
    notifyPlacementOfficers(data); // fire-and-forget
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

  // If approved — notify ONLY eligible students (branch + CGPA + backlog match).
  // No global announcement is created, so ineligible students are never notified.
  if (action === 'approve') {
    announceJobToStudents(job); // fire-and-forget: targeted email + in-app to eligible students
  }

  // Always inform the recruiter of the decision (approved or rejected).
  notifyRecruiterDecision(job, action, reason); // fire-and-forget

  res.json({ message: `Job ${newStatus}.`, job });
});

// ── PUT /api/jobs/:id — update job ───────────────────────────────────────────
router.put('/:id', auth, roles('recruiter', 'admin'), async (req, res) => {
  const allowed = ['title','description','min_cgpa','eligible_branches','required_skills',
    'package_lpa','job_type','deadline','drive_date','max_backlogs','rounds','status',
    'jd_doc_url','eval_doc_url'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  let { data, error } = await supabase.from('job_postings').update(updates).eq('id', req.params.id).select().single();
  if (error && /jd_doc_url|eval_doc_url|column/i.test(error.message)) {
    delete updates.jd_doc_url;
    delete updates.eval_doc_url;
    ({ data, error } = await supabase.from('job_postings').update(updates).eq('id', req.params.id).select().single());
  }
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Job updated.', job: data });
});

// ── DELETE /api/jobs/:id ─────────────────────────────────────────────────────
router.delete('/:id', auth, roles('recruiter', 'admin'), async (req, res) => {
  await supabase.from('job_postings').update({ status: 'closed' }).eq('id', req.params.id);
  res.json({ message: 'Job closed.' });
});

module.exports = router;
