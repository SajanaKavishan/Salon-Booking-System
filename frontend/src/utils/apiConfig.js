const configuredApiBaseUrl = [import.meta.env.VITE_API_BASE_URL, import.meta.env.VITE_BACKEND_URL]
  .map((value) => String(value ?? '').trim())
  .find(Boolean)
  ?.replace(/\/+$/, '');

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
