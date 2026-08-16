// utils/emailTemplates.js
// All email HTML templates for the placement portal
// Used by config/email.js send functions

// ── Brand colors ──
const BRAND = {
  navy:    '#0A1628',
  blue:    '#1E3A5F',
  cyan:    '#00c8f0',
  green:   '#10c98a',
  amber:   '#f5a623',
  red:     '#f04b4b',
  gray:    '#6B7280',
  lightBg: '#F8FAFC',
};

// ── Shared wrapper ──
function wrap(bodyHtml) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>CampusReady T&amp;P Portal</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.lightBg};font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;background:#ffffff;border-radius:12px;
                      overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:${BRAND.navy};padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:${BRAND.cyan};font-size:24px;
                         letter-spacing:1px;font-family:Arial,sans-serif;">
                CampusReady
              </h1>
              <p style="margin:4px 0 0;color:#94A3B8;font-size:13px;">
                Training &amp; Placement Portal
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F1F5F9;padding:20px 32px;text-align:center;
                       border-top:1px solid #E2E8F0;">
              <p style="margin:0;color:${BRAND.gray};font-size:12px;line-height:1.6;">
                This email was sent by your college's T&amp;P Cell via CampusReady.<br/>
                Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Button helper ──
function btn(text, url, color = BRAND.cyan) {
  return `
<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background:${color};border-radius:8px;">
      <a href="${url}"
         style="display:inline-block;padding:14px 32px;
                color:#ffffff;text-decoration:none;
                font-weight:bold;font-size:15px;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

// ── Badge helper ──
function badge(text, color) {
  return `<span style="display:inline-block;padding:4px 12px;
                background:${color}22;color:${color};
                border-radius:999px;font-size:12px;font-weight:bold;">
    ${text}
  </span>`;
}

// ── Info row helper ──
function infoRow(label, value) {
  return `
<tr>
  <td style="padding:8px 0;border-bottom:1px solid #F1F5F9;">
    <span style="color:${BRAND.gray};font-size:13px;">${label}</span>
  </td>
  <td style="padding:8px 0;border-bottom:1px solid #F1F5F9;text-align:right;">
    <span style="color:#1E293B;font-size:13px;font-weight:bold;">${value}</span>
  </td>
</tr>`;
}

// ════════════════════════════════════════════════════
//  1. SHORTLIST NOTIFICATION
// ════════════════════════════════════════════════════
function shortlistTemplate({ studentName, companyName, jobTitle, driveDate, portalUrl }) {
  return wrap(`
    <h2 style="margin:0 0 8px;color:${BRAND.navy};font-size:22px;">
      🎉 Congratulations, ${studentName}!
    </h2>
    <p style="color:${BRAND.gray};margin:0 0 24px;font-size:15px;line-height:1.6;">
      You have been <strong style="color:${BRAND.green};">shortlisted</strong>
      for the upcoming placement drive.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#F8FAFC;border-radius:8px;padding:20px;margin-bottom:24px;">
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${infoRow('Company', companyName)}
            ${infoRow('Role', jobTitle)}
            ${infoRow('Drive Date', driveDate || 'To be announced')}
            ${infoRow('Status', `<span style="color:${BRAND.green};font-weight:bold;">Shortlisted ✓</span>`)}
          </table>
        </td>
      </tr>
    </table>

    <p style="color:${BRAND.gray};font-size:14px;line-height:1.6;margin:0 0 8px;">
      Please log in to your portal to confirm your attendance and check any
      pre-placement documents or instructions.
    </p>

    ${btn('Open My Portal', portalUrl || '#', BRAND.green)}

    <p style="color:${BRAND.gray};font-size:13px;font-style:italic;margin:0;">
      Best of luck for the selection process! The T&amp;P Cell is rooting for you.
    </p>
  `);
}

// ════════════════════════════════════════════════════
//  2. APPLICATION STATUS UPDATE
// ════════════════════════════════════════════════════
function applicationStatusTemplate({ studentName, companyName, jobTitle, status, portalUrl }) {
  const statusConfig = {
    applied:     { color: BRAND.cyan,   label: 'Application Received',  icon: '📩', msg: 'Your application has been received and is under review.' },
    shortlisted: { color: BRAND.green,  label: 'Shortlisted',           icon: '✅', msg: 'Congratulations! You have been shortlisted for the next round.' },
    rejected:    { color: BRAND.red,    label: 'Not Selected',          icon: '📋', msg: "Don't be discouraged — keep applying and preparing. More opportunities are coming." },
    selected:    { color: BRAND.amber,  label: 'Selected! 🎊',          icon: '🏆', msg: 'Congratulations! You have been selected. Please check your portal for next steps.' },
  };

  const cfg = statusConfig[status] || statusConfig.applied;

  return wrap(`
    <h2 style="margin:0 0 8px;color:${BRAND.navy};font-size:22px;">
      ${cfg.icon} Application Update
    </h2>
    <p style="color:${BRAND.gray};margin:0 0 20px;font-size:15px;">
      Hi ${studentName}, here's an update on your application.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#F8FAFC;border-radius:8px;padding:20px;margin-bottom:20px;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow('Company', companyName)}
          ${infoRow('Role', jobTitle)}
          ${infoRow('Status', badge(cfg.label, cfg.color))}
        </table>
      </td></tr>
    </table>

    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;
              padding:16px;background:${cfg.color}11;border-left:4px solid ${cfg.color};
              border-radius:0 8px 8px 0;">
      ${cfg.msg}
    </p>

    ${btn('View in Portal', portalUrl || '#')}
  `);
}

// ════════════════════════════════════════════════════
//  3. ANNOUNCEMENT / PLACEMENT NOTICE
// ════════════════════════════════════════════════════
function announcementTemplate({ title, content, priority = 'info', portalUrl }) {
  const priorityConfig = {
    info:    { color: BRAND.cyan,  icon: 'ℹ️',  label: 'Information' },
    urgent:  { color: BRAND.red,   icon: '🚨',  label: 'Urgent' },
    warning: { color: BRAND.amber, icon: '⚠️',  label: 'Important' },
    success: { color: BRAND.green, icon: '🎉',  label: 'Good News' },
  };

  const cfg = priorityConfig[priority] || priorityConfig.info;

  return wrap(`
    <div style="display:inline-block;background:${cfg.color}22;color:${cfg.color};
                padding:4px 14px;border-radius:999px;font-size:12px;
                font-weight:bold;margin-bottom:16px;">
      ${cfg.icon} ${cfg.label}
    </div>

    <h2 style="margin:0 0 16px;color:${BRAND.navy};font-size:20px;line-height:1.4;">
      ${title}
    </h2>

    <div style="color:#374151;font-size:14px;line-height:1.8;
                white-space:pre-wrap;margin-bottom:24px;">
      ${content}
    </div>

    ${btn('Open Portal', portalUrl || '#')}
  `);
}

// ════════════════════════════════════════════════════
//  4. WELCOME / REGISTRATION EMAIL
// ════════════════════════════════════════════════════
function welcomeTemplate({ studentName, email, role, portalUrl }) {
  const roleLabel = role === 'student' ? 'Student' : role === 'recruiter' ? 'Recruiter' : 'Admin';

  return wrap(`
    <h2 style="margin:0 0 8px;color:${BRAND.navy};font-size:22px;">
      Welcome to CampusReady! 🎓
    </h2>
    <p style="color:${BRAND.gray};margin:0 0 20px;font-size:15px;line-height:1.6;">
      Hi ${studentName}, your ${roleLabel} account has been created successfully.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#F8FAFC;border-radius:8px;padding:20px;margin-bottom:20px;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow('Email', email)}
          ${infoRow('Role', badge(roleLabel, BRAND.cyan))}
          ${infoRow('Portal', 'CampusReady T&P System')}
        </table>
      </td></tr>
    </table>

    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">
      ${role === 'student'
        ? 'You can now take aptitude tests, practice DSA problems, do mock interviews, apply for jobs, and track your placement journey.'
        : 'You can now post job openings, view applications, shortlist candidates, and manage your placement drive.'
      }
    </p>

    ${btn('Get Started', portalUrl || '#', BRAND.cyan)}
  `);
}

// ════════════════════════════════════════════════════
//  5. DRIVE REMINDER
// ════════════════════════════════════════════════════
function driveReminderTemplate({ studentName, companyName, jobTitle, driveDate, driveTime, venue, portalUrl }) {
  return wrap(`
    <h2 style="margin:0 0 8px;color:${BRAND.navy};font-size:22px;">
      ⏰ Drive Reminder — Tomorrow!
    </h2>
    <p style="color:${BRAND.gray};margin:0 0 20px;font-size:15px;line-height:1.6;">
      Hi ${studentName}, this is a reminder about your upcoming placement drive.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#F8FAFC;border-radius:8px;padding:20px;margin-bottom:20px;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow('Company', `<strong>${companyName}</strong>`)}
          ${infoRow('Role', jobTitle)}
          ${infoRow('Date', driveDate)}
          ${infoRow('Time', driveTime || 'As per schedule')}
          ${infoRow('Venue', venue || 'As per T&P Cell instructions')}
        </table>
      </td></tr>
    </table>

    <div style="background:${BRAND.amber}11;border-left:4px solid ${BRAND.amber};
                padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;">
        <strong>Checklist before you go:</strong><br/>
        ✓ Carry 3 copies of your updated resume<br/>
        ✓ Carry original mark sheets and certificates<br/>
        ✓ Dress in formal attire<br/>
        ✓ Reach the venue 30 minutes early<br/>
        ✓ Carry your college ID card
      </p>
    </div>

    ${btn('View Drive Details', portalUrl || '#', BRAND.amber)}
  `);
}

// ════════════════════════════════════════════════════
//  6. TEST RESULT SUMMARY
// ════════════════════════════════════════════════════
function testResultTemplate({ studentName, testTitle, score, totalMarks, correct, wrong, skipped, percentage, portalUrl }) {
  const grade = percentage >= 85 ? 'A' : percentage >= 70 ? 'B' : percentage >= 55 ? 'C' : percentage >= 40 ? 'D' : 'F';
  const gradeColor = percentage >= 70 ? BRAND.green : percentage >= 40 ? BRAND.amber : BRAND.red;

  return wrap(`
    <h2 style="margin:0 0 8px;color:${BRAND.navy};font-size:22px;">
      📊 Test Result — ${testTitle}
    </h2>
    <p style="color:${BRAND.gray};margin:0 0 20px;font-size:15px;">
      Hi ${studentName}, here's your performance summary.
    </p>

    <!-- Score circle -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:100px;height:100px;
                  border-radius:50%;background:${gradeColor}22;
                  border:4px solid ${gradeColor};
                  line-height:92px;font-size:28px;
                  font-weight:bold;color:${gradeColor};">
        ${percentage}%
      </div>
      <p style="margin:8px 0 0;font-size:20px;color:${gradeColor};font-weight:bold;">
        Grade: ${grade}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#F8FAFC;border-radius:8px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow('Score', `${score} / ${totalMarks}`)}
          ${infoRow('Correct', `<span style="color:${BRAND.green}">${correct}</span>`)}
          ${infoRow('Wrong', `<span style="color:${BRAND.red}">${wrong}</span>`)}
          ${infoRow('Skipped', `<span style="color:${BRAND.gray}">${skipped}</span>`)}
        </table>
      </td></tr>
    </table>

    ${btn('View Full Analysis', portalUrl || '#')}
  `);
}

// ════════════════════════════════════════════════════
//  7. EMAIL VERIFICATION CODE (OTP)
// ════════════════════════════════════════════════════
function otpTemplate({ name, code, expiryMinutes = 10 }) {
  return wrap(`
    <h2 style="margin:0 0 8px;color:${BRAND.navy};font-size:22px;">
      Verify your email
    </h2>
    <p style="color:${BRAND.gray};margin:0 0 24px;font-size:15px;line-height:1.6;">
      Hi ${name || 'there'}, use the verification code below to activate your
      CampusReady account.
    </p>

    <div style="text-align:center;margin:8px 0 24px;">
      <div style="display:inline-block;padding:18px 32px;border-radius:12px;
                  background:${BRAND.navy};color:${BRAND.cyan};
                  font-size:34px;font-weight:bold;letter-spacing:10px;
                  font-family:'Courier New',monospace;">
        ${code}
      </div>
    </div>

    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;
              padding:14px 16px;background:${BRAND.amber}11;
              border-left:4px solid ${BRAND.amber};border-radius:0 8px 8px 0;">
      This code expires in <strong>${expiryMinutes} minutes</strong>. If you did not
      create this account, you can safely ignore this email.
    </p>

    <p style="color:${BRAND.gray};font-size:13px;margin:0;">
      For your security, never share this code with anyone.
    </p>
  `);
}

// ════════════════════════════════════════════════════
//  8. NEW JOB / COMPANY ON CAMPUS
// ════════════════════════════════════════════════════
function jobOpeningTemplate({ studentName, companyName, jobTitle, packageLpa, deadline, driveDate, portalUrl }) {
  return wrap(`
    <div style="display:inline-block;background:${BRAND.green}22;color:${BRAND.green};
                padding:4px 14px;border-radius:999px;font-size:12px;
                font-weight:bold;margin-bottom:16px;">
      🏢 New Company on Campus
    </div>

    <h2 style="margin:0 0 8px;color:${BRAND.navy};font-size:22px;">
      ${companyName} is hiring!
    </h2>
    <p style="color:${BRAND.gray};margin:0 0 20px;font-size:15px;line-height:1.6;">
      Hi ${studentName || 'there'}, a new opportunity you are eligible for has just
      been approved on the placement portal.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#F8FAFC;border-radius:8px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow('Company', `<strong>${companyName}</strong>`)}
          ${infoRow('Role', jobTitle)}
          ${packageLpa ? infoRow('Package', `${packageLpa} LPA`) : ''}
          ${infoRow('Apply Before', deadline || 'See portal')}
          ${driveDate ? infoRow('Drive Date', driveDate) : ''}
        </table>
      </td></tr>
    </table>

    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 8px;">
      Log in and apply before the deadline — seats are limited.
    </p>

    ${btn('View & Apply', portalUrl || '#', BRAND.green)}
  `);
}

// ════════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
//  RECRUITMENT PIPELINE STAGE UPDATE
//  Emails the student on EVERY milestone (OA cleared, interview
//  rounds, selected, rejected) — not just terminal stages.
// ════════════════════════════════════════════════════
function stageUpdateTemplate({ studentName, companyName, jobTitle, stage, portalUrl }) {
  const STAGES = ['applied', 'oa_cleared', 'interview_1_cleared', 'interview_2_cleared', 'selected'];

  const stageConfig = {
    applied:             { color: BRAND.cyan,  icon: '📩', label: 'Application Submitted',      msg: 'Your application has been received and is under review.' },
    oa_cleared:          { color: BRAND.green, icon: '✅', label: 'Cleared Online Assessment',  msg: 'Great work! You cleared the Online Assessment and have advanced to the interview stage.' },
    interview_1_cleared: { color: BRAND.green, icon: '🗣️', label: 'Cleared Interview Round 1',   msg: 'Congratulations! You cleared Interview Round 1. Keep up the momentum for the next round.' },
    interview_2_cleared: { color: BRAND.green, icon: '🎯', label: 'Cleared Interview Round 2',   msg: 'Excellent! You cleared Interview Round 2. You are almost there — final decision coming soon.' },
    selected:            { color: BRAND.amber, icon: '🏆', label: 'Selected! 🎊',                msg: 'Congratulations! You have been selected. Please check your portal for the offer and next steps.' },
    rejected:            { color: BRAND.red,   icon: '📋', label: 'Not Selected',                msg: "This role didn't work out this time, but keep applying and preparing — more opportunities are on the way." },
  };

  const cfg = stageConfig[stage] || stageConfig.applied;

  // Simple progress tracker (hidden for a rejected outcome).
  let progressHtml = '';
  if (stage !== 'rejected') {
    const currentIdx = STAGES.indexOf(stage);
    progressHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr>
        ${STAGES.map((s, i) => {
          const done = i <= currentIdx && currentIdx >= 0;
          const dot  = done ? cfg.color : '#D1D5DB';
          return `<td align="center" style="width:20%;">
            <div style="width:14px;height:14px;border-radius:50%;background:${dot};margin:0 auto 6px;"></div>
            <div style="font-size:10px;color:${done ? BRAND.navy : BRAND.gray};line-height:1.3;">${stageConfig[s].label.replace(/ 🎊| Round/g, m => m.includes('Round') ? m : '')}</div>
          </td>`;
        }).join('')}
      </tr>
    </table>`;
  }

  return wrap(`
    <h2 style="margin:0 0 8px;color:${BRAND.navy};font-size:22px;">
      ${cfg.icon} Application Update
    </h2>
    <p style="color:${BRAND.gray};margin:0 0 20px;font-size:15px;">
      Hi ${studentName || 'there'}, your recruitment status has been updated.
    </p>

    ${progressHtml}

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#F8FAFC;border-radius:8px;padding:20px;margin-bottom:20px;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow('Company', companyName)}
          ${infoRow('Role', jobTitle)}
          ${infoRow('Status', badge(cfg.label, cfg.color))}
        </table>
      </td></tr>
    </table>

    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;
              padding:16px;background:${cfg.color}11;border-left:4px solid ${cfg.color};
              border-radius:0 8px 8px 0;">
      ${cfg.msg}
    </p>

    ${btn('View in Portal', portalUrl || '#', cfg.color)}
  `);
}

