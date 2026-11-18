// Runtime flags intentionally use only Expo public configuration. Do not place
// credentials or production secrets in this module or any EXPO_PUBLIC_* variable.
export const DEMO_MODE = String(process.env.EXPO_PUBLIC_DEMO_MODE || '').toLowerCase() === 'true';

// The public website origin is separate from the API: OA/interview attempts
// are performed there on a laptop, not inside the mobile app. Reject release
// placeholders and loopback addresses rather than opening a dead phone link.
const configuredWebUrl = (process.env.EXPO_PUBLIC_WEB_URL || '').trim().replace(/\/$/, '');
export const WEB_APP_URL = /^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(configuredWebUrl)
  && !/(?:YOUR-|\.example$|localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(configuredWebUrl)
  ? configuredWebUrl : '';

export const DEMO_NOTICE = 'Local sample data only. No SmartHire account, API, file upload, email, or push service is used.';

// These reserved, non-deliverable addresses are labels for local sample sessions,
// not real accounts or credentials.
export const DEMO_ACCOUNTS = [
  {
    id: 'demo-student-001',
    role: 'student',
    name: 'Aarav Mehta',
    email: 'student@demo.invalid',
    label: 'Explore as Student',
    description: 'Browse sample jobs, practice activities, and local profile workflows.',
  },
  {
    id: 'demo-recruiter-001',
    role: 'recruiter',
    name: 'Mira Shah',
    email: 'recruiter@demo.invalid',
    label: 'Explore as Recruiter',
    description: 'Try local job, applicant-stage, and Company OA review workflows.',
  },
  {
    id: 'demo-admin-001',
    role: 'admin',
    name: 'Riya Nair',
    email: 'admin@demo.invalid',
    label: 'Explore as Administrator',
    description: 'Review sample approvals, student records, reports, and announcements.',
  },
];
