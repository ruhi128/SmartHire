// utils/driveReminders.js
// Dependency-free scheduled sweep that emails + in-app-notifies students about
// upcoming placement drives (OA / interview dates) before they happen.
// Dedup is done via the notifications table (type='drive_reminder', metadata.jobId),
// so no extra schema column is needed and restarts never cause duplicate reminders.

const supabase = require('../config/supabase');
const { sendDriveReminderEmail } = require('../config/email');
const { notify } = require('./notify');

const ymd = (d) => d.toISOString().slice(0, 10);
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// Send a reminder to active applicants for any approved drive happening within
// `windowDays` days (inclusive of today). Returns { jobs, sent }.
async function runDriveReminderSweep({ windowDays = 1 } = {}) {
  const today = new Date();
  const start = ymd(today);
  const endDt = new Date(today);
  endDt.setDate(endDt.getDate() + windowDays);
  const end = ymd(endDt);

  // 1) Approved jobs whose drive_date falls in [today, today+windowDays].
  const { data: jobs, error: jErr } = await supabase
    .from('job_postings')
    .select('id, title, drive_date, companies(name)')
    .eq('status', 'approved')
    .not('drive_date', 'is', null)
    .gte('drive_date', start)
    .lte('drive_date', end);

  if (jErr) { console.error('[driveReminders] jobs query failed:', jErr.message); return { jobs: 0, sent: 0 }; }
  if (!jobs || !jobs.length) return { jobs: 0, sent: 0 };

  let sent = 0;

  for (const job of jobs) {
    // 2) Active applicants (skip already selected/rejected).
    const { data: apps, error: aErr } = await supabase
      .from('applications')
      .select('student_id, stage, student_profiles(full_name, users(email))')
      .eq('job_id', job.id);
    if (aErr) { console.error('[driveReminders] apps query failed:', aErr.message); continue; }

    const active = (apps || []).filter((a) => !['rejected', 'selected'].includes(a.stage));
    if (!active.length) continue;

    // 3) Dedup — who already has a drive_reminder for this job?
    const userIds = active.map((a) => a.student_id).filter(Boolean);
    let already = new Set();
    if (userIds.length) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('user_id')
        .eq('type', 'drive_reminder')
        .eq('metadata->>jobId', job.id)
        .in('user_id', userIds);
      already = new Set((existing || []).map((n) => n.user_id));
    }

    const companyName = job.companies?.name || 'The company';
    const driveDateFmt = job.drive_date ? fmtDate(job.drive_date) : 'soon';

    for (const a of active) {
      if (!a.student_id || already.has(a.student_id)) continue;

      // In-app notification.
      await notify(a.student_id, {
        title: `⏰ ${companyName} drive on ${driveDateFmt}`,
        body: `Reminder: your ${job.title} drive is on ${driveDateFmt}. Make sure you're prepared and on time.`,
        type: 'drive_reminder',
        link: '/student/jobs',
        metadata: { jobId: job.id, driveDate: job.drive_date },
      });

      // Email (best-effort).
      const email = a.student_profiles?.users?.email;
      if (email) {
        try {
          await sendDriveReminderEmail(email, {
            studentName: a.student_profiles?.full_name,
            companyName,
            jobTitle: job.title,
            driveDate: driveDateFmt,
          });
        } catch (e) {
          console.error('[driveReminders] email failed:', e.message);
        }
      }
      sent++;
    }
  }

  console.log(`[driveReminders] sweep complete — ${sent} reminder(s) across ${jobs.length} upcoming drive(s).`);
  return { jobs: jobs.length, sent };
}

// Start the periodic scheduler: a sweep shortly after boot, then every `everyHours`.
function startDriveReminderScheduler({ everyHours = 12, windowDays = 1 } = {}) {
  const run = () => runDriveReminderSweep({ windowDays }).catch((e) =>
    console.error('[driveReminders] sweep error:', e.message));
  setTimeout(run, 20 * 1000);                       // ~20s after startup
  setInterval(run, everyHours * 60 * 60 * 1000);    // then periodically
  console.log(`⏰  Drive-reminder scheduler active (every ${everyHours}h, ${windowDays}-day window).`);
}

module.exports = { runDriveReminderSweep, startDriveReminderScheduler };
