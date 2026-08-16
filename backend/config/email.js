const nodemailer = require('nodemailer');
const T = require('../utils/emailTemplates');

// ── Transporter (Gmail with App Password) ──
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password (not real password)
  },
});

// ── Verify connection on startup ──
transporter.verify((err) => {
  if (err) console.error('❌  Email transporter error:', err.message);
  else     console.log('✅  Email transporter ready');
});

const FROM   = `"CampusReady T&P" <${process.env.EMAIL_USER}>`;
const PORTAL = process.env.CLIENT_URL || 'http://localhost:3000';

// ── Low-level send ──
async function sendMail(to, subject, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[email] EMAIL_USER/EMAIL_PASS not set — skipping send to', to);
    return { skipped: true };
  }
  return transporter.sendMail({ from: FROM, to, subject, html });
}

// ── Email verification (OTP) ──
async function sendOtpEmail(to, name, code, expiryMinutes = 10) {
  return sendMail(
    to,
    `Your CampusReady verification code: ${code}`,
    T.otpTemplate({ name, code, expiryMinutes })
  );
}

// ── New job / company on campus ──
async function sendJobOpeningEmail(to, info) {
  return sendMail(
    to,
    `🏢 ${info.companyName} is hiring — ${info.jobTitle}`,
    T.jobOpeningTemplate({ ...info, portalUrl: `${PORTAL}/student/jobs` })
  );
}

// ── Application status emails (used by routes/applications.js) ──
async function sendShortlistEmail(to, studentName, companyName, jobTitle) {
  return sendMail(
    to,
    `✅ You've been shortlisted — ${companyName}`,
    T.applicationStatusTemplate({ studentName, companyName, jobTitle, status: 'shortlisted', portalUrl: PORTAL })
  );
}
async function sendSelectionEmail(to, studentName, companyName, jobTitle) {
  return sendMail(
    to,
    `🎊 Congratulations! Selected at ${companyName}`,
    T.applicationStatusTemplate({ studentName, companyName, jobTitle, status: 'selected', portalUrl: PORTAL })
  );
}
async function sendRejectionEmail(to, studentName, companyName, jobTitle) {
  return sendMail(
    to,
    `Application update — ${companyName}`,
    T.applicationStatusTemplate({ studentName, companyName, jobTitle, status: 'rejected', portalUrl: PORTAL })
  );
}

// ── Recruitment pipeline stage update (used by routes/applications.js) ──
// Emails on every milestone: oa_cleared, interview_1_cleared, interview_2_cleared, selected, rejected.
const STAGE_SUBJECTS = {
  applied:             (c) => `📩 Application received — ${c}`,
  oa_cleared:          (c) => `✅ You cleared the OA — ${c}`,
  interview_1_cleared: (c) => `🗣️ Cleared Interview Round 1 — ${c}`,
  interview_2_cleared: (c) => `🎯 Cleared Interview Round 2 — ${c}`,
  selected:            (c) => `🎊 Congratulations! Selected at ${c}`,
  rejected:            (c) => `Application update — ${c}`,
};
async function sendStageEmail(to, studentName, companyName, jobTitle, stage) {
  const subjectFn = STAGE_SUBJECTS[stage] || STAGE_SUBJECTS.applied;
  return sendMail(
    to,
    subjectFn(companyName),
    T.stageUpdateTemplate({ studentName, companyName, jobTitle, stage, portalUrl: PORTAL })
  );
}

// ── Drive reminder (used by utils/driveReminders.js scheduler) ──
async function sendDriveReminderEmail(to, info) {
  return sendMail(
    to,
    `⏰ Reminder: ${info.companyName} drive on ${info.driveDate}`,
    T.driveReminderTemplate({ ...info, portalUrl: `${PORTAL}/student/jobs` })
  );
}

// ── Job pending approval (to placement officers) — used by routes/jobs.js ──
async function sendJobPendingEmail(to, info) {
  return sendMail(
    to,
    `📋 Approval needed: ${info.jobTitle} — ${info.companyName}`,
    T.jobPendingApprovalTemplate({ ...info, portalUrl: `${PORTAL}/admin/job-approvals` })
  );
}

// ── Job decision (approve/reject) → notify the recruiter who posted it ──
async function sendJobDecisionEmail(to, info) {
  const approved = info.decision === 'approve';
  const subject = approved
    ? `✅ Approved: ${info.jobTitle} is now live`
    : `❌ Update needed: ${info.jobTitle} was not approved`;
  return sendMail(
    to,
    subject,
    T.jobDecisionTemplate({ ...info, portalUrl: `${PORTAL}/recruiter/dashboard` })
  );
}

// ── Announcement broadcast (used by routes/admin.js) ──
async function sendAnnouncementEmail(emails, title, content, priority = 'info') {
  const list = Array.isArray(emails) ? emails : [emails];
  const html = T.announcementTemplate({ title, content, priority, portalUrl: PORTAL });
  return transporter.sendMail({ from: FROM, bcc: list, subject: `📢 ${title}`, html });
}

// Export helpers as a plain object. IMPORTANT: do NOT assign module.exports = transporter,
// because that makes module.exports the same object as `transporter` and overwrites
// nodemailer's real `transporter.sendMail` with our wrapper → infinite recursion.
module.exports = {
  transporter,
  sendMail,
  sendOtpEmail,
  sendJobOpeningEmail,
  sendShortlistEmail,
  sendSelectionEmail,
  sendRejectionEmail,
  sendStageEmail,
  sendDriveReminderEmail,
  sendJobPendingEmail,
  sendJobDecisionEmail,
  sendAnnouncementEmail,
};