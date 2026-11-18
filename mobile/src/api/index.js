import api from './client';
import { DEMO_MODE } from '../config/runtime';
import { mockApi } from './mockApi';

const result = (request) => request.then((response) => response.data);
// Keep ordinary screens responsive while allowing file uploads and trusted
// server-side assessment grading/code execution to finish on slower networks.
const LONG_OPERATION = { timeout: 120000 };

// Keep the live API definitions explicit. They are selected only when the
// strictly opt-in public demo flag is absent/false.
const liveAuthApi = {
  register: (data) => result(api.post('/api/auth/register', data)),
  login: (email, password) => result(api.post('/api/auth/login', { email, password })),
  verifyEmail: (email, code) => result(api.post('/api/auth/verify-email', { email, code })),
  resendCode: (email) => result(api.post('/api/auth/resend-code', { email })),
  changePassword: (new_password) => result(api.post('/api/auth/change-password', { new_password })),
  // NOTE: never set 'Content-Type: multipart/form-data' manually in React
  // Native — axios/fetch must generate it with the multipart boundary, or
  // Android uploads arrive unparseable at multer. Same for every upload below.
  uploadAvatar: (formData) => result(api.post('/api/auth/avatar', formData, LONG_OPERATION)),
  removeAvatar: () => result(api.delete('/api/auth/avatar')),
};

const liveNotificationsApi = {
  list: (params) => result(api.get('/api/notifications', { params })),
  unreadCount: () => result(api.get('/api/notifications/unread-count')),
  markRead: (id) => result(api.patch(`/api/notifications/${id}/read`)),
  markAllRead: () => result(api.patch('/api/notifications/read-all')),
  remove: (id) => result(api.delete(`/api/notifications/${id}`)),
  // The server derives the recipient from the bearer token; the app never
  // sends a user ID with a device registration.
  registerDevice: (data, sessionToken) => result(api.post('/api/notifications/devices', data, {
    ...(sessionToken ? { headers: { Authorization: `Bearer ${sessionToken}` }, skipUnauthorizedLogout: true } : {}),
  })),
  // Use the initiating account's token even if another account signs in while
  // this request is in flight. Logout still finishes when the API is offline.
  unregisterDevice: (expoPushToken, sessionToken) => result(api.delete('/api/notifications/devices', {
    data: { expoPushToken },
    ...(sessionToken ? { headers: { Authorization: `Bearer ${sessionToken}` } } : {}),
    skipUnauthorizedLogout: true,
  })),
};

const liveStudentApi = {
  dashboard: () => result(api.get('/api/students/dashboard')),
  profile: () => result(api.get('/api/students/profile')),
  updateProfile: (data) => result(api.put('/api/students/profile', data)),
  uploadResume: (formData) => result(api.post('/api/students/resume', formData, LONG_OPERATION)),
  // ATS source PDFs are parsed transiently by the server and are never saved
  // as the profile resume or uploaded to storage.
  extractAtsPdf: (formData) => result(api.post('/api/students/ats/extract-pdf', formData, LONG_OPERATION)),
  all: (params) => result(api.get('/api/students/all', { params })),
  byId: (id) => result(api.get(`/api/students/${id}`)),
};

const liveJobsApi = {
  list: (params) => result(api.get('/api/jobs', { params })),
  byId: (id) => result(api.get(`/api/jobs/${id}`)),
  create: (data) => result(api.post('/api/jobs', data)),
  update: (id, data) => result(api.put(`/api/jobs/${id}`, data)),
  pending: () => result(api.get('/api/jobs/pending')),
  approve: (id, action, reason) => result(api.patch(`/api/jobs/${id}/approve`, { action, reason })),
  // Job PDFs are uploaded before the job record is created, matching the web
  // workflow. The authenticated server stores the file and returns its public
  // URL; no storage credential is ever present in the app.
  uploadDoc: (formData) => result(api.post('/api/upload/job-doc', formData, LONG_OPERATION)),
  // GET /api/jobs is already scoped to the authenticated recruiter's company.
  myJobs: () => result(api.get('/api/jobs')),
};

