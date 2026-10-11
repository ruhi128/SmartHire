/*
 * Local-only SmartHire demo API.
 *
 * This module is intentionally self-contained and keeps mutable, non-sensitive
 * sample data in memory. It never imports the HTTP client, reads a backend URL,
 * uploads a file, or starts a network request. Closing/reloading the app resets
 * the sample workspace.
 */
import { DEMO_ACCOUNTS } from '../config/runtime';

const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
const iso = () => new Date().toISOString();
const ago = (days = 0) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const fromNow = (days = 0) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
let sequence = 20;
const localId = (prefix) => `${prefix}-${Date.now().toString(36)}-${++sequence}`;
const trim = (value) => String(value || '').trim();
const hasAnswer = (value) => value !== undefined && value !== null && value !== '';
const numeric = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

function apiError(message, status = 400) {
  const error = new Error(message);
  error.response = { status, data: { error: message } };
  return Promise.reject(error);
}

function gradeFor(percent) {
  if (percent >= 85) return 'A';
  if (percent >= 70) return 'B';
  if (percent >= 55) return 'C';
  if (percent >= 40) return 'D';
  return 'E';
}

function durationLabel(seconds = 0) {
  const minutes = Math.max(1, Math.round(numeric(seconds) / 60));
  return `${minutes} min`;
}

const orbit = {
  id: 'demo-company-orbit',
  name: 'Orbit Labs',
  logo_url: null,
  website: 'https://example.invalid/orbit-labs',
  industry: 'Software',
};
const northstar = {
  id: 'demo-company-northstar',
  name: 'Northstar Systems',
  logo_url: null,
  website: 'https://example.invalid/northstar-systems',
  industry: 'Technology consulting',
};
const pixel = {
  id: 'demo-company-pixel',
  name: 'Pixel Forge',
  logo_url: null,
  website: 'https://example.invalid/pixel-forge',
  industry: 'Product design',
};

const studentProfile = {
  id: 'demo-student-001',
  user_id: 'demo-student-001',
  full_name: 'Aarav Mehta',
  email: 'student@demo.invalid',
  phone: '+91 90000 00000',
  roll_number: 'DEMO2026-001',
  branch: 'Computer Science',
  batch: '2026',
  semester: 7,
  cgpa: 8.4,
  tenth_percent: 91.4,
  twelfth_percent: 88.6,
  backlogs: 0,
  skills: ['JavaScript', 'React', 'Problem solving'],
  certifications: ['AWS Cloud Practitioner'],
  bio: 'Local sample profile for the SmartHire mobile demo.',
  linkedin_url: '',
  github_url: '',
  resume_url: null,
  placement_status: 'seeking',
  placement_company: null,
  placement_role: null,
  placement_package: null,
  created_at: ago(160),
};

