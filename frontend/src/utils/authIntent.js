const INTERNAL_BASE_URL = 'https://salon-dees.local';
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

export function sanitizeInternalPath(value) {
  if (typeof value !== 'string') return null;

  const candidate = value.trim();
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return null;
  }

  try {
    const parsedUrl = new URL(candidate, INTERNAL_BASE_URL);
    if (parsedUrl.origin !== INTERNAL_BASE_URL) return null;
    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return null;
  }
}

export function sanitizeServiceId(value) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  return OBJECT_ID_PATTERN.test(candidate) ? candidate : null;
}

export function buildAuthIntentPath(basePath, { nextPath, serviceId }) {
  const searchParams = new URLSearchParams();
  if (nextPath) searchParams.set('next', nextPath);
  if (serviceId) searchParams.set('serviceId', serviceId);
  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
