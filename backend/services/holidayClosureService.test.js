const test = require('node:test');
const assert = require('node:assert/strict');
const Appointment = require('../models/appointmentModel');
const { buildHolidayNotifications } = require('./holidayClosureService');

test('holiday closure creates staff-leave-style customer and staff notifications', () => {
  const notifications = buildHolidayNotifications([
    {
      _id: '64b64c3f2f5f5b1c8c123450',
      user: { _id: '64b64c3f2f5f5b1c8c123451' },
      services: [{ _id: '64b64c3f2f5f5b1c8c123452' }],
      staffId: {
        _id: '64b64c3f2f5f5b1c8c123453',
        userId: '64b64c3f2f5f5b1c8c123454',
      },
    },
  ], {
    date: '2030-01-10',
    name: 'Public Holiday',
  });

  assert.equal(notifications.length, 2);
  assert.equal(notifications[0].type, 'RESCHEDULE_REQUIRED');
  assert.equal(notifications[0].meta.actionUrl, '/book');
  assert.equal(notifications[0].meta.actionLabel, 'Book New Appointment');
  assert.equal(notifications[0].meta.holidayClosure, true);
  assert.equal(notifications[0].meta.emergencyReschedule, true);
  assert.equal(notifications[0].meta.rescheduleReason, 'SALON_CLOSURE');
  assert.match(notifications[0].message, /cancelled because the salon is closed/i);
  assert.deepEqual(notifications[0].meta.originalServices, ['64b64c3f2f5f5b1c8c123452']);
  assert.equal(notifications[1].type, 'INFO');
  assert.equal(notifications[1].meta.actionUrl, '/staff/appointments');
});

test('appointment schema preserves the explicit salon-cancellation status', () => {
  assert.equal(Appointment.normalizeStatus('CANCELLED_BY_SALON'), 'CANCELLED_BY_SALON');
  assert.ok(Appointment.schema.path('status').enumValues.includes('CANCELLED_BY_SALON'));
});
