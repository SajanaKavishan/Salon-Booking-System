const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getEffectiveAppointmentEndMinutes,
  getAvailabilityWindow,
  getStableSlotStart,
} = require('./slotGenerator');

test('keeps same-day starts stable on a 15-minute grid with a 30-minute lead', () => {
  const first = getStableSlotStart({
    availabilityStart: 9 * 60,
    isToday: true,
    currentMinutes: 10 * 60 + 1,
  });
  const second = getStableSlotStart({
    availabilityStart: 9 * 60,
    isToday: true,
    currentMinutes: 10 * 60 + 14,
  });

  assert.equal(first, 10 * 60 + 45);
  assert.equal(second, first);
});

test('allows only five minutes of lead-time grace during final validation', () => {
  const withinGrace = getStableSlotStart({
    availabilityStart: 9 * 60,
    isToday: true,
    currentMinutes: 10 * 60 + 20,
    leadTimeGraceMinutes: 5,
  });
  const afterGrace = getStableSlotStart({
    availabilityStart: 9 * 60,
    isToday: true,
    currentMinutes: 10 * 60 + 21,
    leadTimeGraceMinutes: 5,
  });

  assert.equal(withinGrace, 10 * 60 + 45);
  assert.equal(afterGrace, 11 * 60);
});

test('intersects stylist hours with salon hours and respects closed days', () => {
  assert.deepEqual(
    getAvailabilityWindow(
      { start: '08:00', end: '20:00' },
      { isOpen: true, start: '10:00', end: '18:00' }
    ),
    { start: 10 * 60, end: 18 * 60 }
  );
  assert.equal(
    getAvailabilityWindow(
      { start: '10:00', end: '18:00' },
      { isOpen: false, start: '09:00', end: '22:00' }
    ),
    null
  );
});

test('uses adjusted end time when an appointment is running late', () => {
  assert.equal(getEffectiveAppointmentEndMinutes({
    endTime: '11:00 AM',
    adjustedEndTime: '11:20 AM',
  }, 0), 11 * 60 + 20);

  assert.equal(getEffectiveAppointmentEndMinutes({
    endTime: '11:00 AM',
  }, 0), 11 * 60);
});
