import axios from 'axios';
import { DEMO_MODE } from '../config/runtime';
import { API_BASE_URL, API_CONFIGURATION_ERROR } from './config';

export { API_BASE_URL, API_CONFIGURATION_ERROR, apiErrorMessage, apiUrl } from './config';

const DEMO_NETWORK_ERROR = 'Network requests are disabled in local demo mode. Use the local sample API only.';

if (API_CONFIGURATION_ERROR && !DEMO_MODE) console.warn(API_CONFIGURATION_ERROR);

// Dashboard/list/login requests must not leave the phone spinning for two
// minutes when an API is unreachable. Longer grading/uploads opt in per call.
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
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
  if (API_CONFIGURATION_ERROR) throw new Error(API_CONFIGURATION_ERROR);
  const token = await getToken();
  // Device registration/cleanup may be finishing while accounts switch. An
  // explicitly supplied session token must never be replaced with the next
  // account's token by the global interceptor.
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Device-token cleanup during an intentional logout must not recursively
    // invoke logout again when the server has already expired the session.
    if (error.response?.status === 401 && !error.config?.skipUnauthorizedLogout && onUnauthorized) {
      await onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default api;
