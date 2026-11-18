// Expo replaces statically named EXPO_PUBLIC_* values when it builds the app.
// The address is public, but credentials must never be placed in this variable.
const suppliedApiUrl = String(process.env.EXPO_PUBLIC_API_URL || '').trim();
export const API_BASE_URL = suppliedApiUrl.replace(/\/+$/, '');

const isOrigin = /^https?:\/\/(?:[a-z\d.-]+|\[[a-f\d:]+\])(?::\d{1,5})?$/i.test(API_BASE_URL);
const isPlaceholder = /YOUR-|REPLACE_WITH|change-me|example/i.test(API_BASE_URL);
const demoMode = String(process.env.EXPO_PUBLIC_DEMO_MODE || '').toLowerCase() === 'true';

export const API_CONFIGURATION_ERROR = demoMode ? null : !API_BASE_URL
  ? 'This app build has no SmartHire API address. Set EXPO_PUBLIC_API_URL to a reachable API origin in mobile/.env or your EAS environment, then restart Metro or rebuild the app.'
  : (!isOrigin || isPlaceholder)
    ? 'This app build has an invalid SmartHire API address. EXPO_PUBLIC_API_URL must be your real http(s) API origin without /api, a path, credentials, or a placeholder. Fix it, then restart Metro or rebuild the app.'
    : null;

export function apiUrl(path) {
  if (!path) return '';
  const value = String(path);
  if (/^https?:\/\//i.test(value)) return value;
  if (!API_BASE_URL || API_CONFIGURATION_ERROR) return value;
  return `${API_BASE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
}

export function apiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const errors = error?.response?.data?.errors;
  if (Array.isArray(errors) && typeof errors[0]?.msg === 'string') return errors[0].msg;
  const responseError = error?.response?.data?.error;
  if (typeof responseError === 'string' && responseError.trim()) return responseError;

  if (API_CONFIGURATION_ERROR) return API_CONFIGURATION_ERROR;
  const healthUrl = `${API_BASE_URL}/health`;
  const localAddress = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|10\.0\.2\.2|0\.0\.0\.0)(?::|$)/i.test(API_BASE_URL);
  const help = localAddress
    ? 'That address is for a simulator or your own device; on a physical phone use your computer’s reachable LAN address or a deployed HTTPS API, then rebuild the app.'
    : 'Check the phone’s network, the server, and its HTTPS certificate. Preview/release APKs require HTTPS. If you changed the API address, rebuild the app.';
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return `SmartHire did not respond in time. Open ${healthUrl} in the phone’s browser. ${help}`;
  }
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return `Cannot reach the SmartHire API. Open ${healthUrl} in the phone’s browser. ${help}`;
  }
  if ([502, 503, 504].includes(error?.response?.status)) {
    return `The SmartHire API is unavailable (HTTP ${error.response.status}). Check ${healthUrl}, then try again.`;
  }
  return error?.message || fallback;
}