const liveApplicationsApi = {
  apply: (job_id) => result(api.post('/api/applications', { job_id })),
  mine: () => result(api.get('/api/applications/my')),
  byJob: (jobId) => result(api.get(`/api/applications/job/${jobId}`)),
  updateStatus: (id, status) => result(api.patch(`/api/applications/${id}/status`, { status })),
  updateStage: (id, stage) => result(api.patch(`/api/applications/${id}/stage`, { stage })),
};

// Timed student assessments use the same protected test/start/submit contracts
// as the website. Each native attempt screen owns only presentation and never
// receives answer keys before submission.
const liveAptitudeApi = {
  tests: () => result(api.get('/api/aptitude/tests')),
  start: (id) => result(api.get(`/api/aptitude/tests/${id}/start`)),
  submit: (data) => result(api.post('/api/aptitude/submit', data, LONG_OPERATION)),
  analysis: () => result(api.get('/api/aptitude/analysis')),
};

const liveDsaApi = {
  problems: (params) => result(api.get('/api/dsa/problems', { params })),
  problem: (id) => result(api.get(`/api/dsa/problems/${id}`)),
  // Legacy stdin/stdout calls remain available for web-compatible problems.
  run: (data) => result(api.post('/api/dsa/run', data, LONG_OPERATION)),
  submit: (data) => result(api.post('/api/dsa/submit', data, LONG_OPERATION)),
  // Mobile LeetCode-style calls explicitly opt into the backend's trusted
  // function/class driver. The app sends only arguments for Run; the backend
  // owns method names, expected values, comparisons, and submission tests.
  runFunction: (data) => result(api.post('/api/dsa/run', { ...data, executionMode: 'function' }, LONG_OPERATION)),
  submitFunction: (data) => result(api.post('/api/dsa/submit', { ...data, executionMode: 'function' }, LONG_OPERATION)),
  performance: () => result(api.get('/api/dsa/performance')),
};

const liveMockOaApi = {
  tests: () => result(api.get('/api/mockoa/tests')),
  test: (id) => result(api.get(`/api/mockoa/tests/${id}`)),
  submit: (data) => result(api.post('/api/mockoa/submit', data, LONG_OPERATION)),
  history: () => result(api.get('/api/mockoa/history')),
  attemptResult: async (attemptId) => {
    try {
      return await result(api.get(`/api/mockoa/history/${encodeURIComponent(attemptId)}`));
    } catch (error) {
      // Older deployed APIs have the authenticated history list but not the
      // new detail route. A read-only, student-owned summary is still useful;
      // never invent a score or expose any raw/private answer fields.
      if (error?.response?.status !== 404 || error?.response?.data?.error !== 'Route not found') throw error;
      const payload = await result(api.get('/api/mockoa/history'));
      const saved = (Array.isArray(payload?.history) ? payload.history : [])
        .find((item) => String(item.id) === String(attemptId));
      if (!saved) throw new Error('Saved Mock OA result detail needs a backend update. Ask the backend owner to deploy /api/mockoa/history/:attemptId.');
      const { id, testId, testTitle, company, score, totalPossible, percentage, passed, correct, wrong, skipped, submittedAt, integrityScore } = saved;
      return {
        attempt: { id, testId, testTitle, company, score, totalPossible, percentage, passed, correct, wrong, skipped, submittedAt, integrityScore },
        summaryOnly: true,
      };
    }
  },
  upload: (data) => result(api.post('/api/mockoa/upload', data, LONG_OPERATION)),
  myUploads: () => result(api.get('/api/mockoa/my-uploads')),
  pending: () => result(api.get('/api/mockoa/pending')),
  approve: (id) => result(api.patch(`/api/mockoa/${id}/approve`)),
  reject: (id, reason) => result(api.patch(`/api/mockoa/${id}/reject`, { reason })),
};

