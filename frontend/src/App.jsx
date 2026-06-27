// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Loader2 } from 'lucide-react';

import Login             from './pages/Login';
import Register          from './pages/Register';
import StudentLayout     from './layouts/StudentLayout';
import RecruiterLayout   from './layouts/RecruiterLayout';
import AdminLayout       from './layouts/AdminLayout';
import StudentDashboard  from './pages/student/Dashboard';
import AptitudeTest      from './pages/student/AptitudeTest';
import AptitudeAnalysis  from './pages/student/AptitudeAnalysis';
import DSACoding         from './pages/student/DSACoding';
import DSAPerformance    from './pages/student/DSAPerformance';
import MockInterview     from './pages/student/MockInterview';
import MockOA            from './pages/student/MockOA';
import ResumeBuilder     from './pages/student/ResumeBuilder';
import ATSScoring        from './pages/student/ATSScoring';
import Announcements     from './pages/student/Announcements';
import Profile           from './pages/student/Profile';
import Jobs              from './pages/student/Jobs';
import RecruiterDashboard from './pages/recruiter/Dashboard';
import PostJob           from './pages/recruiter/PostJob';
import Applicants        from './pages/recruiter/Applicants';
import AdminDashboard    from './pages/admin/Dashboard';
import AdminStudents     from './pages/admin/Students';
import AdminReports      from './pages/admin/Reports';
import AdminCompanies    from './pages/admin/Companies';
import JobApprovals     from './pages/admin/JobApprovals';
import CompanyOAApprovals from './pages/admin/CompanyOAApproval';
import CompanyOA from './pages/student/CompanyOA';
import CompanyOATests from './pages/student/CompanyOA';
import UploadOA from './pages/recruiter/UploadOA';

// ── Runtime import validation — logs bad imports to console ──
const IMPORTS = {
  Login, Register, StudentLayout, RecruiterLayout, AdminLayout,
  StudentDashboard, AptitudeTest, AptitudeAnalysis, DSACoding, DSAPerformance,
  MockInterview, MockOA, ResumeBuilder, ATSScoring, Announcements, Profile, Jobs,
  RecruiterDashboard, PostJob, Applicants,
  AdminDashboard, AdminStudents, AdminReports, AdminCompanies, JobApprovals, CompanyOAApprovals,CompanyOA,
};
const BAD_IMPORTS = Object.entries(IMPORTS)
  .filter(([, v]) => typeof v !== 'function')
  .map(([k, v]) => ({ name: k, type: typeof v, value: v }));

if (BAD_IMPORTS.length > 0) {
  console.error('🔴 BAD IMPORTS — these are not React components:', BAD_IMPORTS);
}

function PageLoader() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#040c18' }}>
      <Loader2 style={{ width:36, height:36, color:'#00c8f0', animation:'spin 1s linear infinite' }}/>
    </div>
  );
}

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    const home = { student:'/student/dashboard', recruiter:'/recruiter/dashboard', admin:'/admin/dashboard' };
    return <Navigate to={home[user.role] || '/login'} replace />;
  }
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  const home = { student:'/student/dashboard', recruiter:'/recruiter/dashboard', admin:'/admin/dashboard' };
  return <Navigate to={home[user.role] || '/login'} replace />;
}

export default function App() {
  // Show diagnostic screen if any import is broken
  if (BAD_IMPORTS.length > 0) {
    return (
      <div style={{ minHeight:'100vh', background:'#040c18', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:"'Sora',sans-serif" }}>
        <div style={{ background:'#0b1a2e', border:'1px solid rgba(240,75,75,0.3)', borderRadius:16, padding:32, maxWidth:640, width:'100%' }}>
          <h2 style={{ color:'#f04b4b', margin:'0 0 8px', fontSize:18 }}>❌ Import Error — fix these files</h2>
          <p style={{ color:'#64748b', fontSize:13, margin:'0 0 20px' }}>These components are not exporting a function. Check for missing <code style={{color:'#00c8f0'}}>export default</code> or wrong export type:</p>
          {BAD_IMPORTS.map((b,i) => (
            <div key={i} style={{ fontFamily:'monospace', fontSize:12, background:'#071525', borderRadius:8, padding:'10px 14px', marginBottom:8, color:'#f04b4b' }}>
              <strong>{b.name}</strong> — got: <em>{b.type}</em>{b.type==='object' ? ` → ${JSON.stringify(b.value)?.slice(0,80)}` : ''}
            </div>
          ))}
          <p style={{ color:'#475569', fontSize:11, margin:'16px 0 0' }}>Also check browser Console (F12) for full details.</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"         element={<RootRedirect />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/student" element={<ProtectedRoute requiredRole="student"><StudentLayout /></ProtectedRoute>}>
            <Route index                    element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"         element={<StudentDashboard />} />
            <Route path="jobs"              element={<Jobs />} />
            <Route path="aptitude"          element={<AptitudeTest />} />
            <Route path="aptitude/analysis" element={<AptitudeAnalysis />} />
            <Route path="dsa"               element={<DSACoding />} />
            <Route path="dsa/performance"   element={<DSAPerformance />} />
            <Route path="interview"         element={<MockInterview />} />
            <Route path="mockoa"            element={<MockOA />} />
            <Route path="resume"            element={<ResumeBuilder />} />
            <Route path="ats"               element={<ATSScoring />} />
            <Route path="announcements"     element={<Announcements />} />
            <Route path="profile"           element={<Profile />} />
            <Route path="companyoa" element={<CompanyOATests />} />
          </Route>

          <Route path="/recruiter" element={<ProtectedRoute requiredRole="recruiter"><RecruiterLayout /></ProtectedRoute>}>
            <Route index                    element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"         element={<RecruiterDashboard />} />
            <Route path="post-job"          element={<PostJob />} />
            <Route path="applicants"        element={<Applicants />} />
            <Route path="applicants/:jobId" element={<Applicants />} />
             <Route path="upload-oa"         element={<UploadOA />} />
          </Route>

          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
            <Route index                    element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"         element={<AdminDashboard />} />
            <Route path="students"          element={<AdminStudents />} />
            <Route path="companies"         element={<AdminCompanies />} />
            <Route path="job-approvals"    element={<JobApprovals />} />
            <Route path="reports"           element={<AdminReports />} />
            <Route path="company-oa-approvals" element={<CompanyOAApprovals />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster position="top-right" toastOptions={{
          duration: 4000,
          style: { background:'#0f2040', color:'#e2e8f0', border:'1px solid #1e3a5f', borderRadius:'10px', fontSize:'14px' },
          success: { iconTheme: { primary:'#10c98a', secondary:'#0f2040' } },
          error:   { iconTheme: { primary:'#f04b4b', secondary:'#0f2040' } },
        }}/>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
