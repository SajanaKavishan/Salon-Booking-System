import { apiClient } from './apiConfig';
import { safeGetStorageItem, safeRemoveStorageItem } from './storage';

let isHandlingUnauthorized = false;
let isInterceptorInstalled = false;

export const AUTH_SESSION_CHANGED_EVENT = 'auth:session-changed';

export function getStoredAuthenticatedUserId() {
  const token = safeGetStorageItem('token');
  const storedUser = safeGetStorageItem('user');

  if (!token || !storedUser) return null;

  try {
    const user = JSON.parse(storedUser);
    const userId = user?._id || user?.id;
    return userId ? String(userId) : null;
  } catch {
    return null;
  }
}

export function notifyAuthSessionChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

export function clearAuthStorage() {
  safeRemoveStorageItem('token');
  safeRemoveStorageItem('user');
  safeRemoveStorageItem('userRole');
  safeRemoveStorageItem('userName');
  notifyAuthSessionChanged();
}

function decodeJwtPayload(token) {
  const payload = token?.split?.('.')[1];
  if (!payload) return null;

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '='
    );

    return JSON.parse(window.atob(paddedPayload));
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  if (!payload.exp) return false;

  return payload.exp * 1000 <= Date.now();
}

export function getStoredSession() {
  const token = safeGetStorageItem('token');
  const userRole = safeGetStorageItem('userRole');
  const storedUser = safeGetStorageItem('user');

  if (!token || !userRole || !storedUser || isTokenExpired(token)) {
    clearAuthStorage();
    return null;
  }

  try {
    const user = JSON.parse(storedUser);

    if (!user || typeof user !== 'object') {
      clearAuthStorage();
      return null;
    }

    return { token, userRole, user };
  } catch {
    clearAuthStorage();
    return null;
  }
}

export function buildCurrentPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function redirectToLogin({ preserveCurrentPath = true } = {}) {
  if (isHandlingUnauthorized) return;

  isHandlingUnauthorized = true;
  clearAuthStorage();

  if (window.location.pathname === '/login') {
    isHandlingUnauthorized = false;
    return;
  }

  const nextPath = preserveCurrentPath ? buildCurrentPath() : '';
  const loginPath = nextPath
    ? `/login?next=${encodeURIComponent(nextPath)}`
    : '/login';

  window.location.assign(loginPath);
}

export function installUnauthorizedInterceptor() {
  if (isInterceptorInstalled) return;
  isInterceptorInstalled = true;

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      // A 403 is an authorization failure for the current action, not an
      // invalid session. Let it reach the calling UI without evicting the user.
      if (error.response?.status === 401) {
        redirectToLogin();
      }

      return Promise.reject(error);
    }
  );
}
