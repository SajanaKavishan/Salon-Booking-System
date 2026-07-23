import { describe, expect, it } from 'vitest';
import { getDocumentTitle } from './utils/routeMeta';

describe('route document titles', () => {
  it('returns descriptive titles for public, customer, admin, and dynamic routes', () => {
    expect(getDocumentTitle('/')).toBe('Salon DEES');
    expect(getDocumentTitle('/book')).toBe('Book Appointment | Salon DEES');
    expect(getDocumentTitle('/admin/reviews')).toBe('Review Management | Salon DEES');
    expect(getDocumentTitle('/reset-password/token-value')).toBe('Reset Password | Salon DEES');
  });

  it('uses a not-found title for unknown routes', () => {
    expect(getDocumentTitle('/missing-page')).toBe('Page Not Found | Salon DEES');
  });
});
