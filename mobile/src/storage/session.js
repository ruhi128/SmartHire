import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'smarthire.session.v1';

export async function getStoredSession() {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
}

export async function saveStoredSession(session) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearStoredSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
