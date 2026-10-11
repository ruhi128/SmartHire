import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { deviceApi, notificationsApi } from '../api';
import { DEMO_MODE } from '../config/runtime';
import { navigateFromNotification } from '../navigation/navigationRef';

const PUSH_TOKEN_KEY = 'smarthire.expoPushToken';
const PUSH_STATUS_KEY = 'smarthire.pushRegistrationStatus';
const PLACEHOLDER_PROJECT_ID = 'REPLACE_WITH_YOUR_EAS_PROJECT_ID';

if (!DEMO_MODE) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function getProjectId() {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    null
  );
}

function hasUsableProjectId(projectId) {
  return Boolean(projectId && projectId !== PLACEHOLDER_PROJECT_ID);
}

async function saveRegistrationStatus(status, detail = '') {
  const value = {
    status,
    detail,
    updatedAt: new Date().toISOString(),
  };
  try {
    await SecureStore.setItemAsync(PUSH_STATUS_KEY, JSON.stringify(value));
  } catch {
    // Registration must still work if local diagnostic storage is unavailable.
  }
  return value;
}

/**
 * A small, non-secret diagnostic record for the signed-in user interface.
 * It never exposes or stores the actual Expo token in the screen state.
 */
export async function getPushRegistrationStatus() {
  if (DEMO_MODE) return { status: 'demo-disabled', detail: 'Push notifications are disabled in local demo mode.', updatedAt: null };
  try {
    const raw = await SecureStore.getItemAsync(PUSH_STATUS_KEY);
    return raw ? JSON.parse(raw) : { status: 'not-registered', detail: '', updatedAt: null };
  } catch {
    return { status: 'not-registered', detail: '', updatedAt: null };
  }
}

/**
 * Returns the local setup state without requesting permission or sending data.
 * This lets the account screen explain why registration cannot yet happen.
 */
export function getPushConfiguration() {
  if (DEMO_MODE) return { ready: false, reason: 'Push notifications are intentionally disabled in local demo mode.' };
  const projectId = getProjectId();
  if (Platform.OS === 'web') {
    return { ready: false, reason: 'Push notifications are available in Android and iOS builds, not the web preview.' };
  }
  if (!Device.isDevice) {
    return { ready: false, reason: 'Use a physical Android or iOS device for remote-push testing.' };
  }
  if (!hasUsableProjectId(projectId)) {
    return { ready: false, reason: 'Link this app to its Expo EAS project, then install a new development build.' };
  }
  return { ready: true, reason: '' };
}

async function skipped(status, detail) {
  await saveRegistrationStatus(status, detail);
  return { registered: false, status, detail };
}

export async function registerForPushNotificationsAsync() {
  // Do not request permission, initialise an Expo token, or call the backend in demo mode.
  if (DEMO_MODE) return { registered: false, status: 'demo-disabled', detail: 'Push notifications are disabled in local demo mode.' };
  const configuration = getPushConfiguration();
  if (!configuration.ready) return skipped('setup-required', configuration.reason);

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'SmartHire updates',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
      });
    }

    const permissions = await Notifications.getPermissionsAsync();
    let finalStatus = permissions.status;
    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }
    if (finalStatus !== 'granted') {
      return skipped('permission-denied', 'Notification permission is off for SmartHire on this device.');
    }

    const projectId = getProjectId();
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = tokenResult.data;
    if (!expoPushToken) throw new Error('Expo did not return a push token.');

    await deviceApi.register({
      expo_push_token: expoPushToken,
      platform: Platform.OS,
      device_name: Device.deviceName || null,
      app_version: Constants.expoConfig?.version || Constants.nativeAppVersion || null,
    });
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, expoPushToken);
    const diagnostic = await saveRegistrationStatus('registered', 'This device is registered for SmartHire updates.');
    return { registered: true, token: expoPushToken, status: diagnostic.status, detail: diagnostic.detail };
  } catch (error) {
    const detail = error?.response?.data?.error || error?.message || 'Could not register this device for notifications.';
    await saveRegistrationStatus('registration-failed', detail);
    throw error;
  }
}

export async function unregisterForPushNotificationsAsync() {
  if (DEMO_MODE) return { unregistered: false, status: 'demo-disabled', detail: 'No device registration exists in local demo mode.' };
  try {
    const expoPushToken = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (expoPushToken) await deviceApi.unregister(expoPushToken);
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    const diagnostic = await saveRegistrationStatus('not-registered', 'This device is not registered for SmartHire updates.');
    return { unregistered: true, status: diagnostic.status, detail: diagnostic.detail };
  } catch (error) {
    const detail = error?.response?.data?.error || error?.message || 'Could not remove this device registration.';
    await saveRegistrationStatus('unregister-failed', detail);
    throw error;
  }
}

let lastHandledResponseId = null;

async function handleNotificationResponse(response) {
  const request = response?.notification?.request;
  const data = request?.content?.data || {};
  const responseId = data.notificationId || request?.identifier || null;
  if (responseId && responseId === lastHandledResponseId) return;
  lastHandledResponseId = responseId;

  // A push carries the persisted notification UUID. Mark it read while the
  // native route transition is beginning; failure to update read state must
  // never prevent a user from reaching the linked screen.
  if (data.notificationId) notificationsApi.markRead(data.notificationId).catch(() => {});
  navigateFromNotification(data);
}

/**
 * Handles both a foreground tap and an app launched from a notification.
 * RootNavigator calls this after authentication and role navigation are available.
 */
export function registerPushNavigationHandler() {
  // Do not inspect or navigate from notification responses in local demo mode.
  if (DEMO_MODE) return () => {};
  Notifications.getLastNotificationResponseAsync()
    .then((response) => { if (response) handleNotificationResponse(response); })
    .catch(() => {});
  const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
  return () => subscription.remove();
}
