import { describe, expect, it } from 'vitest';
import {
  formatSalonDate,
  getSalonAppointmentTimestamp,
  getSalonDateKey,
  getSalonMinutes,
} from './salonTime';

describe('salonTime utilities', () => {
  it('rolls the date over at Colombo midnight', () => {
    const lateUtcDate = new Date('2026-07-22T20:00:00.000Z');

    expect(getSalonDateKey(lateUtcDate)).toBe('2026-07-23');
    expect(getSalonMinutes(lateUtcDate)).toBe(90);
  });

  it('converts Colombo appointment wall time into an absolute timestamp', () => {
    expect(getSalonAppointmentTimestamp('2026-07-22', '09:00 AM'))
      .toBe(Date.UTC(2026, 6, 22, 3, 30));
  });

  it('rejects malformed appointment dates and times', () => {
    expect(getSalonAppointmentTimestamp('22-07-2026', '09:00 AM')).toBeNull();
    expect(getSalonAppointmentTimestamp('2026-07-22', '25:00')).toBeNull();
  });

  it('formats stored date keys without host-timezone drift', () => {
    expect(formatSalonDate('2026-07-22')).toBe('Jul 22, 2026');
    expect(formatSalonDate('invalid', 'Unavailable')).toBe('Unavailable');
  });
});
