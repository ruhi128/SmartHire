import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { DEMO_MODE } from '../config/runtime';

export const SMART_HIRE_NOTIFICATION_CHANNEL = 'smarthire-updates';

// SDK 54 uses shouldShowBanner / shouldShowList. Set this once at module load
// so a received foreground notification is visible as an Android alert rather
// than only arriving in the listener callback.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (error) {
  // A dev environment without the native module must not stop the persisted
  // inbox from working. A clean development build fixes the native setup.
  console.warn('SmartHire notification handler is unavailable:', error?.message || 'unknown error');
}

function configuredProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId
    || Constants.easConfig?.projectId
    || null;
}

function isExpoGo() {
  return Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
}

/**
 * Explain why a remote token can/cannot be requested without treating the
 * in-app inbox as unavailable. Expo Go is deliberately excluded: Android
 * remote push requires the native module in an EAS/custom development build.
 */
export function getPushCapability() {
  if (DEMO_MODE) {
    return { available: false, status: 'unavailable', message: 'Device notifications are disabled in local demo mode.' };
  }
  if (Platform.OS === 'web') {
    return { available: false, status: 'unavailable', message: 'Device notifications are available in the Android app, not the web preview.' };
  }
  if (!['android', 'ios'].includes(Platform.OS)) {
    return { available: false, status: 'unavailable', message: 'This platform does not support SmartHire device notifications.' };
  }
  if (!Device.isDevice) {
    return { available: false, status: 'unavailable', message: 'Use a physical Android device to enable device notifications.' };
  }
  if (isExpoGo()) {
    return { available: false, status: 'unavailable', message: 'Install an EAS development or preview build. Expo Go cannot receive Android remote push notifications.' };
  }
  const projectId = configuredProjectId();
  if (!projectId) {
    return { available: false, status: 'not_configured', message: 'The Expo project ID is missing from the app configuration.' };
  }
  return { available: true, projectId };
}

export async function configureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(SMART_HIRE_NOTIFICATION_CHANNEL, {
    name: 'SmartHire updates',
    description: 'Job, application, assessment, and account updates from SmartHire.',
    importance: Notifications.AndroidImportance?.HIGH ?? 4,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4F46E5',
    sound: 'default',
    enableVibrate: true,
  });
}

function registrationMetadata() {
  return {
    platform: Platform.OS,
    deviceName: typeof Device.deviceName === 'string' ? Device.deviceName.slice(0, 160) : undefined,
    appVersion: Constants.expoConfig?.version || Constants.nativeAppVersion || undefined,
  };
}

/**
 * Create Android's channel before asking for permission or a token. Android 13
 * uses channel creation as part of the notification-permission sequence.
 */
export async function requestExpoPushRegistration() {
  const capability = getPushCapability();
  if (!capability.available) return capability;

  try {
    await configureAndroidNotificationChannel();

    let permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (permission.status !== 'granted') {
      return {
        available: true,
        status: 'permission_denied',
        permissionStatus: permission.status,
        message: 'Notification permission is off. Enable it in Android settings to receive device alerts.',
      };
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId: capability.projectId });
    const expoPushToken = tokenResponse?.data;
    if (typeof expoPushToken !== 'string' || !expoPushToken) {
      return {
        available: true,
        status: 'error',
        permissionStatus: permission.status,
        message: 'SmartHire could not obtain an Expo push token for this device.',
      };
    }

    return {
      available: true,
      status: 'token_ready',
      permissionStatus: permission.status,
      expoPushToken,
      ...registrationMetadata(),
    };
  } catch (error) {
    console.warn('SmartHire device-notification registration failed:', error?.message || 'unknown error');
    return {
      available: true,
      status: 'error',
      message: 'Could not register this device. Confirm Firebase setup and use an installed EAS development or preview build.',
    };
  }
}

/**
 * Keep only the small, trusted routing contract from a notification response.
 * The backend sends recipientUserId so the app can reject stale taps after an
 * account switch instead of marking/navigating as the wrong signed-in user.
 */
export function parseNotificationResponse(response) {
  const request = response?.notification?.request;
  const data = request?.content?.data || {};
  const notificationId = typeof data.notificationId === 'string' ? data.notificationId : '';
  const recipientUserId = typeof data.recipientUserId === 'string' ? data.recipientUserId : '';
  if (!notificationId || !recipientUserId) return null;

  return {
    responseKey: String(request?.identifier || `${recipientUserId}:${notificationId}`),
    notificationId,
    recipientUserId,
    link: typeof data.link === 'string' ? data.link : '',
    type: typeof data.type === 'string' ? data.type : 'system',
  };
}
