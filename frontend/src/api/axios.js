// src/api/axios.js
// Central Axios instance — auto-attaches JWT, handles 401 globally

import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 120000,  // 30s — longer timeout for Judge0 code execution
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach JWT token ──
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle global errors ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.error || error.message;

    if (status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.error('Session expired. Please log in again.');
      // Small delay so toast is visible before redirect
      setTimeout(() => { window.location.href = '/login'; }, 1500);
    } else if (status === 403) {
      toast.error('You do not have permission to do that.');
    } else if (status === 429) {
      toast.error('Too many requests. Please slow down.');
    } else if (status >= 500) {
      toast.error('Server error. Please try again later.');
    }

    return Promise.reject(error);
  }
);

// ── Typed API helpers ──

// Auth
export const authAPI = {
  register: (data)          => api.post('/api/auth/register', data),
  login:    (email, pass)   => api.post('/api/auth/login', { email, password: pass }),
};

// Student profile
export const studentAPI = {
  getProfile:    ()        => api.get('/api/students/profile'),
  updateProfile: (data)    => api.put('/api/students/profile', data),
  uploadResume:  (formData) => api.post('/api/students/resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Jobs
export const jobsAPI = {
  getAll:     (params)               => api.get('/api/jobs', { params }),
  getById:    (id)                   => api.get(`/api/jobs/${id}`),
  create:     (data)                 => api.post('/api/jobs', data),
  update:     (id, d)                => api.put(`/api/jobs/${id}`, d),
  close:      (id)                   => api.patch(`/api/jobs/${id}/close`),
  getPending: ()                     => api.get('/api/jobs/pending'),
  approve:    (id, action, reason)   => api.patch(`/api/jobs/${id}/approve`, { action, reason }),
  myJobs:     ()                     => api.get('/api/jobs/recruiter/my-jobs'),
};

// Applications
export const applicationsAPI = {
  apply:         (jobId)          => api.post('/api/applications', { jobId }),
  getMyApps:     ()               => api.get('/api/applications/my'),
  getByJob:      (jobId)          => api.get(`/api/applications/job/${jobId}`),
  updateStatus:  (id, status)     => api.patch(`/api/applications/${id}/status`, { status }),
};

// Aptitude
export const aptitudeAPI = {
  getTests:      ()              => api.get('/api/aptitude/tests'),
  getTest:       (id)            => api.get(`/api/aptitude/tests/${id}`),
  submit:        (data)          => api.post('/api/aptitude/submit', data),
  getAnalysis:   ()              => api.get('/api/aptitude/analysis'),
  getAttempts:   ()              => api.get('/api/aptitude/attempts'),
};

// DSA
export const dsaAPI = {
  getProblems:   (params)        => api.get('/api/dsa/problems', { params }),
  getProblem:    (id)            => api.get(`/api/dsa/problems/${id}`),
  run:           (data)          => api.post('/api/dsa/run', data),
  submit:        (data)          => api.post('/api/dsa/submit', data),
  getPerformance: ()             => api.get('/api/dsa/performance'),
};

// Mock OA
export const mockOAAPI = {
  getTests:      (params)        => api.get('/api/mockoa/tests', { params }),
  getTest:       (id)            => api.get(`/api/mockoa/tests/${id}`),
  submit:        (data)          => api.post('/api/mockoa/submit', data),
  getHistory:    ()              => api.get('/api/mockoa/history'),
};

// Interview
export const interviewAPI = {
  save:          (data)          => api.post('/api/interview/save', data),
  getHistory:    ()              => api.get('/api/interview/history'),
  getSession:    (id)            => api.get(`/api/interview/session/${id}`),
  getAnalytics:  ()              => api.get('/api/interview/analytics'),
  flagViolation: (data)          => api.post('/api/interview/flag-violation', data),
};

// Admin
export const adminAPI = {
  getStats:        ()            => api.get('/api/admin/stats'),
  getStudents:     (params)      => api.get('/api/admin/students', { params }),
  updatePlacement: (id, status)  => api.patch(`/api/admin/students/${id}/placement-status`, { status }),
  getAnnouncements: ()           => api.get('/api/admin/announcements'),
  createAnnouncement: (data)     => api.post('/api/admin/announcements', data),
  deleteAnnouncement: (id)       => api.delete(`/api/admin/announcements/${id}`),
  getReport:       (format)      => api.get('/api/admin/reports/placement', { params: { format } }),
  getCompanies:    ()            => api.get('/api/admin/companies'),
};

export default api;
