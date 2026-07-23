import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  window.localStorage.clear();
});

describe('apiConfig', () => {
  it('normalizes a configured API base URL and joins paths safely', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com///');
    const { API_BASE_URL, API_REQUEST_TIMEOUT_MS, apiClient, apiUrl } = await import('./apiConfig');

    expect(API_BASE_URL).toBe('https://api.example.com');
    expect(apiUrl('/api/services')).toBe('https://api.example.com/api/services');
    expect(apiUrl('api/staff')).toBe('https://api.example.com/api/staff');
    expect(apiClient.defaults.baseURL).toBe('https://api.example.com');
    expect(apiClient.defaults.timeout).toBe(API_REQUEST_TIMEOUT_MS);
  });

  it('normalizes API errors into one stable shape', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    const { normalizeApiError } = await import('./apiConfig');

    expect(normalizeApiError({
      code: 'ERR_BAD_REQUEST',
      response: { status: 422, data: { message: 'Invalid profile' } },
    })).toEqual({
      status: 422,
      code: 'ERR_BAD_REQUEST',
      message: 'Invalid profile',
      data: { message: 'Invalid profile' },
      isCanceled: false,
    });
  });

  it('injects the stored bearer token through the shared client', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    window.localStorage.setItem('token', 'stored-token');
    const { apiClient } = await import('./apiConfig');

    const response = await apiClient.get('/api/private', {
      adapter: async (config) => ({
        config,
        data: null,
        headers: {},
        status: 200,
        statusText: 'OK',
      }),
    });

    expect(response.config.headers.get('Authorization')).toBe('Bearer stored-token');
  });

  it('does not expose the bearer token to a different absolute origin', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    window.localStorage.setItem('token', 'stored-token');
    const { apiClient } = await import('./apiConfig');

    const response = await apiClient.get('https://api.example.com.attacker.test/collect', {
      adapter: async (config) => ({
        config,
        data: null,
        headers: {},
        status: 200,
        statusText: 'OK',
      }),
    });

    expect(response.config.headers.has('Authorization')).toBe(false);
  });

  it('uses the local backend fallback during development', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('VITE_BACKEND_URL', '');
    const { API_BASE_URL } = await import('./apiConfig');

    expect(API_BASE_URL).toBe('http://localhost:5000');
  });
});
