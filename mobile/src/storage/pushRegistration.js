import * as SecureStore from 'expo-secure-store';

const PUSH_REGISTRATION_KEY = 'smarthire.push-registration.v1';

export async function getStoredPushRegistration() {
  const raw = await SecureStore.getItemAsync(PUSH_REGISTRATION_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (typeof value?.userId !== 'string' || typeof value?.expoPushToken !== 'string') {
      throw new Error('Invalid device registration record');
    }
    return value;
  } catch {
    await SecureStore.deleteItemAsync(PUSH_REGISTRATION_KEY);
    return null;
  }
}

export async function savePushRegistration({ userId, expoPushToken }) {
  if (!userId || !expoPushToken) throw new Error('A user and Expo push token are required.');
  await SecureStore.setItemAsync(PUSH_REGISTRATION_KEY, JSON.stringify({ userId, expoPushToken }));
}

export async function clearStoredPushRegistration() {
  await SecureStore.deleteItemAsync(PUSH_REGISTRATION_KEY);
}
