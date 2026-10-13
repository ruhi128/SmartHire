import { AppState } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationsApi } from '../api';
import { useAuth } from './AuthContext';
import { savePushRegistration } from '../storage/pushRegistration';
import {
  getPushCapability,
  parseNotificationResponse,
  requestExpoPushRegistration,
} from '../notifications/pushNotifications';
import { createPushTapDeduper } from '../notifications/tapDeduplication';
import { navigateFromInboxLink } from '../navigation/notificationNavigation';
import { navigationRef } from '../navigation/navigationRef';

const NotificationContext = createContext(null);

function isUnread(notification) {
  return Boolean(notification) && !(notification.isRead ?? notification.is_read ?? false);
}

function pushStatusFromCapability(capability) {
  return {
    status: capability.status || 'unavailable',
    permissionStatus: null,
    message: capability.message || 'Device notifications are unavailable on this device.',
    updatedAt: new Date().toISOString(),
  };
}

function expectedRootRoute(role) {
  if (role === 'student') return 'StudentApp';
  if (role === 'recruiter') return 'RecruiterApp';
  if (role === 'admin') return 'AdminApp';
  return null;
}

function authenticatedNavigatorIsMounted(user) {
  const expected = expectedRootRoute(user?.role);
  if (!expected || !navigationRef.isReady()) return false;
  const state = navigationRef.getRootState?.();
  return Boolean(state?.routes?.some((route) => route.name === expected));
}

/**
 * Shared state for SmartHire's persisted in-app inbox and additive remote
 * delivery. The database inbox always remains authoritative: the OS alert is
 * best-effort and never replaces authenticated list/read requests.
 */