const liveCompanyOaApi = {
  mine: () => result(api.get('/api/companyoa/my')),
  submit: (data) => result(api.post('/api/companyoa/submit', data)),
  remove: (id) => result(api.delete(`/api/companyoa/${id}`)),
  pending: () => result(api.get('/api/companyoa/pending')),
  all: () => result(api.get('/api/companyoa/all')),
  questions: (id) => result(api.get(`/api/companyoa/${id}/questions`)),
  approve: (id, action, note) => result(api.patch(`/api/companyoa/${id}/approve`, { action, note })),
  // Student attempt endpoints intentionally omit answer keys until submission.
  available: () => result(api.get('/api/companyoa/available')),
  history: () => result(api.get('/api/companyoa/history')),
  attemptResult: (attemptId) => result(api.get(`/api/companyoa/history/${encodeURIComponent(attemptId)}`)),
  take: (id) => result(api.get(`/api/companyoa/${id}/take`)),
  attempt: (id, data) => result(api.post(`/api/companyoa/${id}/attempt`, data, LONG_OPERATION)),
};

const liveAdminApi = {
  stats: () => result(api.get('/api/admin/stats')),
  students: (params) => result(api.get('/api/admin/students', { params })),
  updatePlacement: (id, status) => result(api.patch(`/api/admin/students/${id}/placement-status`, { status })),
  announcements: () => result(api.get('/api/admin/announcements')),
  createAnnouncement: (data) => result(api.post('/api/admin/announcements', data)),
  deleteAnnouncement: (id) => result(api.delete(`/api/admin/announcements/${id}`)),
  report: (format) => result(api.get('/api/admin/reports/placement', { params: { format } })),
  companies: () => result(api.get('/api/admin/companies')),
};

const liveAnnouncementApi = {
  list: () => result(api.get('/api/announcements')),
};

// Typed native interview practice persists to the same protected session
// endpoint as the website. The payload explicitly carries text-only feedback;
// it never claims camera, voice, facial-expression, or identity analysis.
const liveInterviewApi = {
  save: (data) => result(api.post('/api/interview/save', data)),
  history: () => result(api.get('/api/interview/history')),
  session: (id) => result(api.get(`/api/interview/session/${id}`)),
  analytics: () => result(api.get('/api/interview/analytics')),
  flagViolation: (sessionIdOrData, data = {}) => {
    const payload = sessionIdOrData && typeof sessionIdOrData === 'object'
      ? sessionIdOrData
      : { ...data, sessionId: data.sessionId || sessionIdOrData };
    return result(api.post('/api/interview/flag-violation', payload));
  },
};

const demoAuthApi = {
  register: (data) => mockApi.authApi.register(data),
  login: (email, password) => mockApi.authApi.login({ email, password }),
  verifyEmail: () => mockApi.authApi.verify(),
  resendCode: () => mockApi.authApi.resendVerification(),
  changePassword: () => mockApi.authApi.changePassword(),
  uploadAvatar: async () => { throw new Error('Profile photo uploads are unavailable in local demo mode.'); },
  removeAvatar: async () => { throw new Error('Profile photo changes are unavailable in local demo mode.'); },
};

const demoNotificationsApi = {
  ...mockApi.notificationsApi,
  // Demo mode is intentionally network-free and never asks the OS for a token.
  registerDevice: async () => ({ skipped: true }),
  unregisterDevice: async () => ({ skipped: true }),
};

const demoJobsApi = {
  list: (params) => mockApi.jobsApi.list(params),
  byId: (id) => mockApi.jobsApi.byId(id),
  create: (data) => mockApi.jobsApi.create(data),
  update: (id, data) => mockApi.jobsApi.update(id, data),
  pending: () => mockApi.jobsApi.pending(),
  approve: (id, action, reason) => mockApi.jobsApi.approve(id, action, reason),
  // Demo mode never reads or uploads device files. The post-job screen keeps
  // document selection disabled in this mode; this guard protects callers too.
  uploadDoc: async () => { throw new Error('Job document uploads are unavailable in local demo mode.'); },
  myJobs: () => mockApi.jobsApi.mine(),
};

const demoApplicationsApi = {
  apply: (jobId) => mockApi.applicationsApi.apply(jobId),
  mine: () => mockApi.applicationsApi.mine(),
  byJob: (jobId) => mockApi.applicationsApi.forJob(jobId),
  updateStatus: (id, status) => mockApi.applicationsApi.updateStatus(id, status),
  updateStage: (id, stage) => mockApi.applicationsApi.stage(id, stage),
};

