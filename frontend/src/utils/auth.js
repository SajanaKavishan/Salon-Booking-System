import axios from 'axios';

let isHandlingUnauthorized = false;
let isInterceptorInstalled = false;

export function clearAuthStorage() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
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
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  const storedUser = localStorage.getItem('user');

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

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        redirectToLogin();
      }

      return Promise.reject(error);
    }
  );
}
