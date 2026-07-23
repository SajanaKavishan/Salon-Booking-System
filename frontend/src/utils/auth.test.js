import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  window.localStorage.clear();
});

describe('authorization response handling', () => {
  it('propagates HTTP 403 without clearing the authenticated session', async () => {
    window.localStorage.setItem('token', 'stored-token');
    window.localStorage.setItem('userRole', 'customer');
    window.localStorage.setItem('userName', 'Test User');
    window.localStorage.setItem('user', JSON.stringify({
      _id: '64b64c3f2f5f5b1c8c123452',
      name: 'Test User',
    }));

    const { apiClient } = await import('./apiConfig');
    const { installUnauthorizedInterceptor } = await import('./auth');
    const forbiddenError = {
      response: {
        status: 403,
        data: { message: 'Forbidden' },
      },
    };

    installUnauthorizedInterceptor();

    await expect(apiClient.get('/api/appointments/private', {
      adapter: async () => Promise.reject(forbiddenError),
    })).rejects.toBe(forbiddenError);

    expect(window.localStorage.getItem('token')).toBe('stored-token');
    expect(window.localStorage.getItem('userRole')).toBe('customer');
    expect(window.localStorage.getItem('user')).not.toBeNull();
  });
});