const state = {
  activeRole: 'student',
  studentProfile,
  students: [
    studentProfile,
    {
      id: 'demo-student-002', user_id: 'demo-student-002', full_name: 'Priya Kulkarni', email: 'priya.demo@invalid.example',
      phone: '+91 90000 00001', roll_number: 'DEMO2026-002', branch: 'Information Technology', batch: '2026', cgpa: 8.8,
      skills: ['Python', 'SQL', 'Data analysis'], bio: 'Sample placed student record.', resume_url: null,
      placement_status: 'placed', placement_company: 'Northstar Systems', placement_role: 'Data Analyst', placement_package: '8.5 LPA', created_at: ago(150),
    },
    {
      id: 'demo-student-003', user_id: 'demo-student-003', full_name: 'Kabir Singh', email: 'kabir.demo@invalid.example',
      phone: '+91 90000 00002', roll_number: 'DEMO2026-003', branch: 'Electronics', batch: '2026', cgpa: 7.7,
      skills: ['C++', 'Embedded systems'], bio: 'Sample active student record.', resume_url: null,
      placement_status: 'seeking', placement_company: null, placement_role: null, placement_package: null, created_at: ago(144),
    },
  ],
  jobs: [
    {
      id: 'demo-job-frontend', company_id: orbit.id, companies: orbit, title: 'Frontend Engineering Intern',
      description: 'Build accessible product interfaces with a collaborative engineering team. This is local sample content.',
      location: 'Mumbai / Hybrid', job_type: 'Internship', package_lpa: 4.2, min_cgpa: 7, max_backlogs: 0,
      eligible_branches: ['Computer Science', 'Information Technology'], required_skills: ['React', 'JavaScript', 'CSS'],
      deadline: fromNow(14), status: 'active', approval_status: 'approved', recruiter_id: 'demo-recruiter-001',
      created_at: ago(4), updated_at: ago(4), application_count: 1,
    },
    {
      id: 'demo-job-data', company_id: northstar.id, companies: northstar, title: 'Junior Data Analyst',
      description: 'Use SQL, spreadsheets, and clear communication to turn sample business data into useful reports.',
      location: 'Pune', job_type: 'Full-time', package_lpa: 8.5, min_cgpa: 7.5, max_backlogs: 0,
      eligible_branches: ['Computer Science', 'Information Technology', 'Electronics'], required_skills: ['SQL', 'Python', 'Analytics'],
      deadline: fromNow(20), status: 'active', approval_status: 'approved', recruiter_id: 'demo-recruiter-002',
      created_at: ago(7), updated_at: ago(7), application_count: 0,
    },
    {
      id: 'demo-job-pending', company_id: orbit.id, companies: orbit, title: 'QA Automation Trainee',
      description: 'A pending local sample job used to demonstrate the administrator approval queue.',
      location: 'Remote', job_type: 'Internship', package_lpa: 3.4, min_cgpa: 6.5, max_backlogs: 1,
      eligible_branches: ['Computer Science', 'Information Technology'], required_skills: ['Testing', 'JavaScript'],
      deadline: fromNow(30), status: 'active', approval_status: 'pending', recruiter_id: 'demo-recruiter-001',
      created_at: ago(1), updated_at: ago(1), application_count: 0,
    },
    {
      id: 'demo-job-closed', company_id: pixel.id, companies: pixel, title: 'Product Design Intern',
      description: 'A closed sample listing retained only to illustrate local recruiter history.',
      location: 'Mumbai', job_type: 'Internship', package_lpa: 3.6, min_cgpa: 7, max_backlogs: 0,
      eligible_branches: ['Computer Science', 'Information Technology'], required_skills: ['Figma', 'UX'],
      deadline: ago(3), status: 'closed', approval_status: 'approved', recruiter_id: 'demo-recruiter-003',
      created_at: ago(48), updated_at: ago(4), application_count: 1,
    },
  ],
  applications: [
    {
      id: 'demo-app-001', job_id: 'demo-job-frontend', student_id: studentProfile.id, status: 'shortlisted', stage: 'oa_cleared',
      cover_letter: 'I would like to learn from the local sample frontend workflow.', applied_at: ago(2), updated_at: ago(1),
      stage_history: [
        { stage: 'applied', at: ago(2) },
        { stage: 'oa_cleared', at: ago(1) },
      ],
    },
    {
      id: 'demo-app-002', job_id: 'demo-job-closed', student_id: 'demo-student-002', status: 'selected', stage: 'selected',
      cover_letter: 'Sample application for reporting.', applied_at: ago(40), updated_at: ago(28),
      stage_history: [{ stage: 'selected', at: ago(28) }],
    },
  ],
  aptitudeTests: [
    {
      id: 'demo-apt-quant', title: 'Quantitative foundations', description: 'A short local sample quiz.', duration_minutes: 10,
      questions: [
        { id: 'demo-apt-q1', topic: 'Quantitative', question_text: 'What is 15% of 200?', options: ['15', '30', '45', '60'], correct_index: 1, marks: 2 },
        { id: 'demo-apt-q2', topic: 'Logical reasoning', question_text: 'If all interns are learners and Asha is an intern, Asha is a…', options: ['manager', 'learner', 'recruiter', 'company'], correct_index: 1, marks: 2 },
        { id: 'demo-apt-q3', topic: 'Verbal', question_text: 'Choose the clearest sentence.', options: ['The report were reviewed.', 'The report was reviewed.', 'The report reviewing.', 'Report was reviews.'], correct_index: 1, marks: 2 },
      ],
    },
    {
      id: 'demo-apt-data', title: 'Data interpretation basics', description: 'Small sample assessment for local practice.', duration_minutes: 12,
      questions: [
        { id: 'demo-apt-q4', topic: 'Data interpretation', question_text: 'A team completes 8 tasks on Monday and 12 on Tuesday. What is the total?', options: ['18', '19', '20', '21'], correct_index: 2, marks: 2 },
        { id: 'demo-apt-q5', topic: 'Quantitative', question_text: 'What is the average of 4, 6, and 8?', options: ['5', '6', '7', '8'], correct_index: 1, marks: 2 },
        { id: 'demo-apt-q6', topic: 'Logical reasoning', question_text: 'Which value comes next: 2, 4, 8, 16?', options: ['18', '24', '30', '32'], correct_index: 3, marks: 2 },
      ],
    },
  ],
  aptitudeAttempts: [
    {
      id: 'demo-apt-attempt-001', test_id: 'demo-apt-quant', student_id: studentProfile.id,
      score: 4, total_marks: 6, percentage: 67, correct: 2, wrong: 1, unattempted: 0,
      // Keep the same topic-level shape returned by the live /analysis route.
      topic_results: {
        Quantitative: { correct: 1, wrong: 0, unattempted: 0, total: 1 },
        'Logical reasoning': { correct: 1, wrong: 0, unattempted: 0, total: 1 },
        Verbal: { correct: 0, wrong: 1, unattempted: 0, total: 1 },
      },
      created_at: ago(5), submitted_at: ago(5),
    },
  ],
  dsaProblems: [
    {
      id: 'demo-dsa-two-sum', title: 'Pair sum', difficulty: 'Easy', topic: 'Arrays', tags: ['Array', 'Hash map'],
      description: 'Given an array of integers and a target, return indexes of two values whose sum equals the target.',
      constraints: ['Exactly one pair exists in the sample inputs.', 'Use zero-based indexes.'],
      examples: [{ input: 'nums = [2, 7, 11, 15], target = 9', output: '[0, 1]', explanation: '2 + 7 equals 9.' }],
      starter_code: {
        javascript: 'function solve(nums, target) {\n  // Return the matching indexes.\n}\n',
        python: 'def solve(nums, target):\n    # Return the matching indexes.\n    pass\n',
        cpp: 'vector<int> solve(vector<int> nums, int target) {\n  // Return the matching indexes.\n}\n',
      },
    },
    {
      id: 'demo-dsa-palindrome', title: 'Normalized palindrome', difficulty: 'Easy', topic: 'Strings', tags: ['String', 'Two pointers'],
      description: 'Determine whether a string reads the same forward and backward after ignoring case and punctuation.',
      constraints: ['Only local sample feedback is available in demo mode.'],
      examples: [{ input: '"Never odd or even"', output: 'true', explanation: 'Ignoring spaces and case produces a palindrome.' }],
      starter_code: {
        javascript: 'function isPalindrome(value) {\n  // Return true or false.\n}\n',
        python: 'def is_palindrome(value):\n    # Return True or False.\n    pass\n',
        cpp: 'bool isPalindrome(string value) {\n  // Return true or false.\n}\n',
      },
    },
    {
      id: 'demo-dsa-intervals', title: 'Merge intervals', difficulty: 'Medium', topic: 'Sorting', tags: ['Array', 'Sorting'],
      description: 'Merge overlapping intervals in a locally defined sample input.',
      constraints: ['Sort by start time before comparing ranges.'],
      examples: [{ input: '[[1,3],[2,6],[8,10]]', output: '[[1,6],[8,10]]', explanation: 'The first two intervals overlap.' }],
      starter_code: {
        javascript: 'function merge(intervals) {\n  // Return merged intervals.\n}\n',
        python: 'def merge(intervals):\n    # Return merged intervals.\n    pass\n',
        cpp: 'vector<vector<int>> merge(vector<vector<int>> intervals) {\n  // Return merged intervals.\n}\n',
      },
    },
  ],
  dsaSubmissions: [
    { id: 'demo-dsa-sub-001', problem_id: 'demo-dsa-two-sum', title: 'Pair sum', difficulty: 'Easy', language: 'javascript', status: 'demo accepted', submitted_at: ago(3), passed: 2, total: 2 },
  ],
  mockTests: [
    {
      id: 'demo-mock-oa-001', title: 'Core programming practice', description: 'A local sample Mock OA with multiple-choice questions.',
      type: 'Mock OA', duration: 15, total_marks: 6, sections: ['general'], status: 'approved',
      created_at: ago(7), recruiter_id: 'demo-recruiter-001', companies: orbit,
      questions: [
        { id: 'demo-mock-q1', question_text: 'Which data structure uses first-in, first-out order?', type: 'mcq', section: 'general', options: ['Stack', 'Queue', 'Tree', 'Graph'], correct_index: 1, marks: 2, ordering: 0, explanation: 'A queue processes the first item added first.' },
        { id: 'demo-mock-q2', question_text: 'Which HTTP method is typically used to create a resource?', type: 'mcq', section: 'general', options: ['GET', 'POST', 'DELETE', 'HEAD'], correct_index: 1, marks: 2, ordering: 1, explanation: 'POST is conventionally used to create a resource.' },
        { id: 'demo-mock-q3', question_text: 'Which value is a JavaScript boolean?', type: 'mcq', section: 'general', options: ['"true"', '1', 'true', 'null'], correct_index: 2, marks: 2, ordering: 2, explanation: 'The unquoted literal true is a boolean.' },
      ],
    },
    {
      id: 'demo-mock-oa-pending', title: 'UI fundamentals practice', description: 'A pending sample assessment for the admin review queue.',
      type: 'Mock OA', duration: 12, total_marks: 4, sections: ['general'], status: 'pending',
      created_at: ago(1), recruiter_id: 'demo-recruiter-001', companies: orbit,
      questions: [
        { id: 'demo-mock-q4', question_text: 'Which CSS property controls a flex direction?', type: 'mcq', section: 'general', options: ['display', 'flex-direction', 'position', 'z-index'], correct_index: 1, marks: 2, ordering: 0 },
        { id: 'demo-mock-q5', question_text: 'Which tag supplies alternate text for an image?', type: 'mcq', section: 'general', options: ['src', 'alt', 'href', 'title'], correct_index: 1, marks: 2, ordering: 1 },
      ],
    },
  ],
  mockAttempts: [],
  companyTests: [
    {
      id: 'demo-company-oa-001', company_id: orbit.id, companies: orbit, title: 'Orbit Labs web foundations',
      description: 'Local sample company assessment for product engineering practice.', test_type: 'Technical', duration: 18,
      question_count: 3, approval_status: 'approved', is_active: true, target_branches: ['Computer Science', 'Information Technology'], min_cgpa: 7,
      instructions: 'Read each local sample question carefully before submitting.', created_at: ago(6), recruiter_id: 'demo-recruiter-001', submitted_by: 'demo-recruiter-001', attempt_count: 0,
      questions: [
        { id: 'demo-company-q1', ordering: 1, section: 'Web', question_type: 'mcq', question_text: 'Which React hook stores component state?', options: ['useFetch', 'useState', 'useRoute', 'useStyle'], correct_index: 1, marks: 2, negative_marks: 0.25, explanation: 'useState is React’s state hook.' },
        { id: 'demo-company-q2', ordering: 2, section: 'Web', question_type: 'mcq', question_text: 'What does HTTP status 404 mean?', options: ['Success', 'Unauthorized', 'Not found', 'Server error'], correct_index: 2, marks: 2, negative_marks: 0.25, explanation: '404 means the requested resource was not found.' },
        { id: 'demo-company-q3', ordering: 3, section: 'Accessibility', question_type: 'mcq', question_text: 'Which practice improves keyboard accessibility?', options: ['Use only divs', 'Remove focus styles', 'Use semantic controls', 'Disable tab key'], correct_index: 2, marks: 2, negative_marks: 0.25, explanation: 'Semantic controls carry appropriate keyboard behavior.' },
      ],
    },
    {
      id: 'demo-company-oa-pending', company_id: orbit.id, companies: orbit, title: 'Orbit Labs quality basics',
      description: 'A pending local sample Company OA submitted by the demo recruiter.', test_type: 'Technical', duration: 14,
      question_count: 2, approval_status: 'pending', is_active: true, target_branches: ['Computer Science'], min_cgpa: 6.5,
      instructions: '', created_at: ago(1), recruiter_id: 'demo-recruiter-001', submitted_by: 'demo-recruiter-001', attempt_count: 0,
      questions: [
        { id: 'demo-company-q4', ordering: 1, section: 'Quality', question_type: 'mcq', question_text: 'What is a useful unit-test property?', options: ['Depends on network', 'Fast and isolated', 'Edits production data', 'Only manual'], correct_index: 1, marks: 2, negative_marks: 0.25 },
        { id: 'demo-company-q5', ordering: 2, section: 'Quality', question_type: 'mcq', question_text: 'A bug report should include…', options: ['Only a title', 'Reproduction steps', 'Private credentials', 'No context'], correct_index: 1, marks: 2, negative_marks: 0.25 },
      ],
    },
  ],
  companyAttempts: [],
  interviewSessions: [
    {
      id: 'demo-interview-001', student_id: studentProfile.id, company: 'General', companyLogo: null, duration: '7 min', durationSeconds: 420,
      overallScore: 74, grade: 'B', conductedAt: ago(9),
      transcript: [
        { question: 'Tell us about a project you are proud of.', answer: 'I built a responsive student dashboard and documented the key decisions.' },
        { question: 'How do you approach a difficult bug?', answer: 'I reproduce it, narrow the inputs, test assumptions, and communicate progress.' },
      ],
      feedback: {
        overallScore: 74, grade: 'B', summary: 'Sample local feedback. The response structure was clear and specific.',
        strengths: ['Explains a methodical approach', 'Uses concrete examples'], improvements: ['Add measurable outcomes where available'],
        categories: { clarity: 76, structure: 72, relevance: 74 },
      },
    },
  ],
  announcements: [
    { id: 'demo-announcement-001', title: 'Welcome to the local SmartHire demo', content: 'This sample announcement is stored only in this app session.', priority: 'normal', created_at: ago(2), created_by: 'demo-admin-001' },
    { id: 'demo-announcement-002', title: 'Sample placement workshop', content: 'Use this entry to explore the announcement list without contacting a real service.', priority: 'high', created_at: ago(5), created_by: 'demo-admin-001' },
  ],
  notifications: [
    { id: 'demo-notification-student-1', user_id: 'demo-student-001', title: 'Sample application update', body: 'Your Frontend Engineering Intern application is shortlisted in local demo data.', type: 'application', is_read: false, created_at: ago(1), data: { jobId: 'demo-job-frontend' } },
    { id: 'demo-notification-student-2', user_id: 'demo-student-001', title: 'Practice reminder', body: 'Try a local sample assessment. No result is sent to SmartHire.', type: 'practice', is_read: true, created_at: ago(3), data: {} },
    { id: 'demo-notification-recruiter-1', user_id: 'demo-recruiter-001', title: 'Sample applicant', body: 'Aarav Mehta is shortlisted for Frontend Engineering Intern in demo data.', type: 'application', is_read: false, created_at: ago(1), data: { applicationId: 'demo-app-001' } },
    { id: 'demo-notification-admin-1', user_id: 'demo-admin-001', title: 'Review sample items', body: 'Two local assessment/job items are available in the demo approval queue.', type: 'review', is_read: false, created_at: ago(1), data: {} },
  ],
};

