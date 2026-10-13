import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, notificationsApi } from '../api';
import { configureApiSession } from '../api/client';
import { DEMO_ACCOUNTS, DEMO_MODE } from '../config/runtime';
import { clearStoredSession, getStoredSession, saveStoredSession } from '../storage/session';
import { clearStoredPushRegistration, getStoredPushRegistration } from '../storage/pushRegistration';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const logout = useCallback(async ({ unregisterDevice = true } = {}) => {
    const activeSession = session;
    try {
      // An intentional user logout removes the matching server-side device
      // record while its bearer token is still valid. An auth-expiry logout
      // explicitly skips this request to avoid interceptor recursion.
      if (unregisterDevice && !DEMO_MODE && activeSession?.token && activeSession?.user?.id) {
        const registration = await getStoredPushRegistration();
        if (registration?.userId === activeSession.user.id && registration.expoPushToken) {
          await notificationsApi.unregisterDevice(registration.expoPushToken).catch((error) => {
            // Logout must still complete when offline or if a server migration
            // has not yet been applied. The local record is cleared below.
            console.warn('Could not unregister SmartHire device notifications:', error?.message || 'unknown error');
          });
        }
      }
    } finally {
      // Clear the local token record for both user-initiated and expiry paths.
      // A future authenticated registration can safely associate this device.
      await clearStoredPushRegistration().catch(() => {});
      await clearStoredSession();
      setSession(null);
    }
  }, [session]);

  useEffect(() => {
    let mounted = true;
    getStoredSession()
      .then(async (stored) => {
        // Never restore a real session in local-demo mode or a demo session in a
        // normal build. This keeps the two modes intentionally isolated.
        const storedIsDemo = stored?.demo === true;
        if (stored && storedIsDemo !== DEMO_MODE) {
          await clearStoredSession();
          if (mounted) setSession(null);
          return;
        }
        if (mounted) setSession(stored || null);
      })
      .finally(() => { if (mounted) setInitializing(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    configureApiSession({
      tokenGetter: async () => session?.token || null,
      unauthorizedHandler: async () => logout({ unregisterDevice: false }),
    });
  }, [session, logout]);

  const signIn = useCallback(async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const response = await authApi.login(normalizedEmail, password);
    // Existing backend responses use userId/role/name. The local demo uses a
    // nested user payload so its sample identity stays self-contained.
    const identity = response.user || {
      id: response.userId,
      role: response.role,
      name: response.name,
      profile: response.profile || null,
      email: normalizedEmail,
    };
    const nextSession = {
      token: response.token,
      demo: DEMO_MODE && response.demo === true,
      user: {
        id: identity.id || response.userId,
        role: identity.role || response.role,
        name: identity.name || identity.full_name || response.name,
        profile: identity.profile || response.profile || null,
        email: identity.email || normalizedEmail,
      },
    };
    await saveStoredSession(nextSession);
    // Make the newly issued token available to API calls immediately (for example
    // a first authenticated inbox request right after sign-in), before React commits state.
    configureApiSession({
      tokenGetter: async () => nextSession.token,
      unauthorizedHandler: async () => logout({ unregisterDevice: false }),
    });
    setSession(nextSession);
    return nextSession;
  }, [logout]);

  const signInDemo = useCallback(async (role) => {
    if (!DEMO_MODE) throw new Error('Local demo mode is disabled.');
    const account = DEMO_ACCOUNTS.find((item) => item.role === role);
    if (!account) throw new Error('Unknown local demo role.');
    return signIn(account.email, 'local-demo-no-password');
  }, [signIn]);

  // Keep display identity in sync when a profile screen saves a supported
  // identity field (currently the student's full name). The backend remains
  // the source of truth; this only prevents stale tab/dashboard greetings
  // until the next app launch.
  const updateUserLocally = useCallback(async (patch = {}) => {
    if (!session?.user) return null;
    const nextSession = {
      ...session,
      user: { ...session.user, ...patch },
    };
    await saveStoredSession(nextSession);
    setSession(nextSession);
    return nextSession.user;
  }, [session]);

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    initializing,
    demoMode: DEMO_MODE,
    signIn,
    signInDemo,
    logout,
    updateUserLocally,
  }), [session, initializing, signIn, signInDemo, logout, updateUserLocally]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
