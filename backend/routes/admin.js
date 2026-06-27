// routes/admin.js
const express = require('express');
const router = express.Router();
const  supabaseAdmin = require('../config/supabase');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const { sendAnnouncementEmail } = require('../config/email');

// ─────────────────────────────────────────────
// GET /api/admin/stats
// Overall placement statistics for admin dashboard
// ─────────────────────────────────────────────
router.get('/stats', auth, roles('admin'), async (req, res) => {
  try {
    // Run all queries in parallel
    const [
      { count: totalStudents },
      { count: placedStudents },
      { count: activeJobs },
      { count: totalApplications },
      { data: recentApps },
      { data: companyStats },
      { data: branchStats },
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabaseAdmin.from('student_profiles').select('*', { count: 'exact', head: true }).eq('placement_status', 'placed'),
      supabaseAdmin.from('job_postings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('applications').select('*', { count: 'exact', head: true }),
      supabaseAdmin
        .from('applications')
        .select('status, applied_at, student_id, job_postings(title, companies(name))')
        .order('applied_at', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('applications')
        .select('status, job_postings(companies(name))')
        .eq('status', 'selected'),
      supabaseAdmin
        .from('student_profiles')
        .select('branch, placement_status'),
    ]);

    // Placement rate
    const placementRate = totalStudents > 0
      ? Math.round((placedStudents / totalStudents) * 100)
      : 0;

    // Companies that have made offers
    const companyOffers = {};
    for (const app of companyStats || []) {
      const name = app.job_postings?.companies?.name;
      if (name) companyOffers[name] = (companyOffers[name] || 0) + 1;
    }

    // Branch-wise placement
    const branchMap = {};
    for (const s of branchStats || []) {
      if (!s.branch) continue;
      if (!branchMap[s.branch]) branchMap[s.branch] = { total: 0, placed: 0 };
      branchMap[s.branch].total++;
      if (s.placement_status === 'placed') branchMap[s.branch].placed++;
    }

    const branchWise = Object.entries(branchMap).map(([branch, d]) => ({
      branch,
      total: d.total,
      placed: d.placed,
      rate: d.total > 0 ? Math.round((d.placed / d.total) * 100) : 0,
    }));

    res.json({
      overview: {
        totalStudents,
        placedStudents,
        placementRate,
        activeJobs,
        totalApplications,
      },
      recentApplications: (recentApps || []).map(a => ({
        student: a.student_id,
        job: a.job_postings?.title,
        company: a.job_postings?.companies?.name,
        status: a.status,
        appliedAt: a.applied_at,
      })),
      topCompanies: Object.entries(companyOffers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, offers]) => ({ name, offers })),
      branchWise,
    });
  } catch (err) {
    console.error('GET /admin/stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/students
// Paginated list of all students with filters
// Query: ?branch=CSE&cgpa=7.5&status=unplaced&page=1&limit=20
// ─────────────────────────────────────────────
router.get('/students', auth, roles('admin'), async (req, res) => {
  try {
    const { branch, cgpa, status, search, page = 1, limit = 20 } = req.query;
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;

    let query = supabaseAdmin
      .from('student_profiles')
      .select(`
        id, full_name, roll_number, branch, cgpa,
        semester, phone, placement_status, resume_url,
        skills, backlogs,
        users(email, created_at)
      `, { count: 'exact' });

    if (branch) query = query.eq('branch', branch);
    if (cgpa) query = query.gte('cgpa', parseFloat(cgpa));
    if (status) query = query.eq('placement_status', status);
    if (search) query = query.or(`full_name.ilike.%${search}%,roll_number.ilike.%${search}%`);

    const { data, error, count } = await query
      .order('roll_number', { ascending: true })
      .range(from, to);

    if (error) throw error;

    res.json({
      students: data || [],
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error('GET /admin/students error:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/admin/students/:id/placement-status
// Update a student's placement status manually
// Body: { status: 'placed' | 'unplaced' | 'opted_out' }
// ─────────────────────────────────────────────
router.patch('/students/:id/placement-status', auth, roles('admin'), async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['placed', 'unplaced', 'opted_out'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const { error } = await supabaseAdmin
      .from('student_profiles')
      .update({ placement_status: status })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Placement status updated' });
  } catch (err) {
    console.error('PATCH /admin/students/:id/placement-status error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/announcements
// List all announcements
// ─────────────────────────────────────────────
router.get('/announcements', auth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .select(`
        id, title, content, priority, created_at,
        companies(name, logo_url),
        users(email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ announcements: data || [] });
  } catch (err) {
    console.error('GET /admin/announcements error:', err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/announcements
// Create a new announcement and optionally email all students
// Body: { title, content, companyId?, priority, sendEmail? }
// ─────────────────────────────────────────────
router.post('/announcements', auth, roles('admin'), async (req, res) => {
  const { title, content, companyId, priority = 'info', sendEmail = false } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required' });
  }

  try {
    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .insert({
        title,
        content,
        company_id: companyId || null,
        priority,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Optional: email all active students
    if (sendEmail) {
      const { data: students } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('role', 'student')
        .eq('is_active', true);

      if (students?.length) {
        const emails = students.map(s => s.email);
        // Fire-and-forget — don't await so response is fast
        sendAnnouncementEmail(emails, title, content, priority).catch(e =>
          console.error('Announcement email failed:', e)
        );
      }
    }

    res.status(201).json({ announcement, emailsSent: sendEmail });
  } catch (err) {
    console.error('POST /admin/announcements error:', err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/admin/announcements/:id
// ─────────────────────────────────────────────
router.delete('/announcements/:id', auth, roles('admin'), async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('announcements')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    console.error('DELETE /admin/announcements/:id error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/reports/placement
// Detailed placement report (CSV-ready data)
// ─────────────────────────────────────────────
router.get('/reports/placement', auth, roles('admin'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('student_profiles')
      .select(`
        full_name, roll_number, branch, cgpa, placement_status,
        users(email),
        applications(
          status,
          job_postings(title, package_lpa, companies(name))
        )
      `)
      .order('roll_number', { ascending: true });

    if (error) throw error;

    const report = (data || []).map(s => {
      const selectedApp = (s.applications || []).find(a => a.status === 'selected');
      return {
        name: s.full_name,
        rollNumber: s.roll_number,
        branch: s.branch,
        cgpa: s.cgpa,
        email: s.users?.email,
        placementStatus: s.placement_status,
        company: selectedApp?.job_postings?.companies?.name || '-',
        role: selectedApp?.job_postings?.title || '-',
        package: selectedApp?.job_postings?.package_lpa
          ? `${selectedApp.job_postings.package_lpa} LPA`
          : '-',
      };
    });

    // Check if CSV download is requested
    if (req.query.format === 'csv') {
      const header = Object.keys(report[0] || {}).join(',');
      const rows = report.map(r => Object.values(r).map(v => `"${v}"`).join(','));
      const csv = [header, ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="placement_report.csv"');
      return res.send(csv);
    }

    res.json({ report, total: report.length });
  } catch (err) {
    console.error('GET /admin/reports/placement error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/companies
// List all companies with recruiter info
// ─────────────────────────────────────────────
router.get('/companies', auth, roles('admin'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select(`
        id, name, website, logo_url, created_at,
        users(email),
        job_postings(id, title, status)
      `)
      .order('name', { ascending: true });

    if (error) throw error;

    const companies = (data || []).map(c => ({
      id: c.id,
      name: c.name,
      website: c.website,
      logoUrl: c.logo_url,
      recruiterEmail: c.users?.email,
      totalJobs: c.job_postings?.length || 0,
      activeJobs: (c.job_postings || []).filter(j => j.status === 'active').length,
    }));

    res.json({ companies });
  } catch (err) {
    console.error('GET /admin/companies error:', err);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/seed-aptitude
// Admin utility: seed question bank for aptitude tests
// Body: { testId, questions: [{questionText, options, correctAnswer, topic, marks, negativeMarks}] }
// ─────────────────────────────────────────────
router.post('/seed-aptitude', auth, roles('admin'), async (req, res) => {
  const { testId, questions } = req.body;

  if (!testId || !questions?.length) {
    return res.status(400).json({ error: 'testId and questions required' });
  }

  try {
    const rows = questions.map(q => ({
      test_id: testId,
      question_text: q.questionText,
      options: q.options,        // JSONB: ["option1", "option2", "option3", "option4"]
      correct_answer: q.correctAnswer,  // 0-indexed
      topic: q.topic || 'General',
      marks: q.marks || 4,
      negative_marks: q.negativeMarks || 1,
      difficulty: q.difficulty || 'medium',
    }));

    const { error } = await supabaseAdmin
      .from('aptitude_questions')
      .insert(rows);

    if (error) throw error;
    res.status(201).json({ message: `${rows.length} questions seeded` });
  } catch (err) {
    console.error('POST /admin/seed-aptitude error:', err);
    res.status(500).json({ error: 'Seeding failed' });
  }
});

module.exports = router;