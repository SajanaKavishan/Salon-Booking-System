const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '');

const getFallbackApiBaseUrl = () => {
  if (configuredApiBaseUrl) return configuredApiBaseUrl;

  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return window.location.origin.replace(/\/+$/, '');
  }

  return '';
};

const normalizedApiBaseUrl = getFallbackApiBaseUrl();

export const apiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedApiBaseUrl}${normalizedPath}`;
};

export const API_BASE_URL = normalizedApiBaseUrl;

export default normalizedApiBaseUrl;