export function NotificationProvider({ children }) {
  const { session, user, initializing } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [pushStatus, setPushStatus] = useState(() => ({
    status: 'checking',
    permissionStatus: null,
    message: 'Checking device-notification availability…',
    updatedAt: null,
  }));
  const [navigationReady, setNavigationReady] = useState(false);
  const [pendingPushTaps, setPendingPushTaps] = useState([]);

  const mountedRef = useRef(true);
  const activeIdentityRef = useRef(null);
  const inFlightRef = useRef(null);
  const tapDeduperRef = useRef(null);
  const processingTapKeysRef = useRef(new Set());
  if (!tapDeduperRef.current) tapDeduperRef.current = createPushTapDeduper();

  const identityKey = session?.token && user?.id ? `${user.id}:${session.token}` : null;
  activeIdentityRef.current = identityKey;

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const updatePushStatus = useCallback((nextStatus, requestIdentity = activeIdentityRef.current) => {
    if (!mountedRef.current || activeIdentityRef.current !== requestIdentity) return;
    setPushStatus({
      permissionStatus: null,
      updatedAt: new Date().toISOString(),
      ...nextStatus,
    });
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    const requestIdentity = identityKey;
    if (initializing || !requestIdentity) {
      if (mountedRef.current && !requestIdentity) {
        setUnreadCount(0);
        setLastError(null);
        setLastUpdatedAt(null);
      }
      return 0;
    }

    if (inFlightRef.current?.identity === requestIdentity) {
      return inFlightRef.current.promise;
    }

    if (mountedRef.current) setRefreshing(true);
    const request = notificationsApi.unreadCount()
      .then((payload) => {
        const nextCount = Math.max(0, Number(payload?.unreadCount ?? payload?.count ?? 0) || 0);
        if (mountedRef.current && activeIdentityRef.current === requestIdentity) {
          setUnreadCount(nextCount);
          setLastError(null);
          setLastUpdatedAt(new Date().toISOString());
        }
        return nextCount;
      })
      .catch((error) => {
        if (mountedRef.current && activeIdentityRef.current === requestIdentity) {
          setLastError(error);
        }
        throw error;
      })
      .finally(() => {
        if (inFlightRef.current?.promise === request) inFlightRef.current = null;
        if (mountedRef.current && activeIdentityRef.current === requestIdentity) {
          setRefreshing(false);
        }
      });

    inFlightRef.current = { identity: requestIdentity, promise: request };
    return request;
  }, [identityKey, initializing]);

  /**
   * Ask Android for permission/token and then bind that opaque token to the
   * currently authenticated SmartHire user. The local SecureStore record is
   * written first so intentional logout can remove the server record even if a
   * response is interrupted after the backend upsert succeeds.
   */
  const registerForPushNotifications = useCallback(async () => {
    const requestIdentity = identityKey;
    if (initializing || !requestIdentity || !user?.id || !session?.token) {
      const capability = getPushCapability();
      updatePushStatus(pushStatusFromCapability(capability), requestIdentity);
      return capability;
    }

    updatePushStatus({
      status: 'registering',
      message: 'Registering this device for SmartHire updates…',
    }, requestIdentity);

    const registration = await requestExpoPushRegistration();
    if (registration.status !== 'token_ready') {
      updatePushStatus({
        status: registration.status || 'error',
        permissionStatus: registration.permissionStatus || null,
        message: registration.message || 'Could not register this device for notifications.',
      }, requestIdentity);
      return registration;
    }

    try {
      await savePushRegistration({
        userId: user.id,
        expoPushToken: registration.expoPushToken,
      });
      await notificationsApi.registerDevice({
        expoPushToken: registration.expoPushToken,
        platform: registration.platform,
        deviceName: registration.deviceName,
        appVersion: registration.appVersion,
      });
      updatePushStatus({
        status: 'enabled',
        permissionStatus: registration.permissionStatus,
        message: 'Device notifications are enabled for this SmartHire account.',
      }, requestIdentity);
    } catch (error) {
      const message = error?.response?.data?.error || 'Could not save this device with SmartHire. Your inbox still works in the app.';
      updatePushStatus({
        status: 'error',
        permissionStatus: registration.permissionStatus || null,
        message: String(message).slice(0, 260),
      }, requestIdentity);
    }
    return registration;
  }, [identityKey, initializing, session?.token, updatePushStatus, user?.id]);

  useEffect(() => {
    if (initializing) return undefined;
    if (!identityKey) {
      setUnreadCount(0);
      setLastError(null);
      setLastUpdatedAt(null);
      const capability = getPushCapability();
      updatePushStatus(pushStatusFromCapability(capability), null);
      return undefined;
    }
    refreshUnreadCount().catch(() => {});
    registerForPushNotifications().catch(() => {});
    return undefined;
  }, [identityKey, initializing, refreshUnreadCount, registerForPushNotifications, updatePushStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshUnreadCount().catch(() => {});
        if (identityKey) registerForPushNotifications().catch(() => {});
      }
    });
    return () => subscription?.remove?.();
  }, [identityKey, refreshUnreadCount, registerForPushNotifications]);

  const enqueueNotificationResponse = useCallback((response) => {
    const tap = parseNotificationResponse(response);
    if (!tap || !tapDeduperRef.current.remember(tap.responseKey)) return;

    // Keep a short bounded queue. The response-key deduper also has bounded
    // TTL/LRU retention, so listener + launch-response duplicates cannot grow
    // indefinitely during a long-lived app session.
    setPendingPushTaps((current) => [...current, tap].slice(-8));
  }, []);

  // A foreground receipt refreshes the persisted unread counter; a response
  // listener covers banners/trays, while getLastNotificationResponseAsync
  // covers a notification that launched the app from a closed state.
  useEffect(() => {
    const capability = getPushCapability();
    if (!capability.available) return undefined;

    let active = true;
    let receivedSubscription;
    let responseSubscription;
    try {
      receivedSubscription = Notifications.addNotificationReceivedListener(() => {
        refreshUnreadCount().catch(() => {});
      });
      responseSubscription = Notifications.addNotificationResponseReceivedListener(enqueueNotificationResponse);
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (active && response) enqueueNotificationResponse(response);
        })
        .catch(() => {});
    } catch (error) {
      console.warn('SmartHire notification listeners are unavailable:', error?.message || 'unknown error');
    }

    return () => {
      active = false;
      receivedSubscription?.remove?.();
      responseSubscription?.remove?.();
    };
  }, [enqueueNotificationResponse, refreshUnreadCount]);

  const consumePushTap = useCallback(async (tap) => {
    if (!tap || !user?.id || tap.recipientUserId !== user.id) return;
    if (!authenticatedNavigatorIsMounted(user)) return;
    if (processingTapKeysRef.current.has(tap.responseKey)) return;

    processingTapKeysRef.current.add(tap.responseKey);
    try {
      try {
        await notificationsApi.markRead(tap.notificationId);
      } catch {
        // Navigation remains useful if a transient request fails; refresh below
        // will restore the source-of-truth unread count when connectivity returns.
      }

      const routed = navigateFromInboxLink(navigationRef, tap.link);
      if (!routed && navigationRef.isReady()) navigationRef.navigate('Notifications');
      refreshUnreadCount().catch(() => {});
    } finally {
      processingTapKeysRef.current.delete(tap.responseKey);
      setPendingPushTaps((current) => current.filter((item) => item.responseKey !== tap.responseKey));
    }
  }, [refreshUnreadCount, user]);

  // Never navigate or mark an item read before both the matching authenticated
  // account and its role navigator are mounted. A stale response for another
  // signed-in account is discarded without touching that account's inbox.
  useEffect(() => {
    if (initializing || !pendingPushTaps.length || !user?.id) return;
    const nextTap = pendingPushTaps[0];
    if (nextTap.recipientUserId !== user.id) {
      // Do not retain a response seen under the wrong account: if its rightful
      // user later taps the tray alert, it should still be actionable.
      tapDeduperRef.current.forget(nextTap.responseKey);
      setPendingPushTaps((current) => current.filter((item) => item.responseKey !== nextTap.responseKey));
      return;
    }
    if (!navigationReady || !authenticatedNavigatorIsMounted(user)) return;
    consumePushTap(nextTap).catch(() => {});
  }, [consumePushTap, initializing, navigationReady, pendingPushTaps, user]);

  const markNotificationReadLocally = useCallback((notification) => {
    if (!isUnread(notification)) return;
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const removeNotificationLocally = useCallback((notification) => {
    if (!isUnread(notification)) return;
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const markAllNotificationsReadLocally = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const value = useMemo(() => ({
    unreadCount,
    refreshing,
    lastError,
    lastUpdatedAt,
    pushStatus,
    refreshUnreadCount,
    registerForPushNotifications,
    setNavigationReady,
    markNotificationReadLocally,
    removeNotificationLocally,
    markAllNotificationsReadLocally,
  }), [
    unreadCount,
    refreshing,
    lastError,
    lastUpdatedAt,
    pushStatus,
    refreshUnreadCount,
    registerForPushNotifications,
    markNotificationReadLocally,
    removeNotificationLocally,
    markAllNotificationsReadLocally,
  ]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}
