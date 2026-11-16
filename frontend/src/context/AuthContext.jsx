// src/context/AuthContext.jsx
// The backend JWT is the authority for SmartHire routes; the browser Supabase
// session is optional and used for client-side Supabase features.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import api, { authAPI } from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

function clearStoredAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function readCachedUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function jwtClaims(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')));
  } catch (_) {
    return null;
  }
}

function validCachedUser(user, claims) {
  return Boolean(
    user && claims &&
    typeof user.id === 'string' && user.id.length > 0 &&
    typeof claims.id === 'string' &&
    ['student', 'recruiter', 'admin'].includes(user.role) &&
    user.id === claims.id && user.role === claims.role
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const token = localStorage.getItem('token');
      const claims = token ? jwtClaims(token) : null;
      const cached = readCachedUser();

      if (!token || !claims || typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) {
        clearStoredAuth();
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        // Verify the JWT and refresh the role/avatar from the backend. A
        // Supabase browser session is not required to restore a backend login.
        const { data: account } = await api.get('/api/auth/me', {
          timeout: 10000,
          suppressGlobalError: true,
        });
        if (cancelled || localStorage.getItem('token') !== token) return;

        if (!account?.id || !account?.role || account.is_active === false
          || account.id !== claims.id || account.role !== claims.role) {
          clearStoredAuth();
          setUser(null);
          return;
        }

        const sameAccount = cached?.id === account.id;
        const restored = {
          id: account.id,
          email: account.email,
          role: account.role,
          name: (sameAccount && cached.name) || account.email?.split('@')[0] || '',
          avatar_url: account.avatar_url || null,
          avatar_updated_at: account.avatar_updated_at || null,
        };
        localStorage.setItem('user', JSON.stringify(restored));
        setUser(restored);
      } catch (error) {
        if (cancelled || localStorage.getItem('token') !== token) return;

        const status = error.response?.status;
        if (status === 401 || status === 403 || status === 404 || !validCachedUser(cached, claims)) {
          clearStoredAuth();
          setUser(null);
        } else {
          // A temporary network outage should not destroy a valid cached
          // login; protected API routes still verify the JWT server-side.
          setUser(cached);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restore();

    // localStorage changes from a different tab (including logout) must update
    // the visible account; Supabase SIGNED_OUT must not clear an independent JWT.
    const syncTabs = (event) => {
      if (event.key !== 'token' && event.key !== 'user' && event.key !== null) return;
      const token = localStorage.getItem('token');
      const claims = token ? jwtClaims(token) : null;
      const cached = readCachedUser();
      if (claims?.exp * 1000 > Date.now() && validCachedUser(cached, claims)) {
        setUser(cached);
      } else {
        setUser(null);
      }
    };
    window.addEventListener('storage', syncTabs);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', syncTabs);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const suppliedPassword = String(password ?? ''); // passwords may contain spaces

    try {
      const { data } = await authAPI.login(cleanEmail, suppliedPassword);
      if (!data?.token || !data?.userId || !data?.role) {
        throw new Error('Incomplete login response. Please try again.');
      }

      const name = data.name || data.profile?.full_name || cleanEmail.split('@')[0];
      const loggedInUser = {
        id: data.userId,
        email: data.email || cleanEmail,
        role: data.role,
        name,
        avatar_url: data.avatar_url || data.profile?.avatar_url || null,
        avatar_updated_at: data.avatar_updated_at || data.profile?.avatar_updated_at || null,
      };

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);

      // Browser Supabase auth supports realtime/storage features, but its
      // failure must not invalidate the verified backend JWT login.
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: suppliedPassword,
        });
        if (error) console.warn('Browser Supabase sign-in unavailable:', error.message);
      } catch (error) {
        console.warn('Browser Supabase sign-in unavailable:', error?.message);
      }

      toast.success(`Welcome back${name ? ', ' + name : ''}!`);
      return { success: true, role: data.role };
    } catch (error) {
      const response = error.response?.data;
      if (response?.needsVerification) {
        toast('Please verify your email to continue.', { icon: '📧' });
        return { success: false, needsVerification: true, email: response.email || cleanEmail };
      }
      const message = response?.error || response?.errors?.[0]?.msg || error.message || 'Invalid email or password';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  const register = useCallback(async (formData) => {
    try {
      const { data } = await authAPI.register(formData);
      if (data?.needsVerification) {
        toast.success('Account created! Check your email for a verification code.');
        return { success: true, needsVerification: true, email: data.email || formData.email };
      }
      toast.success('Account created! You can now log in.');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    clearStoredAuth();
    setUser(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.warn('Browser Supabase sign-out unavailable:', error.message);
    } catch (error) {
      console.warn('Browser Supabase sign-out unavailable:', error?.message);
    } finally {
      toast.success('Logged out successfully');
      window.location.href = '/login';
    }
  }, []);

  const updateUserLocally = useCallback((updates) => {
    setUser((current) => {
      if (!current) return current;
      const updated = { ...current, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isStudent: user?.role === 'student',
    isRecruiter: user?.role === 'recruiter',
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    updateUserLocally,
  }), [user, loading, login, register, logout, updateUserLocally]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