// ════════════════════════════════════════════════════
//  JOB PENDING APPROVAL (to placement officers)
//  Sent to every placement officer/admin when a recruiter
//  submits a new job, including the eligibility criteria.
// ════════════════════════════════════════════════════
function jobPendingApprovalTemplate({ officerName, companyName, jobTitle, packageLpa, jobType, deadline, driveDate, minCgpa, maxBacklogs, branches, portalUrl }) {
  const branchText = (branches && branches.length) ? branches.join(", ") : "All branches";
  const eligibility = [
    infoRow("Eligible Branches", branchText),
    infoRow("Minimum CGPA", (minCgpa || minCgpa === 0) ? String(minCgpa) : "Not specified"),
    infoRow("Max Backlogs Allowed", (maxBacklogs || maxBacklogs === 0) ? String(maxBacklogs) : "Not specified"),
  ].join("");

  return wrap(`
    <div style="display:inline-block;background:${BRAND.amber}22;color:${BRAND.amber};
                padding:4px 14px;border-radius:999px;font-size:12px;
                font-weight:bold;margin-bottom:16px;">
      📋 Action Required · Pending Approval
    </div>

    <h2 style="margin:0 0 8px;color:${BRAND.navy};font-size:22px;">
      New job awaiting your approval
    </h2>
    <p style="color:${BRAND.gray};margin:0 0 20px;font-size:15px;">
      Hi ${officerName || "Placement Officer"}, <strong>${companyName}</strong> has submitted a new
      job posting. It stays hidden from students until you approve it.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#F8FAFC;border-radius:8px;padding:20px;margin-bottom:16px;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow("Company", companyName)}
          ${infoRow("Role", jobTitle)}
          ${infoRow("Package", packageLpa ? packageLpa + " LPA" : "Not specified")}
          ${jobType ? infoRow("Type", jobType) : ""}
          ${deadline ? infoRow("Apply By", deadline) : ""}
          ${driveDate ? infoRow("Drive Date", driveDate) : ""}
        </table>
      </td></tr>
    </table>

    <p style="color:${BRAND.navy};font-size:13px;font-weight:bold;margin:0 0 8px;">
      Eligibility criteria set by the recruiter
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#F8FAFC;border-radius:8px;padding:20px;margin-bottom:20px;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${eligibility}
        </table>
      </td></tr>
    </table>

    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 4px;">
      On approval, only students matching these criteria will be notified.
    </p>

    ${btn("Review & Approve", portalUrl || "#", BRAND.amber)}
  `);
}

