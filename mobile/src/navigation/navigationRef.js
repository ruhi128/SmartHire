import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

// A push response can arrive while SecureStore restoration or role navigation
// is still rendering. Keep its data until the authenticated navigator exists
// instead of silently losing a cold-start tap.
const pendingNotificationPayloads = [];
const handledNotificationIds = new Set();
const MAX_HANDLED_IDS = 100;
// NavigationContainer can be ready while RootNavigator still renders its
// session-restore loading view or the unauthenticated stack. Keep notification
// routes queued until the signed-in role navigator has actually mounted.
let authenticatedNavigatorReady = false;

export function setAuthenticatedNavigationReady(ready) {
  authenticatedNavigatorReady = Boolean(ready);
}

function responseKey(data = {}) {
  return data.notificationId || data.notification_id || data.responseId || null;
}

function rememberHandled(key) {
  if (!key) return;
  handledNotificationIds.add(key);
  if (handledNotificationIds.size > MAX_HANDLED_IDS) {
    handledNotificationIds.delete(handledNotificationIds.values().next().value);
  }
}

function navigateWhenReady(data = {}) {
  const link = data.link || data.url || '';

  if (link.includes('/student/applications')) {
    navigationRef.navigate('StudentApp', { screen: 'JobsTab', params: { screen: 'Applications' } });
  } else if (link.includes('/student/jobs')) {
    navigationRef.navigate('StudentApp', { screen: 'JobsTab', params: { screen: 'JobsList' } });
  } else if (link.includes('/student/aptitude')) {
    navigationRef.navigate('StudentApp', { screen: 'PracticeTab', params: { screen: 'AptitudeTests' } });
  } else if (link.includes('/student/dsa')) {
    navigationRef.navigate('StudentApp', { screen: 'PracticeTab', params: { screen: 'DsaList' } });
  } else if (link.includes('/student')) {
    navigationRef.navigate('StudentApp', { screen: 'HomeTab' });
  } else if (link.includes('/recruiter/jobs')) {
    navigationRef.navigate('RecruiterApp', { screen: 'RecruiterJobsTab', params: { screen: 'RecruiterJobs' } });
  } else if (link.includes('/recruiter')) {
    navigationRef.navigate('RecruiterApp', { screen: 'RecruiterHomeTab', params: { screen: 'RecruiterDashboard' } });
  } else if (link.includes('/admin/job-approvals')) {
    navigationRef.navigate('AdminApp', { screen: 'AdminReviewsTab', params: { screen: 'AdminJobApprovals' } });
  } else if (link.includes('/admin/oa')) {
    navigationRef.navigate('AdminApp', { screen: 'AdminReviewsTab', params: { screen: 'AdminOaReviews' } });
  } else if (link.includes('/admin/students')) {
    navigationRef.navigate('AdminApp', { screen: 'AdminStudentsTab', params: { screen: 'AdminStudents' } });
  } else if (link.includes('/admin/reports')) {
    navigationRef.navigate('AdminApp', { screen: 'AdminHomeTab', params: { screen: 'AdminReports' } });
  } else if (link.includes('/admin')) {
    navigationRef.navigate('AdminApp', { screen: 'AdminHomeTab', params: { screen: 'AdminDashboard' } });
  } else {
    navigationRef.navigate('Notifications');
  }
}

/**
 * Maps stable backend links to mobile-native routes. If the authenticated role
 * navigator is not mounted yet, stores one deduplicated response for
 * RootNavigator to flush.
 */
export function navigateFromNotification(data = {}) {
  const key = responseKey(data);
  if (key && handledNotificationIds.has(key)) return false;

  if (!navigationRef.isReady() || !authenticatedNavigatorReady) {
    const alreadyQueued = key && pendingNotificationPayloads.some((item) => responseKey(item) === key);
    if (!alreadyQueued) pendingNotificationPayloads.push(data);
    return false;
  }

  rememberHandled(key);
  navigateWhenReady(data);
  return true;
}

/** Flush queued cold-start responses once an authenticated root is mounted. */
export function flushPendingNotificationNavigation() {
  if (!navigationRef.isReady() || !authenticatedNavigatorReady || !pendingNotificationPayloads.length) return false;

  const queued = pendingNotificationPayloads.splice(0, pendingNotificationPayloads.length);
  queued.forEach((data) => {
    const key = responseKey(data);
    if (key && handledNotificationIds.has(key)) return;
    rememberHandled(key);
    navigateWhenReady(data);
  });
  return true;
}

// A queued response belongs to the authenticated session that received it.
// Do not replay it if that session disappears before role navigation mounts.
export function clearPendingNotificationNavigation() {
  pendingNotificationPayloads.splice(0, pendingNotificationPayloads.length);
}
