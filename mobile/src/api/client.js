import axios from 'axios';
import { DEMO_MODE } from '../config/runtime';

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const API_CONFIGURATION_ERROR = 'SmartHire API is not configured. Set EXPO_PUBLIC_API_URL in mobile/.env, then restart Metro.';
const DEMO_NETWORK_ERROR = 'Network requests are disabled in local demo mode. Use the local sample API only.';

if (!configuredBaseUrl && !DEMO_MODE) {
  console.warn(API_CONFIGURATION_ERROR);
}

const api = axios.create({
  baseURL: configuredBaseUrl,
  timeout: 120000,
  headers: { Accept: 'application/json' },
});

let getToken = async () => null;
let onUnauthorized = null;

export function configureApiSession({ tokenGetter, unauthorizedHandler }) {
  getToken = tokenGetter || getToken;
  onUnauthorized = unauthorizedHandler || onUnauthorized;
}

api.interceptors.request.use(async (config) => {
  // Demo mode is strict: even an accidental direct axios call must not reach a
  // configured backend. All supported demo flows route through mockApi instead.
  if (DEMO_MODE) throw new Error(DEMO_NETWORK_ERROR);
  // Do not silently fall back to localhost: on a physical device that points
  // at the phone itself and can hide a missing/stale environment setting.
  if (!configuredBaseUrl) throw new Error(API_CONFIGURATION_ERROR);
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && onUnauthorized) {
      await onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const errors = error?.response?.data?.errors;
  if (Array.isArray(errors) && errors[0]?.msg) return errors[0].msg;
  return error?.response?.data?.error || error?.message || fallback;
}

export default api;