function currentAccount() {
  return DEMO_ACCOUNTS.find((account) => account.role === state.activeRole) || DEMO_ACCOUNTS[0];
}

function accountForRole(role) {
  return DEMO_ACCOUNTS.find((account) => account.role === role);
}

function addNotification(role, title, body, data = {}) {
  const account = accountForRole(role);
  if (!account) return;
  state.notifications.unshift({
    id: localId('demo-notification'), user_id: account.id, title, body, data: clone(data), type: 'local-demo', is_read: false, created_at: iso(),
  });
}

function publicJob(job) {
  if (!job) return null;
  const applications = state.applications.filter((item) => item.job_id === job.id);
  const own = applications.find((item) => item.student_id === studentProfile.id);
  const snapshot = clone(job);
  return {
    ...snapshot,
    // Match the existing backend/mobile field names while retaining readable
    // sample source values in the in-memory records.
    package_lpa: snapshot.package_lpa ?? null,
    eligible_branches: snapshot.eligible_branches || snapshot.target_branches || [],
    required_skills: snapshot.required_skills || snapshot.skills || [],
    application_count: applications.length,
    application_status: own?.status || null,
    has_applied: Boolean(own),
  };
}

function publicApplication(application) {
  if (!application) return null;
  const job = state.jobs.find((item) => item.id === application.job_id);
  const student = state.students.find((item) => item.id === application.student_id);
  return {
    ...clone(application),
    job_postings: publicJob(job),
    student_profiles: clone(student),
  };
}

function scoreQuestions(questions = [], answers = {}) {
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  let score = 0;
  const topicResults = {};
  const total = questions.reduce((sum, question) => sum + numeric(question.marks, 1), 0);

  questions.forEach((question) => {
    const answer = answers?.[question.id];
    const marks = numeric(question.marks, 1);
    const topic = question.topic || 'General';
    if (!topicResults[topic]) topicResults[topic] = { topic, correct: 0, wrong: 0, unattempted: 0, score: 0, total_marks: 0 };
    topicResults[topic].total_marks += marks;

    if (!hasAnswer(answer)) {
      skipped += 1;
      topicResults[topic].unattempted += 1;
      return;
    }

    const matches = question.question_type && question.question_type !== 'mcq'
      ? true
      : question.correct_index === undefined || numeric(answer, -1) === numeric(question.correct_index, -2);
    if (matches) {
      correct += 1;
      score += marks;
      topicResults[topic].correct += 1;
      topicResults[topic].score += marks;
    } else {
      wrong += 1;
      topicResults[topic].wrong += 1;
    }
  });

  return {
    correct,
    wrong,
    skipped,
    score,
    total,
    percentage: total ? Math.round((score / total) * 100) : 0,
    topicResults: Object.values(topicResults),
  };
}

function studentDashboard() {
  const applications = state.applications.filter((item) => item.student_id === studentProfile.id);
  const acceptedDsa = state.dsaSubmissions.filter((item) => item.status === 'demo accepted').length;
  const aptitude = state.aptitudeAttempts.filter((item) => item.student_id === studentProfile.id);
  return {
    // Match the live /api/students/dashboard contract consumed by the mobile dashboard.
    profile: clone(studentProfile),
    applications: {
      total: applications.length,
      shortlisted: applications.filter((item) => item.status === 'shortlisted').length,
      selected: applications.filter((item) => item.status === 'selected').length,
      rejected: applications.filter((item) => item.status === 'rejected').length,
    },
    recentApplications: applications.slice(0, 5).map(publicApplication),
    aptitudeScores: clone(aptitude.slice(0, 10)),
    dsa: { total: state.dsaSubmissions.length, accepted: acceptedDsa },
    oaAttempts: state.mockAttempts.filter((item) => item.student_id === studentProfile.id).length,
  };
}

function recruiterDashboard() {
  const jobs = state.jobs.filter((item) => item.recruiter_id === 'demo-recruiter-001');
  const applications = state.applications.filter((application) => jobs.some((job) => job.id === application.job_id));
  return {
    company: clone(orbit),
    stats: {
      jobs: jobs.length,
      activeJobs: jobs.filter((item) => item.status === 'active' && item.approval_status === 'approved').length,
      pendingJobs: jobs.filter((item) => item.approval_status === 'pending').length,
      applications: applications.length,
    },
    recentApplications: applications.slice(0, 5).map(publicApplication),
    jobs: jobs.map(publicJob),
  };
}

function adminStats() {
  const applications = state.applications;
  return {
    overview: {
      totalStudents: state.students.length,
      placedStudents: state.students.filter((student) => student.placement_status === 'placed').length,
      activeJobs: state.jobs.filter((job) => job.approval_status === 'approved' && job.status === 'active').length,
      totalApplications: applications.length,
    },
    recentApplications: applications.slice(0, 8).map((application) => {
      const student = state.students.find((item) => item.id === application.student_id);
      const job = state.jobs.find((item) => item.id === application.job_id);
      return {
        id: application.id,
        student: student?.full_name || 'Student',
        job: job?.title || 'Job role',
        company: job?.companies?.name || 'Company',
        status: application.status,
        appliedAt: application.applied_at,
      };
    }),
  };
}

function assessmentSummary(test) {
  if (!test) return null;
  const { questions, ...summary } = clone(test);
  return { ...summary, question_count: summary.question_count ?? questions?.length ?? 0 };
}

function mockOaStatus(test) {
  return test?.status || test?.approval_status || 'pending';
}

function mockOaQuestionCount(test) {
  return Array.isArray(test?.questions) ? test.questions.length : numeric(test?.question_count);
}

function mockOaSummary(test) {
  if (!test) return null;
  const { questions, approval_status, ...summary } = clone(test);
  const sourceQuestions = Array.isArray(questions) ? questions : [];
  return {
    ...summary,
    status: mockOaStatus(test),
    total_marks: numeric(summary.total_marks, sourceQuestions.reduce((sum, question) => sum + numeric(question.marks, 4), 0)),
    sections: Array.isArray(summary.sections) && summary.sections.length
      ? summary.sections
      : [...new Set(sourceQuestions.map((question) => question.section || 'general'))],
    question_count: mockOaQuestionCount(test),
  };
}

function publicMockOaQuestion(question, index = 0) {
  const source = clone(question) || {};
  // Do not expose answers or explanations before submission, just as the live
  // take-test route intentionally does not expose correct_index.
  return {
    id: source.id,
    question_text: source.question_text,
    description: source.description || '',
    type: source.type || 'mcq',
    options: Array.isArray(source.options) ? source.options : [],
    marks: numeric(source.marks, 4),
    ordering: numeric(source.ordering, index),
    section: source.section || 'general',
    placeholder: source.placeholder || '',
    word_limit: source.word_limit,
    starter_code: source.starter_code,
    examples: source.examples,
    code_constraints: source.code_constraints,
  };
}

