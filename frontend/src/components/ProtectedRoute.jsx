// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * ProtectedRoute
 * Wraps a route to require authentication.
 * Optionally requires a specific role.
 *
 * Usage:
 *   <ProtectedRoute requiredRole="student">
 *     <StudentDashboard />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show spinner while checking session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: '#040c18' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2
            style={{
              width: 40, height: 40,
              color: '#00c8f0',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <p style={{ color: '#64748b', fontSize: 13, letterSpacing: 2 }}>
            LOADING
          </p>
        </div>
      </div>
    );
  }

  // Not logged in → redirect to login, remember where they were trying to go
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wrong role → redirect to their portal
  if (requiredRole && user.role !== requiredRole) {
    const roleHome = {
      student:   '/student/dashboard',
      recruiter: '/recruiter/dashboard',
      admin:     '/admin/dashboard',
    };
    return <Navigate to={roleHome[user.role] || '/login'} replace />;
  }

  return children;
}
