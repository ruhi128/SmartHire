// src/context/AuthContext.jsx
// Global authentication state using Supabase Auth + our custom JWT role system

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { authAPI } from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);   // { id, email, role, name }
  const [loading, setLoading] = useState(true);   // true while checking session

  // ── Restore session on mount ──
  useEffect(() => {
    const restore = async () => {
      try {
        // 1. Check if there's an active Supabase session
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // 2. Check our localStorage for role info (set during login)
          const stored = localStorage.getItem('user');
          if (stored) {
            setUser(JSON.parse(stored));
          } else {
            // Fallback: fetch profile from backend
            const token = localStorage.getItem('token');
            if (token) {
              await fetchAndSetProfile(session.user);
            }
          }
        }
      } catch (err) {
        console.error('Session restore failed:', err);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    restore();

    // 3. Listen for Supabase auth state changes (tab switch, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          clearAuth();
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refreshed silently — nothing needed
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Fetch full profile (fallback) ──
  const fetchAndSetProfile = async (supabaseUser) => {
    try {
      const { data } = await authAPI.login(supabaseUser.email, ''); // won't work
      // This is just a fallback — in normal flow profile is set in login()
    } catch {
      clearAuth();
    }
  };

  // ── LOGIN ──
  const login = useCallback(async (email, password) => {
  try {
    const { data } = await authAPI.login(email, password);
    
    const token  = data.token;
    const role   = data.role;
    const userId = data.userId;           // ✅ now backend sends this
    const name   = data.name             // ✅ now backend sends this
                || data.profile?.full_name
                || email.split('@')[0];

    localStorage.setItem('token', token);

    const userData = { 
      id:    userId,  // ✅ will now be a real UUID
      email, 
      role, 
      name,
    };

    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    await supabase.auth.signInWithPassword({ email, password });

    toast.success(`Welcome back${name ? ', ' + name : ''}!`);
    return { success: true, role };
  } catch (err) {
    const msg = err.response?.data?.error || 'Invalid email or password';
    toast.error(msg);
    return { success: false, error: msg };
  }
}, []);

  // ── REGISTER ──
  const register = useCallback(async (formData) => {
    try {
      await authAPI.register(formData);
      toast.success('Account created! You can now log in.');
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed';
      toast.error(msg);
      return { success: false, error: msg };
    }
  }, []);

  // ── LOGOUT ──
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    clearAuth();
    toast.success('Logged out successfully');
    window.location.href = '/login';
  }, []);

  // ── UPDATE user info locally (e.g. after profile edit) ──
  const updateUserLocally = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ── CLEAR all auth data ──
  function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  // ── Derived helpers ──
  const isStudent   = user?.role === 'student';
  const isRecruiter = user?.role === 'recruiter';
  const isAdmin     = user?.role === 'admin';

  const value = {
    user,
    loading,
    isStudent,
    isRecruiter,
    isAdmin,
    login,
    register,
    logout,
    updateUserLocally,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