const demoAptitudeApi = {
  tests: () => mockApi.aptitudeApi.tests(),
  start: (id) => mockApi.aptitudeApi.start(id),
  submit: (data) => mockApi.aptitudeApi.submit(data),
  analysis: () => mockApi.aptitudeApi.analytics(),
};

const demoDsaApi = {
  problems: (params) => mockApi.dsaApi.problems(params),
  problem: (id) => mockApi.dsaApi.problem(id),
  run: (data) => mockApi.dsaApi.run(data?.problemId || data?.problem_id, data),
  submit: (data) => mockApi.dsaApi.submit(data?.problemId || data?.problem_id, data),
  // Keep demo mode fully local. These aliases deliberately call the existing
  // deterministic mock and never invoke JDoodle or a network endpoint.
  runFunction: (data) => mockApi.dsaApi.run(data?.problemId || data?.problem_id, data),
  submitFunction: (data) => mockApi.dsaApi.submit(data?.problemId || data?.problem_id, data),
  performance: () => mockApi.dsaApi.performance(),
};

const demoCompanyOaApi = {
  mine: () => mockApi.companyOaApi.mine(),
  submit: (data) => mockApi.companyOaApi.create(data),
  remove: (id) => mockApi.companyOaApi.remove(id),
  pending: () => mockApi.companyOaApi.pending(),
  all: () => mockApi.companyOaApi.all(),
  questions: (id) => mockApi.companyOaApi.questions(id),
  approve: (id, action, note) => mockApi.companyOaApi.approve(id, action, note),
  available: () => mockApi.companyOaApi.available(),
  history: () => mockApi.companyOaApi.history(),
  attemptResult: (attemptId) => mockApi.companyOaApi.attemptResult(attemptId),
  take: (id) => mockApi.companyOaApi.take(id),
  attempt: (id, data) => mockApi.companyOaApi.attempt(id, data),
};

// Mock OA attempts share the website's local demo scoring contract as well.
const demoMockOaApi = mockApi.mockOaApi;
// Keep the native typed-practice path usable in the offline demo too. Its
// state remains in-memory and is reset when the demo reloads.
const demoInterviewApi = mockApi.interviewApi;

const demoAdminApi = {
  stats: () => mockApi.adminApi.stats(),
  students: (params) => mockApi.adminApi.students(params),
  updatePlacement: (id, status) => mockApi.adminApi.updatePlacement(id, { placement_status: status }),
  announcements: () => mockApi.adminApi.announcements(),
  createAnnouncement: (data) => mockApi.adminApi.createAnnouncement(data),
  deleteAnnouncement: (id) => mockApi.adminApi.removeAnnouncement(id),
  report: (format) => mockApi.adminApi.reports(format),
  companies: () => mockApi.adminApi.companies(),
};

export const authApi = DEMO_MODE ? demoAuthApi : liveAuthApi;
export const notificationsApi = DEMO_MODE ? demoNotificationsApi : liveNotificationsApi;
export const studentApi = DEMO_MODE ? {
  ...mockApi.studentApi,
  extractAtsPdf: async () => { throw new Error('ATS PDF extraction is unavailable in local demo mode.'); },
} : liveStudentApi;
export const jobsApi = DEMO_MODE ? demoJobsApi : liveJobsApi;
export const applicationsApi = DEMO_MODE ? demoApplicationsApi : liveApplicationsApi;
export const aptitudeApi = DEMO_MODE ? demoAptitudeApi : liveAptitudeApi;
export const dsaApi = DEMO_MODE ? demoDsaApi : liveDsaApi;
export const mockOaApi = DEMO_MODE ? demoMockOaApi : liveMockOaApi;
export const companyOaApi = DEMO_MODE ? demoCompanyOaApi : liveCompanyOaApi;
export const adminApi = DEMO_MODE ? demoAdminApi : liveAdminApi;
export const announcementApi = DEMO_MODE ? mockApi.announcementApi : liveAnnouncementApi;
export const interviewApi = DEMO_MODE ? demoInterviewApi : liveInterviewApi;