function scoreMockOaQuestions(questions = [], answers = {}) {
  let score = 0;
  let totalPossible = 0;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  const scoredAnswers = {};

  questions.forEach((question) => {
    const marks = numeric(question.marks, 4);
    const answer = answers?.[question.id];
    const type = question.type || 'mcq';
    totalPossible += marks;

    if (type === 'text') {
      const answered = typeof answer === 'string' && answer.trim().length > 10;
      if (answered) {
        score += marks;
        correct += 1;
        scoredAnswers[question.id] = { answer, result: 'answered', points: marks, explanation: question.explanation };
      } else {
        skipped += 1;
        scoredAnswers[question.id] = { answer: answer || '', result: 'skipped', points: 0, explanation: question.explanation };
      }
      return;
    }

    if (!hasAnswer(answer)) {
      skipped += 1;
      scoredAnswers[question.id] = { answer: null, result: 'skipped', points: 0, correct: question.correct_index, explanation: question.explanation };
    } else if (numeric(answer, -1) === numeric(question.correct_index, -2)) {
      score += marks;
      correct += 1;
      scoredAnswers[question.id] = { answer: numeric(answer), result: 'correct', points: marks, correct: question.correct_index, explanation: question.explanation };
    } else {
      score -= 1;
      wrong += 1;
      scoredAnswers[question.id] = { answer: numeric(answer), result: 'wrong', points: -1, correct: question.correct_index, explanation: question.explanation };
    }
  });

  score = Math.max(0, score);
  return {
    score,
    totalPossible,
    percentage: totalPossible ? Math.round((score / totalPossible) * 100) : 0,
    correct,
    wrong,
    skipped,
    scoredAnswers,
  };
}

function companyOaGrade(pct) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

function publicCompanyOaQuestion(question, index = 0) {
  const source = clone(question) || {};
  return {
    id: source.id,
    ordering: numeric(source.ordering, index + 1),
    section: source.section || 'General',
    question_type: source.question_type || 'mcq',
    marks: numeric(source.marks, 1),
    question_text: source.question_text,
    options: Array.isArray(source.options) ? source.options : [],
    placeholder: source.placeholder || '',
    word_limit: numeric(source.word_limit, 200),
  };
}

function scoreCompanyOaQuestions(questions = [], answers = {}) {
  let score = 0;
  let maxScore = 0;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  const breakdown = {};
  const reviewed = [];

  questions.forEach((question) => {
    const section = question.section || 'General';
    const marks = numeric(question.marks, 1);
    const type = question.question_type || 'mcq';
    const answer = answers?.[question.id];
    if (!breakdown[section]) breakdown[section] = { correct: 0, wrong: 0, skipped: 0, earned: 0, max: 0 };
    breakdown[section].max += marks;
    maxScore += marks;

    if (type === 'mcq') {
      if (!hasAnswer(answer)) {
        skipped += 1;
        breakdown[section].skipped += 1;
        reviewed.push({ id: question.id, section: question.section, type: 'mcq', correct_index: question.correct_index, explanation: question.explanation, student_answer: null, is_correct: false });
      } else if (numeric(answer, -1) === numeric(question.correct_index, -2)) {
        score += marks;
        correct += 1;
        breakdown[section].correct += 1;
        breakdown[section].earned += marks;
        reviewed.push({ id: question.id, section: question.section, type: 'mcq', correct_index: question.correct_index, explanation: question.explanation, student_answer: numeric(answer), is_correct: true });
      } else {
        const deduction = marks * numeric(question.negative_marks, 0.25);
        score = Math.max(0, score - deduction);
        wrong += 1;
        breakdown[section].wrong += 1;
        reviewed.push({ id: question.id, section: question.section, type: 'mcq', correct_index: question.correct_index, explanation: question.explanation, student_answer: numeric(answer), is_correct: false });
      }
      return;
    }

    if (type === 'text') {
      const wordCount = trim(answer).split(/\s+/).filter(Boolean).length;
      const points = Math.round(marks * Math.min(wordCount / numeric(question.word_limit, 100), 1) * 0.7);
      score += points;
      breakdown[section].earned += points;
      reviewed.push({ id: question.id, section: question.section, type: 'text', student_answer: answer || '', is_correct: null });
      return;
    }

    reviewed.push({ id: question.id, section: question.section, type: 'coding', student_answer: answer || '', is_correct: null });
  });

  const roundedScore = Math.round(score * 100) / 100;
  const pct = maxScore ? Math.min(100, Math.round((roundedScore / maxScore) * 100)) : 0;
  return { score: roundedScore, maxScore, pct, grade: companyOaGrade(pct), correct, wrong, skipped, breakdown, reviewed };
}

function interviewAverages() {
  // The mobile hub labels these as typed-practice metrics, so do not blend
  // historical browser/media sessions or legacy category values into them.
  const sessions = state.interviewSessions.filter((item) => (
    item.student_id === studentProfile.id && item.feedback?.mode === 'typed-practice'
  ));
  if (!sessions.length) return { sessions: 0, overall: 0, relevance: 0, content: 0, structure: 0, wording: 0 };
  const average = (scoreKey) => Math.round(sessions.reduce((sum, item) => (
    sum + numeric(item.feedback?.scores?.[scoreKey], item.overallScore)
  ), 0) / sessions.length);
  return {
    sessions: sessions.length,
    overall: average('overall'),
    relevance: average('relevance'),
    content: average('content'),
    structure: average('structure'),
    wording: average('confidence'),
  };
}

function interviewSummary(session) {
  return {
    id: session.id,
    company: session.company || 'General',
    companyLogo: null,
    duration: session.duration || durationLabel(session.durationSeconds),
    durationSeconds: session.durationSeconds || 0,
    overallScore: session.overallScore,
    grade: session.grade,
    conductedAt: session.conductedAt,
    questionCount: session.transcript?.length || 0,
    practiceMode: session.feedback?.mode || session.practiceMode || null,
  };
}

function interviewDetail(session) {
  return {
    ...clone(session),
    company: session.company || 'General',
    companyLogo: null,
    practiceMode: session.feedback?.mode || session.practiceMode || null,
    ai_feedback: clone(session.feedback),
  };
}

const APPLICATION_STAGES = ['applied', 'oa_cleared', 'interview_1_cleared', 'interview_2_cleared', 'selected', 'rejected'];
const APPLICATION_STATUSES = ['applied', 'shortlisted', 'rejected', 'selected', 'on_hold'];
const APPLICATION_STAGE_LABELS = {
  applied: 'Application submitted',
  oa_cleared: 'Cleared Online Assessment',
  interview_1_cleared: 'Cleared Interview Round 1',
  interview_2_cleared: 'Cleared Interview Round 2',
  selected: 'Selected',
  rejected: 'Not selected',
};

function normalizeApplicationStatus(status) {
  const value = trim(status).toLowerCase();
  return APPLICATION_STATUSES.includes(value) ? value : 'applied';
}

function statusForApplicationStage(stage) {
  if (stage === 'selected') return 'selected';
  if (stage === 'rejected') return 'rejected';
  if (stage === 'applied') return 'applied';
  return 'shortlisted';
}