function jobDecisionTemplate({ recruiterName, companyName, jobTitle, packageLpa, decision, reason, deadline, driveDate, portalUrl }) {
  const approved = decision === "approve";
  const color = approved ? BRAND.green : BRAND.red;
  const label = approved ? "✅ Approved · Now live to students" : "❌ Not approved";
  const heading = approved ? "Your job posting is approved" : "Your job posting was not approved";
  const lead = approved
    ? `Great news! The placement office has approved <strong>${jobTitle}</strong>${companyName ? " at " + companyName : ""}. It is now visible to all eligible students, and matching candidates have been notified.`
    : `The placement office reviewed <strong>${jobTitle}</strong>${companyName ? " at " + companyName : ""} and did not approve it at this time. You can revise the details and submit again.`;

  return wrap(`
    <div style="display:inline-block;background:${color}22;color:${color};
                padding:4px 14px;border-radius:999px;font-size:12px;
                font-weight:bold;margin-bottom:16px;">
      ${label}
    </div>

    <h2 style="margin:0 0 8px;color:${BRAND.navy};font-size:22px;">
      ${heading}
    </h2>
    <p style="color:${BRAND.gray};margin:0 0 20px;font-size:15px;">
      Hi ${recruiterName || "Recruiter"}, ${lead}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#F8FAFC;border-radius:8px;padding:20px;margin-bottom:16px;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow("Role", jobTitle)}
          ${companyName ? infoRow("Company", companyName) : ""}
          ${packageLpa ? infoRow("Package", packageLpa + " LPA") : ""}
          ${deadline ? infoRow("Apply By", deadline) : ""}
          ${driveDate ? infoRow("Drive Date", driveDate) : ""}
        </table>
      </td></tr>
    </table>

    ${(!approved && reason) ? `
    <p style="color:${BRAND.navy};font-size:13px;font-weight:bold;margin:0 0 8px;">
      Reason from the placement office
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#FEF2F2;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <tr><td style="color:#374151;font-size:14px;line-height:1.7;">${reason}</td></tr>
    </table>` : ""}

    ${btn(approved ? "View Your Job" : "Update & Resubmit", portalUrl || "#", color)}
  `);
}

module.exports = {
  shortlistTemplate,
  jobPendingApprovalTemplate,
  jobDecisionTemplate,
  applicationStatusTemplate,
  stageUpdateTemplate,
  announcementTemplate,
  welcomeTemplate,
  driveReminderTemplate,
  testResultTemplate,
  otpTemplate,
  jobOpeningTemplate,
};