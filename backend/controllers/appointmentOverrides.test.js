const test = require('node:test');
const assert = require('node:assert/strict');

process.env.CLOUDINARY_URL ||= 'cloudinary://test-key:test-secret@test-cloud';

const { _test } = require('./appointmentController');
const {
  hasDownstreamScheduleConflict,
  rangesConflictWithBuffer,
  resolveAdminOverrides,
} = _test;

test('rejects schedule overrides from non-admin users', () => {
  assert.throws(
    () => resolveAdminOverrides({ ignoreLeadTimeBuffer: true }, 'customer'),
    (error) => error.statusCode === 403 && /only administrators/i.test(error.message)
  );
});

test('requires a meaningful reason for leave and working-hours overrides', () => {
  assert.throws(
    () => resolveAdminOverrides({ ignoreStaffLeave: true, overrideReason: 'no' }, 'admin'),
    (error) => error.statusCode === 400 && /at least 5 characters/i.test(error.message)
  );
  assert.throws(
    () => resolveAdminOverrides({ ignoreWorkingHours: true }, 'admin'),
    (error) => error.statusCode === 400 && /overridereason/i.test(error.message)
  );
});

test('allows a buffer-only override without a reason and trims audited reasons', () => {
  const bufferOverride = resolveAdminOverrides({ ignoreLeadTimeBuffer: true }, 'admin');
  assert.equal(bufferOverride.ignoreLeadTimeBuffer, true);
  assert.equal(bufferOverride.overrideReason, '');

  const leaveOverride = resolveAdminOverrides({
    ignoreStaffLeave: true,
    overrideReason: '  Emergency coverage  ',
  }, 'admin');
  assert.equal(leaveOverride.overrideReason, 'Emergency coverage');
});

test('rejects the retired blanket bypass flag', () => {
  assert.throws(
    () => resolveAdminOverrides({ bypassBuffer: true }, 'admin'),
    (error) => error.statusCode === 400 && /no longer supported/i.test(error.message)
  );
});

test('dynamic buffer detects adjacent gaps while zero buffer still detects exact overlaps', () => {
  const existing = { start: 10 * 60, end: 11 * 60 };

  assert.equal(
    rangesConflictWithBuffer({ start: 11 * 60 + 10, end: 12 * 60 }, existing, 15),
    true
  );
  assert.equal(
    rangesConflictWithBuffer({ start: 11 * 60 + 15, end: 12 * 60 }, existing, 15),
    false
  );
  assert.equal(
    rangesConflictWithBuffer({ start: 10 * 60 + 30, end: 11 * 60 + 30 }, existing, 0),
    true
  );
});

test('running-late checks reject downstream overlaps and buffer violations', () => {
  const downstreamAppointments = [
    { startMinutes: 11 * 60 + 15, startTime: '11:15 AM' },
  ];

  assert.equal(hasDownstreamScheduleConflict({
    downstreamAppointments,
    appointmentStartMinutes: 10 * 60,
    candidateAdjustedEndMinutes: 11 * 60,
    bufferMinutes: 15,
  }), false);

  assert.equal(hasDownstreamScheduleConflict({
    downstreamAppointments,
    appointmentStartMinutes: 10 * 60,
    candidateAdjustedEndMinutes: 11 * 60 + 1,
    bufferMinutes: 15,
  }), true);

  assert.equal(hasDownstreamScheduleConflict({
    downstreamAppointments: [{ timeSlot: '11:10 AM - 12:10 PM' }],
    appointmentStartMinutes: 10 * 60,
    candidateAdjustedEndMinutes: 11 * 60,
    bufferMinutes: 15,
  }), true);
});
