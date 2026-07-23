import axios from 'axios';
import { safeGetStorageItem } from './storage';

const PRODUCTION_API_CONFIG_ERROR = 'CRITICAL BUILD ERROR: VITE_API_BASE_URL is missing in production environment!';
const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '');

if (import.meta.env.PROD && !configuredApiBaseUrl) {
  console.error(PRODUCTION_API_CONFIG_ERROR);
  throw new Error(PRODUCTION_API_CONFIG_ERROR);
}

const legacyDevelopmentApiBaseUrl = import.meta.env.DEV
  ? String(import.meta.env.VITE_BACKEND_URL ?? '').trim().replace(/\/+$/, '')
  : '';
const developmentFallbackApiBaseUrl = import.meta.env.DEV ? 'http://localhost:5000' : '';
const normalizedApiBaseUrl = configuredApiBaseUrl
  || legacyDevelopmentApiBaseUrl
  || developmentFallbackApiBaseUrl;
const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS);

export const API_REQUEST_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout > 0
  ? configuredTimeout
  : 15_000;

export const normalizeApiError = (error) => {
  const responseData = error?.response?.data;
  const responseMessage = typeof responseData === 'string'
    ? responseData
    : responseData?.message || responseData?.error;

  return {
    status: error?.response?.status ?? null,
    code: error?.code || 'API_REQUEST_FAILED',
    message: responseMessage || error?.message || 'Something went wrong. Please try again.',
    data: responseData ?? null,
    isCanceled: error?.code === 'ERR_CANCELED' || axios.isCancel(error),
  };
};

export const apiClient = axios.create({
  baseURL: normalizedApiBaseUrl,
  timeout: API_REQUEST_TIMEOUT_MS,
});

// Preserve Axios cancellation checks while consumers migrate from the package singleton.
apiClient.isCancel = axios.isCancel;

apiClient.interceptors.request.use((config) => {
  const token = safeGetStorageItem('token');
  const requestUrl = String(config.url || '');
  const isRelativeApiUrl = !/^https?:\/\//i.test(requestUrl);
  let isConfiguredApiUrl = false;

  if (!isRelativeApiUrl && normalizedApiBaseUrl) {
    try {
      isConfiguredApiUrl = new URL(requestUrl).origin === new URL(normalizedApiBaseUrl).origin;
    } catch {
      isConfiguredApiUrl = false;
    }
  }

  if (token && (isRelativeApiUrl || isConfiguredApiUrl)) {
    if (typeof config.headers?.set === 'function') {
      if (!config.headers.has('Authorization')) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    } else {
      config.headers = {
        ...config.headers,
        ...(!config.headers?.Authorization ? { Authorization: `Bearer ${token}` } : {}),
      };
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    error.normalized = normalizeApiError(error);
    return Promise.reject(error);
  }
);

export const apiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedApiBaseUrl}${normalizedPath}`;
};

export const API_BASE_URL = normalizedApiBaseUrl;

export default normalizedApiBaseUrl;
