const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getSalonAppointmentDateTime,
  getSalonDateTime,
  getSalonDateTimeParts,
} = require('./salonTime');

test('reads evening time in Colombo independently of the server timezone', () => {
  const result = getSalonDateTimeParts(new Date('2026-07-20T15:30:00.000Z'));

  assert.deepEqual(result, {
    dateKey: '2026-07-20',
    hour: 21,
    minute: 0,
    minutes: 1260,
  });
});

test('moves to the next Colombo date after local midnight', () => {
  const result = getSalonDateTimeParts(new Date('2026-07-20T20:00:00.000Z'));

  assert.deepEqual(result, {
    dateKey: '2026-07-21',
    hour: 1,
    minute: 30,
    minutes: 90,
  });
});

test('creates appointment instants from Colombo wall time', () => {
  const appointment = getSalonAppointmentDateTime('2026-07-20', '04:00 PM');
  const now = getSalonDateTime(new Date('2026-07-20T08:30:00.000Z'));

  assert.equal(appointment.toUTC().toISO(), '2026-07-20T10:30:00.000Z');
  assert.equal(appointment.diff(now, 'hours').hours, 2);
});