export const mockApi = {
  authApi: {
    async login({ email } = {}) {
      const account = DEMO_ACCOUNTS.find((item) => item.email.toLowerCase() === trim(email).toLowerCase());
      if (!account) return apiError('This local demo only accepts one of the displayed demo-role entries.');
      state.activeRole = account.role;
      return {
        token: `demo-local-session.${account.role}.${Date.now()}`,
        user: {
          id: account.id,
          email: account.email,
          full_name: account.name,
          role: account.role,
          profile: account.role === 'student' ? clone(studentProfile) : account.role === 'recruiter' ? { company: clone(orbit) } : null,
        },
        demo: true,
        message: 'Local demo session started. No account was authenticated.',
      };
    },
    async register() { return apiError('Registration is unavailable in local demo mode. Restart without demo mode to use SmartHire accounts.'); },
    async verify() { return apiError('Email verification is unavailable in local demo mode.'); },
    async resendVerification() { return apiError('Email delivery is disabled in local demo mode.'); },
    async changePassword() { return apiError('Password changes are unavailable in local demo mode.'); },
  },

  notificationsApi: {
    async list() {
      const account = currentAccount();
      return clone(state.notifications.filter((item) => item.user_id === account.id));
    },
    async markRead(id) {
      const notification = state.notifications.find((item) => item.id === id);
      if (notification) notification.is_read = true;
      return { success: true, message: 'Marked read locally.' };
    },
    async markAllRead() {
      const account = currentAccount();
      state.notifications.forEach((item) => { if (item.user_id === account.id) item.is_read = true; });
      return { success: true, message: 'Marked local notifications read.' };
    },
    async unreadCount() {
      const account = currentAccount();
      return { count: state.notifications.filter((item) => item.user_id === account.id && !item.is_read).length };
    },
  },

  deviceApi: {
    async register() { return { success: true, message: 'Push registration is disabled in local demo mode.' }; },
    async unregister() { return { success: true, message: 'Push unregistration is not needed in local demo mode.' }; },
  },

  studentApi: {
    async dashboard() { return studentDashboard(); },
    async profile() { return { profile: clone(studentProfile) }; },
    async updateProfile(data = {}) {
      const patch = { ...data };
      delete patch.skillsText;
      delete patch.certificationsText;
      if (typeof data.skillsText === 'string') patch.skills = data.skillsText.split(',').map((item) => item.trim()).filter(Boolean);
      if (typeof data.certificationsText === 'string') patch.certifications = data.certificationsText.split(',').map((item) => item.trim()).filter(Boolean);
      if (patch.cgpa !== undefined && patch.cgpa !== '') patch.cgpa = numeric(patch.cgpa, studentProfile.cgpa);
      Object.assign(studentProfile, patch, { updated_at: iso() });
      return { profile: clone(studentProfile), message: 'Profile updated only in this local demo session.' };
    },
    async uploadResume() {
      return {
        resume_url: studentProfile.resume_url,
        message: 'Demo mode never uploads files. The selected resume was not sent or stored.',
      };
    },
    async all() { return { students: clone(state.students), total: state.students.length }; },
    async byId(id) {
      const student = state.students.find((item) => item.id === id);
      return student ? clone(student) : apiError('Sample student record not found.', 404);
    },
  },

  jobsApi: {
    async list(params = {}) {
      // The existing live route is role-scoped. Preserve that user experience:
      // recruiters see their sample company's full list, while students see
      // only approved opportunities.
      let jobs = state.activeRole === 'recruiter'
        ? state.jobs.filter((job) => job.recruiter_id === 'demo-recruiter-001')
        : state.jobs.filter((job) => job.approval_status === 'approved');
      if (params.status) jobs = jobs.filter((job) => job.status === params.status);
      if (params.search) {
        const term = trim(params.search).toLowerCase();
        jobs = jobs.filter((job) => `${job.title} ${job.companies?.name} ${job.location}`.toLowerCase().includes(term));
      }
      return jobs.map(publicJob);
    },
    async byId(id) {
      const job = state.jobs.find((item) => item.id === id);
      return job ? publicJob(job) : apiError('Sample job not found.', 404);
    },
    async mine() {
      const jobs = state.jobs.filter((job) => job.recruiter_id === 'demo-recruiter-001');
      return jobs.map(publicJob);
    },
    async create(data = {}) {
      const job = {
        id: localId('demo-job'), company_id: orbit.id, companies: clone(orbit), recruiter_id: 'demo-recruiter-001',
        title: trim(data.title) || 'Untitled local sample job', description: trim(data.description), location: trim(data.location) || 'Remote',
        job_type: data.job_type || data.type || 'full-time', package_lpa: numeric(data.package_lpa ?? data.package), min_cgpa: numeric(data.min_cgpa),
        max_backlogs: numeric(data.max_backlogs), eligible_branches: Array.isArray(data.eligible_branches) ? data.eligible_branches : (Array.isArray(data.target_branches) ? data.target_branches : []),
        required_skills: Array.isArray(data.required_skills) ? data.required_skills : (Array.isArray(data.skills) ? data.skills : []),
        rounds: trim(data.rounds), deadline: data.deadline || fromNow(21), status: 'active', approval_status: 'pending', created_at: iso(), updated_at: iso(), application_count: 0,
      };
      state.jobs.unshift(job);
      addNotification('admin', 'Local job awaiting review', `${job.title} was created in demo mode and needs a local approval decision.`, { jobId: job.id });
      return { job: publicJob(job), message: 'Job saved locally and added to the local review queue.' };
    },
    async update(id, data = {}) {
      const job = state.jobs.find((item) => item.id === id);
      if (!job) return apiError('Sample job not found.', 404);
      Object.assign(job, clone(data), { updated_at: iso() });
      return { job: publicJob(job), message: 'Job updated locally.' };
    },
    async remove(id) {
      const index = state.jobs.findIndex((item) => item.id === id);
      if (index < 0) return apiError('Sample job not found.', 404);
      state.jobs.splice(index, 1);
      state.applications = state.applications.filter((item) => item.job_id !== id);
      return { success: true, message: 'Job removed from local demo data.' };
    },
    async pending() {
      return clone(state.jobs.filter((job) => job.approval_status === 'pending').map(publicJob));
    },
    async approve(id, action = 'approve', note = '') {
      const job = state.jobs.find((item) => item.id === id);
      if (!job) return apiError('Sample job not found.', 404);
      const approved = action === 'approve';
      job.approval_status = approved ? 'approved' : 'rejected';
      job.status = approved ? 'active' : 'rejected';
      job.admin_note = note;
      job.updated_at = iso();
      addNotification('recruiter', `Local job ${approved ? 'approved' : 'rejected'}`, `${job.title} was ${approved ? 'approved' : 'rejected'} in local demo data.`, { jobId: job.id });
      return { job: publicJob(job), message: `Job ${approved ? 'approved' : 'rejected'} locally.` };
    },
  },

  applicationsApi: {
    async mine() {
      const applications = state.applications.filter((item) => item.student_id === studentProfile.id).map(publicApplication);
      return applications;
    },
    async apply(data = {}) {
      const jobId = typeof data === 'string' ? data : data.jobId || data.job_id;
      const job = state.jobs.find((item) => item.id === jobId);
      if (!job || job.approval_status !== 'approved' || job.status !== 'active') return apiError('This local sample job is not available for applications.');
      if (job.deadline && new Date(job.deadline) < new Date()) return apiError('The local sample application deadline has passed.');
      if (numeric(studentProfile.cgpa) < numeric(job.min_cgpa)) return apiError(`Minimum CGPA required: ${job.min_cgpa}. Your local sample CGPA is ${studentProfile.cgpa}.`, 403);
      if (numeric(studentProfile.backlogs) > numeric(job.max_backlogs, 0)) return apiError(`Maximum backlogs allowed: ${job.max_backlogs}.`, 403);
      if (job.eligible_branches?.length && !job.eligible_branches.includes(studentProfile.branch)) return apiError(`Your local sample branch (${studentProfile.branch}) is not eligible for this job.`, 403);
      if (state.applications.some((item) => item.job_id === job.id && item.student_id === studentProfile.id)) return apiError('You already applied to this local sample job.');
      const application = {
        id: localId('demo-app'), job_id: job.id, student_id: studentProfile.id, status: 'applied', stage: 'applied',
        cover_letter: trim(typeof data === 'string' ? '' : data.coverLetter || data.cover_letter), applied_at: iso(), updated_at: iso(),
        stage_history: [{ stage: 'applied', at: iso() }],
      };
      state.applications.unshift(application);
      addNotification('recruiter', 'Local sample application received', `${studentProfile.full_name} applied to ${job.title} in demo mode.`, { applicationId: application.id });
      return { application: publicApplication(application), message: 'Application created only in this local demo session.' };
    },
    async updateStatus(id, status) {
      const application = state.applications.find((item) => item.id === id);
      if (!application) return apiError('Sample application not found.', 404);
      application.status = normalizeApplicationStatus(status);
      application.updated_at = iso();
      if (application.status === 'selected') {
        const applicant = state.students.find((item) => item.id === application.student_id);
        if (applicant) applicant.placement_status = 'placed';
      }
      addNotification('student', 'Local application update', `Your sample application is now ${application.status}.`, { applicationId: application.id, status: application.status });
      return { application: publicApplication(application), message: `Status updated to ${application.status} locally.` };
    },
    async forJob(jobId) {
      const applications = state.applications.filter((item) => item.job_id === jobId).map(publicApplication);
      return applications;
    },
    async stage(id, stage) {
      const application = state.applications.find((item) => item.id === id);
      if (!application) return apiError('Sample application not found.', 404);
      const nextStage = trim(stage).toLowerCase();
      if (!APPLICATION_STAGES.includes(nextStage)) return apiError('Invalid local application stage.', 400);
      const updatedAt = iso();
      application.stage = nextStage;
      application.status = statusForApplicationStage(nextStage);
      application.updated_at = updatedAt;
      application.stage_history = Array.isArray(application.stage_history) ? application.stage_history : [];
      application.stage_history.push({ stage: nextStage, at: updatedAt });
      if (nextStage === 'selected') {
        const applicant = state.students.find((item) => item.id === application.student_id);
        if (applicant) applicant.placement_status = 'placed';
      }
      const stageLabel = APPLICATION_STAGE_LABELS[nextStage] || nextStage;
      addNotification('student', 'Local application update', `Your sample application moved to: ${stageLabel}.`, { applicationId: application.id, stage: nextStage });
      return { application: publicApplication(application), message: `Stage updated to ${stageLabel}.` };
    },
  },

  aptitudeApi: {
    async tests() {
      const tests = state.aptitudeTests.map((test) => {
        const attempts = state.aptitudeAttempts.filter((attempt) => attempt.test_id === test.id && attempt.student_id === studentProfile.id);
        const { questions, ...summary } = clone(test);
        return {
          ...summary,
          total_questions: questions.length,
          attempts: attempts.map((attempt) => ({ score: attempt.score, total: attempt.total_marks })),
          best_score: attempts.length ? Math.max(...attempts.map((attempt) => attempt.score)) : null,
        };
      });
      return tests;
    },
    async test(id) {
      const test = state.aptitudeTests.find((item) => item.id === id);
      return test ? { test: assessmentSummary(test), questions: clone(test.questions) } : apiError('Sample aptitude test not found.', 404);
    },
    async start(id) { return this.test(id); },
    async submit(data = {}) {
      const test = state.aptitudeTests.find((item) => item.id === (data.testId || data.test_id));
      if (!test) return apiError('Sample aptitude test not found.', 404);
      const result = scoreQuestions(test.questions, data.answers || {});
      const topicResults = Object.fromEntries(result.topicResults.map(({ topic, ...stats }) => [topic, {
        ...stats,
        total: Number(stats.correct || 0) + Number(stats.wrong || 0) + Number(stats.unattempted || 0),
      }]));
      const savedAt = iso();
      const attempt = {
        id: localId('demo-apt-attempt'), test_id: test.id, student_id: studentProfile.id, score: result.score, total_marks: result.total,
        percentage: result.percentage, correct: result.correct, wrong: result.wrong, unattempted: result.skipped,
        topic_results: topicResults, created_at: savedAt, submitted_at: savedAt,
      };
      state.aptitudeAttempts.unshift(attempt);
      return {
        percentage: result.percentage, score: result.score, total_marks: result.total, correct: result.correct, wrong: result.wrong,
        unattempted: result.skipped, topic_results: topicResults, message: 'Local sample feedback only; no result was sent to SmartHire.',
      };
    },
    async analytics() {
      const attempts = state.aptitudeAttempts.filter((item) => item.student_id === studentProfile.id);
      const topics = {};
      attempts.forEach((attempt) => {
        Object.entries(attempt.topic_results || {}).forEach(([topic, stats]) => {
          if (!topics[topic]) topics[topic] = { topic, correct: 0, wrong: 0, unattempted: 0, total: 0 };
          const target = topics[topic];
          const correct = Number(stats?.correct) || 0;
          const wrong = Number(stats?.wrong) || 0;
          const unattempted = Number(stats?.unattempted) || 0;
          target.correct += correct;
          target.wrong += wrong;
          target.unattempted += unattempted;
          target.total += Number(stats?.total) || correct + wrong + unattempted;
        });
      });
      const topicAnalysis = Object.values(topics).map((item) => {
        const answered = item.correct + item.wrong;
        const accuracy = answered ? Math.round((item.correct / answered) * 100) : 0;
        const ratio = item.total ? item.correct / item.total : 0;
        return { ...item, accuracy, strength: ratio >= 0.7 ? 'Strong' : ratio >= 0.4 ? 'Average' : 'Weak' };
      });
      // Match the live /api/aptitude/analysis contract consumed by the app.
      return {
        attempts: clone(attempts).map((item) => ({
          id: item.id, score: item.score, total_marks: item.total_marks, percentage: item.percentage,
          correct: item.correct, wrong: item.wrong, unattempted: item.unattempted,
          submitted_at: item.submitted_at || item.created_at,
          topic_results: item.topic_results,
        })),
        topicAnalysis,
      };
    },
  },

  dsaApi: {
    async problems() {
      return {
        problems: state.dsaProblems.map((problem) => ({
          ...clone(problem),
          solved: state.dsaSubmissions.some((submission) => submission.problem_id === problem.id && submission.status === 'demo accepted'),
        })),
      };
    },
    async problem(id) {
      const problem = state.dsaProblems.find((item) => item.id === id);
      return problem ? { problem: clone(problem) } : apiError('Sample coding problem not found.', 404);
    },
    async run(id, data = {}) {
      // The live run endpoint does not require a problem id. A generic local
      // response is still useful for the editor while clearly never executing code.
      const problem = id ? state.dsaProblems.find((item) => item.id === id) : state.dsaProblems[0];
      if (!problem) return apiError('Sample coding problem not found.', 404);
      return {
        status: 'Demo result', verdict: 'Demo result', passed: 0, total: 0,
        stdout: 'Demo mode did not execute code. This is a local placeholder response only.',
        stderr: '', message: 'No code runner or external service is used in local demo mode.',
      };
    },
    async submit(id, data = {}) {
      const problem = state.dsaProblems.find((item) => item.id === id);
      if (!problem) return apiError('Sample coding problem not found.', 404);
      const submission = {
        id: localId('demo-dsa-sub'), problem_id: problem.id, title: problem.title, difficulty: problem.difficulty,
        language: data.language || 'javascript', status: 'demo accepted', submitted_at: iso(), passed: 2, total: 2,
      };
      state.dsaSubmissions.unshift(submission);
      return {
        status: 'Demo accepted', verdict: 'Demo accepted', passed: 2, total: 2,
        stdout: 'Local demo result only. Submitted code was not executed or transmitted.', stderr: '', submission: clone(submission),
      };
    },
    async performance() {
      const submissions = state.dsaSubmissions;
      const solved = new Set(submissions.filter((item) => item.status === 'demo accepted').map((item) => item.problem_id));
      const byDifficulty = {
        Easy: { solved: 0, total: 0 },
        Medium: { solved: 0, total: 0 },
        Hard: { solved: 0, total: 0 },
      };
      const seenProblems = new Set();
      submissions.forEach((submission) => {
        if (seenProblems.has(submission.problem_id)) return;
        seenProblems.add(submission.problem_id);
        const problem = state.dsaProblems.find((item) => item.id === submission.problem_id);
        const bucket = byDifficulty[problem?.difficulty];
        if (!bucket) return;
        bucket.total += 1;
        if (submission.status === 'demo accepted') bucket.solved += 1;
      });
      return {
        totalAttempts: submissions.length,
        accepted: solved.size,
        accuracy: submissions.length ? Math.round((submissions.filter((item) => item.status === 'demo accepted').length / submissions.length) * 100) : 0,
        byDifficulty,
        recentSubmissions: submissions.slice(0, 8).map((submission) => ({
          ...clone(submission),
          submittedAt: submission.submitted_at,
        })),
      };
    },
  },

  mockOaApi: {
    async tests() {
      const tests = state.mockTests
        .filter((test) => mockOaStatus(test) === 'approved')
        .map((test) => {
          const attempts = state.mockAttempts.filter((attempt) => attempt.test_id === test.id && attempt.student_id === studentProfile.id);
          return {
            ...mockOaSummary(test),
            attempts: attempts.length,
            bestScore: attempts.length ? Math.max(...attempts.map((attempt) => numeric(attempt.score))) : null,
          };
        });
      return { tests };
    },
    async test(id) {
      const test = state.mockTests.find((item) => item.id === id);
      if (!test) return apiError('Test not found', 404);
      if (state.activeRole === 'student' && mockOaStatus(test) !== 'approved') return apiError('This test is not yet available', 403);
      return {
        test: mockOaSummary(test),
        questions: (test.questions || []).map((question, index) => publicMockOaQuestion(question, index)),
      };
    },
    async submit(data = {}) {
      const testId = data.testId || data.test_id;
      if (!testId || !data.answers) return apiError('testId and answers are required');
      const test = state.mockTests.find((item) => item.id === testId);
      if (!test) return apiError('Test not found', 404);
      if (mockOaStatus(test) !== 'approved') return apiError('This test is not available for submission', 403);

      const rawViolations = Array.isArray(data.proctoring?.violations) ? data.proctoring.violations : [];
      const violations = rawViolations.filter((item) => item && typeof item.type === 'string').slice(0, 500);
      const providedIntegrity = data.proctoring?.integrityScore;
      const integrityScore = Number.isFinite(providedIntegrity)
        ? Math.max(0, Math.min(100, Math.round(providedIntegrity)))
        : (violations.length ? Math.max(0, 100 - violations.length * 5) : 100);
      const terminated = Boolean(data.proctoring?.terminated);
      const violationSummary = violations.reduce((summary, violation) => {
        summary[violation.type] = (summary[violation.type] || 0) + 1;
        return summary;
      }, {});
      const result = scoreMockOaQuestions(test.questions || [], data.answers);
      const completedAt = iso();
      const attempt = {
        id: localId('demo-mock-attempt'),
        student_id: studentProfile.id,
        test_id: test.id,
        score: result.score,
        answers: clone(result.scoredAnswers),
        pct: result.percentage,
        passed_mcq: result.correct,
        wrong_mcq: result.wrong,
        skipped_mcq: result.skipped,
        completed_at: completedAt,
        integrity_score: integrityScore,
        violation_count: violations.length,
        terminated,
        proctoring_summary: clone(violationSummary),
        violations: clone(violations),
      };
      state.mockAttempts.unshift(attempt);
      return {
        attemptId: attempt.id,
        testTitle: test.title,
        testType: test.type,
        score: result.score,
        totalPossible: result.totalPossible,
        percentage: result.percentage,
        passed: result.percentage >= 50,
        correct: result.correct,
        wrong: result.wrong,
        skipped: result.skipped,
        integrityScore,
        violationCount: violations.length,
        terminated,
        violationSummary,
        scoredAnswers: clone(result.scoredAnswers),
      };
    },
    async upload(data = {}) {
      const companyId = data.companyId || data.company_id;
      const testType = data.testType || data.test_type || data.type;
      const title = trim(data.title);
      const sourceQuestions = Array.isArray(data.questions) ? data.questions : [];
      if (!companyId || !testType || !title || !sourceQuestions.length) {
        return apiError('companyId, testType, title, and at least one question are required');
      }
      if (companyId !== orbit.id) return apiError('You are not authorized to upload for this company', 403);
      const questions = sourceQuestions.map((question, index) => ({
        id: localId(`demo-mock-q${index}`),
        question_text: trim(question.questionText || question.question_text),
        description: trim(question.description),
        type: question.questionType || question.question_type || 'mcq',
        section: question.section || 'general',
        options: Array.isArray(question.options) ? question.options : null,
        correct_index: question.correctAnswer ?? question.correct_index ?? null,
        marks: numeric(question.marks, 4),
        ordering: index,
        placeholder: question.placeholder || '',
        word_limit: question.word_limit,
        starter_code: question.starter_code,
        examples: question.examples,
        code_constraints: question.code_constraints,
      }));
      const test = {
        id: localId('demo-mock-oa'),
        company_id: orbit.id,
        companies: clone(orbit),
        recruiter_id: 'demo-recruiter-001',
        type: testType,
        title,
        duration: numeric(data.durationMinutes ?? data.duration, 60),
        status: 'pending',
        total_marks: questions.reduce((sum, question) => sum + numeric(question.marks, 4), 0),
        sections: [...new Set(questions.map((question) => question.section || 'general'))],
        created_at: iso(),
        questions,
      };
      state.mockTests.unshift(test);
      addNotification('admin', 'Local Mock OA awaiting review', `${test.title} was created in demo mode.`, { testId: test.id });
      return { message: 'OA test submitted for admin review', testId: test.id, status: 'pending' };
    },
    async myUploads() {
      return {
        tests: state.mockTests
          .filter((test) => test.recruiter_id === 'demo-recruiter-001')
          .map(mockOaSummary),
      };
    },
    async pending() {
      return {
        tests: state.mockTests
          .filter((test) => mockOaStatus(test) === 'pending')
          .map((test) => ({
            ...mockOaSummary(test),
            mock_oa_questions: clone(test.questions || []),
          })),
      };
    },
    async approve(id) {
      const test = state.mockTests.find((item) => item.id === id);
      if (!test) return apiError('Test not found', 404);
      if (mockOaStatus(test) === 'approved') return apiError('Test is already approved');
      const reviewedAt = iso();
      test.status = 'approved';
      test.reviewed_at = reviewedAt;
      test.reviewed_by = 'demo-admin-001';
      test.rejection_reason = null;
      addNotification('recruiter', 'Local Mock OA approved', `${test.title} is now visible in local sample data.`, { testId: test.id });
      return {
        message: `“${test.title}” is now live for students`,
        test: { id: test.id, title: test.title, status: test.status, reviewed_at: reviewedAt },
      };
    },
    async reject(id, reason = '') {
      const test = state.mockTests.find((item) => item.id === id);
      if (!test) return apiError('Test not found', 404);
      if (mockOaStatus(test) === 'rejected') return apiError('Test is already rejected');
      const reviewedAt = iso();
      test.status = 'rejected';
      test.reviewed_at = reviewedAt;
      test.reviewed_by = 'demo-admin-001';
      test.rejection_reason = trim(reason) || 'No reason provided';
      addNotification('recruiter', 'Local Mock OA rejected', `${test.title} was rejected in local sample data.`, { testId: test.id });
      return {
        message: `“${test.title}” has been rejected`,
        test: { id: test.id, title: test.title, status: test.status, rejection_reason: test.rejection_reason, reviewed_at: reviewedAt },
      };
    },
    async history() {
      const history = state.mockAttempts
        .filter((attempt) => attempt.student_id === studentProfile.id)
        .map((attempt) => {
          const test = state.mockTests.find((item) => item.id === attempt.test_id);
          return {
            id: attempt.id,
            testTitle: test?.title,
            testType: test?.type,
            company: test?.companies?.name,
            companyLogo: test?.companies?.logo_url,
            score: attempt.score,
            percentage: attempt.pct,
            passed: numeric(attempt.pct) >= 50,
            submittedAt: attempt.completed_at,
          };
        });
      return { history };
    },
  },

  companyOaApi: {
    async available() {
      const tests = state.companyTests
        .filter((test) => test.approval_status === 'approved' && test.is_active !== false)
        .filter((test) => {
          const branches = Array.isArray(test.target_branches) ? test.target_branches : [];
          const branchAllowed = !branches.length || branches.includes(studentProfile.branch);
          return branchAllowed && numeric(studentProfile.cgpa) >= numeric(test.min_cgpa);
        })
        .map((test) => {
          const attempts = state.companyAttempts.filter((attempt) => attempt.test_id === test.id && attempt.student_id === studentProfile.id);
          const best = attempts.reduce((current, attempt) => (!current || numeric(attempt.pct) > numeric(current.pct) ? attempt : current), null);
          return {
            ...assessmentSummary(test),
            attempt_count: attempts.length,
            best_pct: best?.pct || 0,
            best_grade: best?.grade || null,
          };
        });
      return { tests };
    },
    async take(id) {
      const test = state.companyTests.find((item) => item.id === id && item.approval_status === 'approved' && item.is_active !== false);
      if (!test) return apiError('Test not found or not approved', 404);
      const existing = state.companyAttempts.find((attempt) => attempt.test_id === id && attempt.student_id === studentProfile.id);
      if (existing) return apiError('You have already attempted this test. Only one attempt is allowed.');
      return {
        test: assessmentSummary(test),
        questions: (test.questions || []).map((question, index) => publicCompanyOaQuestion(question, index)),
      };
    },
    async attempt(id, data = {}) {
      const testId = id || data.testId || data.test_id;
      const existing = state.companyAttempts.find((attempt) => attempt.test_id === testId && attempt.student_id === studentProfile.id);
      if (existing) return apiError('You have already submitted this test. Duplicate attempts are not allowed.');
      const test = state.companyTests.find((item) => item.id === testId && item.approval_status === 'approved' && item.is_active !== false);
      if (!test) return apiError('Test not found', 404);
      const result = scoreCompanyOaQuestions(test.questions || [], data.answers || {});
      const attempt = {
        id: localId('demo-company-attempt'),
        test_id: test.id,
        student_id: studentProfile.id,
        answers: clone(data.answers || {}),
        score: result.score,
        max_score: result.maxScore,
        pct: result.pct,
        grade: result.grade,
        correct_count: result.correct,
        wrong_count: result.wrong,
        skipped_count: result.skipped,
        time_taken: numeric(data.timeTaken),
        auto_submitted: Boolean(data.autoSubmitted),
        completed_at: iso(),
      };
      state.companyAttempts.unshift(attempt);
      test.attempt_count = numeric(test.attempt_count) + 1;
      return clone(result);
    },
    async mine() {
      return {
        tests: state.companyTests
          .filter((test) => (test.submitted_by || test.recruiter_id) === 'demo-recruiter-001')
          .map(assessmentSummary),
      };
    },
    async create(data = {}) {
      const title = trim(data.title);
      const testType = trim(data.test_type);
      const sourceQuestions = Array.isArray(data.questions) ? data.questions : [];
      if (!title) return apiError('Title is required');
      if (!testType) return apiError('Test type is required');
      if (!sourceQuestions.length) return apiError('At least 1 question is required');
      for (let index = 0; index < sourceQuestions.length; index += 1) {
        const question = sourceQuestions[index];
        const type = question.question_type || 'mcq';
        if (!trim(question.question_text)) return apiError(`Question ${index + 1}: text is required`);
        if (type === 'mcq') {
          if (!Array.isArray(question.options) || question.options.length !== 4) return apiError(`Question ${index + 1}: MCQ must have exactly 4 options`);
          const correctIndex = question.correct_index;
          if (correctIndex === undefined || correctIndex === null || numeric(correctIndex, -1) < 0 || numeric(correctIndex, -1) > 3) {
            return apiError(`Question ${index + 1}: correct answer must be selected (0-3)`);
          }
        }
      }
      const questions = sourceQuestions.map((question, index) => ({
        id: localId(`demo-company-q${index}`),
        ordering: numeric(question.ordering, index + 1),
        section: trim(question.section) || 'General',
        question_type: question.question_type || 'mcq',
        marks: numeric(question.marks, 1),
        negative_marks: numeric(question.negative_marks, 0.25),
        question_text: trim(question.question_text),
        options: Array.isArray(question.options) ? question.options : null,
        correct_index: question.correct_index !== undefined ? numeric(question.correct_index) : null,
        explanation: trim(question.explanation),
        placeholder: trim(question.placeholder),
        word_limit: numeric(question.word_limit, 200),
      }));
      const test = {
        id: localId('demo-company-oa'),
        company_id: orbit.id,
        companies: clone(orbit),
        recruiter_id: 'demo-recruiter-001',
        submitted_by: 'demo-recruiter-001',
        title,
        description: trim(data.description),
        test_type: testType,
        duration: numeric(data.duration, 60),
        target_branches: Array.isArray(data.target_branches) ? data.target_branches : [],
        min_cgpa: numeric(data.min_cgpa),
        instructions: trim(data.instructions),
        approval_status: 'pending',
        is_active: true,
        created_at: iso(),
        question_count: questions.length,
        questions,
      };
      state.companyTests.unshift(test);
      addNotification('admin', 'Local Company OA awaiting review', `${test.title} was created in demo mode.`, { testId: test.id });
      return {
        message: 'OA test submitted for admin approval. It will be visible to students once approved.',
        test_id: test.id,
        question_count: questions.length,
      };
    },
    async remove(id) {
      const index = state.companyTests.findIndex((item) => item.id === id);
      if (index < 0) return apiError('Test not found', 404);
      const test = state.companyTests[index];
      if ((test.submitted_by || test.recruiter_id) !== 'demo-recruiter-001') return apiError('Not your test', 403);
      if (test.approval_status === 'approved') return apiError('Cannot delete an approved test');
      state.companyTests.splice(index, 1);
      state.companyAttempts = state.companyAttempts.filter((attempt) => attempt.test_id !== id);
      return { message: 'Test deleted' };
    },
    async pending() {
      return { tests: state.companyTests.filter((test) => test.approval_status === 'pending').map(assessmentSummary) };
    },
    async all() {
      return { tests: state.companyTests.map(assessmentSummary) };
    },
    async questions(id) {
      const test = state.companyTests.find((item) => item.id === id);
      return test ? { questions: clone(test.questions || []) } : apiError('Test not found', 404);
    },
    async approve(id, action = 'approve', note = '') {
      if (!['approve', 'reject'].includes(action)) return apiError('action must be approve or reject');
      const test = state.companyTests.find((item) => item.id === id);
      if (!test) return apiError('Test not found', 404);
      const approvedAt = iso();
      test.approval_status = action === 'approve' ? 'approved' : 'rejected';
      test.approval_note = note || '';
      test.approved_by = 'demo-admin-001';
      test.approved_at = approvedAt;
      if (action === 'approve') {
        addNotification('recruiter', 'Local Company OA approved', `${test.title} is now visible in local sample data.`, { testId: test.id });
      } else {
        addNotification('recruiter', 'Local Company OA rejected', `${test.title} was rejected in local sample data.`, { testId: test.id });
      }
      return {
        message: `Test ${action === 'approve' ? 'approved and published' : 'rejected'}.`,
        test: assessmentSummary(test),
      };
    },
  },

  adminApi: {
    async stats() { return adminStats(); },
    async students() {
      return {
        students: state.students.map((student) => ({ ...clone(student), users: { email: student.email } })),
        total: state.students.length,
      };
    },
    async updatePlacement(id, data = {}) {
      const student = state.students.find((item) => item.id === id);
      if (!student) return apiError('Sample student record not found.', 404);
      const patch = typeof data === 'string' ? { placement_status: data } : data;
      Object.assign(student, clone(patch), { updated_at: iso() });
      return { student: clone(student), message: 'Placement record updated locally.' };
    },
    async reports() {
      const rows = state.students.map((student) => ({
        id: student.id, name: student.full_name, rollNumber: student.roll_number, branch: student.branch, batch: student.batch,
        cgpa: student.cgpa, placementStatus: student.placement_status, company: student.placement_company || '—',
        role: student.placement_role || '—', package: student.placement_package || '—',
      }));
      return { report: rows, summary: adminStats().overview };
    },
    async companies() {
      const companies = [orbit, northstar, pixel].map((company) => ({
        ...clone(company),
        totalJobs: state.jobs.filter((job) => job.company_id === company.id).length,
        activeJobs: state.jobs.filter((job) => job.company_id === company.id && job.status === 'active' && job.approval_status === 'approved').length,
      }));
      return { companies };
    },
    async announcements() { return { announcements: clone(state.announcements) }; },
    async createAnnouncement(data = {}) {
      const announcement = {
        id: localId('demo-announcement'), title: trim(data.title) || 'Untitled local announcement', content: trim(data.content),
        priority: data.priority || 'normal', created_at: iso(), created_by: 'demo-admin-001',
      };
      state.announcements.unshift(announcement);
      addNotification('student', 'Local announcement', `${announcement.title} was published in local demo data.`, { announcementId: announcement.id });
      addNotification('recruiter', 'Local announcement', `${announcement.title} was published in local demo data.`, { announcementId: announcement.id });
      return { announcement: clone(announcement), message: 'Announcement saved locally. No email or external notification was sent.' };
    },
    async removeAnnouncement(id) {
      const index = state.announcements.findIndex((item) => item.id === id);
      if (index < 0) return apiError('Sample announcement not found.', 404);
      state.announcements.splice(index, 1);
      return { success: true, message: 'Announcement removed from local demo data.' };
    },
  },

  announcementApi: {
    async list() { return clone(state.announcements); },
  },

  interviewApi: {
    async save(data = {}) {
      const transcript = Array.isArray(data.transcript)
        ? data.transcript.map((item) => ({ question: item.question, answer: item.answer, timestamp: item.timestamp }))
        : [];
      const suppliedFeedback = data.aiFeedback && typeof data.aiFeedback === 'object' ? clone(data.aiFeedback) : {};
      const suppliedScores = suppliedFeedback.scores && typeof suppliedFeedback.scores === 'object' ? suppliedFeedback.scores : {};
      const typedPractice = suppliedFeedback.mode === 'typed-practice';
      const answerLength = transcript.reduce((sum, item) => sum + trim(item.answer).length, 0);
      const fallbackOverall = Math.min(90, Math.max(52, 56 + Math.min(28, Math.round(answerLength / 28))));
      const overallScore = typedPractice && Number.isFinite(Number(suppliedScores.overall))
        ? Math.max(0, Math.min(100, Math.round(Number(suppliedScores.overall))))
        : fallbackOverall;
      const grade = gradeFor(overallScore);
      const feedback = typedPractice
        ? {
          ...suppliedFeedback,
          overallScore,
          grade,
          summary: suppliedFeedback.summary || 'Local feedback is calculated from typed responses only. It is not an employment evaluation.',
          categories: {
            clarity: numeric(suppliedScores.confidence, overallScore),
            structure: numeric(suppliedScores.structure, overallScore),
            relevance: numeric(suppliedScores.relevance, overallScore),
          },
        }
        : {
          overallScore,
          grade,
          summary: 'Local sample feedback based only on typed answers in this app session. It is not an employment evaluation.',
          strengths: transcript.length ? ['Completed the typed practice prompts', 'Provided response content for local review'] : ['Started a typed practice session'],
          improvements: ['Use specific examples and measurable outcomes where appropriate'],
          categories: { clarity: Math.min(92, overallScore + 2), structure: Math.max(50, overallScore - 2), relevance: overallScore },
        };
      const session = {
        id: localId('demo-interview'), student_id: studentProfile.id, company: 'General', companyLogo: null,
        durationSeconds: numeric(data.durationSeconds, 0), duration: durationLabel(data.durationSeconds), overallScore, grade, conductedAt: iso(), transcript, feedback,
      };
      state.interviewSessions.unshift(session);
      return { session: interviewDetail(session), message: 'Typed practice session saved only in local demo memory.' };
    },
    async history() {
      return { history: state.interviewSessions.filter((item) => item.student_id === studentProfile.id).map(interviewSummary) };
    },
    async session(id) {
      const session = state.interviewSessions.find((item) => item.id === id && item.student_id === studentProfile.id);
      return session ? { session: interviewDetail(session) } : apiError('Local interview session not found.', 404);
    },
    async analytics() { return { averages: interviewAverages() }; },
    async flagViolation(sessionIdOrData, data = {}) {
      const payload = sessionIdOrData && typeof sessionIdOrData === 'object'
        ? sessionIdOrData
        : { ...data, sessionId: data.sessionId || sessionIdOrData };
      const session = state.interviewSessions.find((item) => item.id === payload.sessionId);
      if (session) session.local_flags = [...(session.local_flags || []), { ...clone(payload), created_at: iso() }];
      return { success: true, message: 'Local demo event noted only in memory; nothing was sent to a service.' };
    },
  },
};
