const test = require('node:test');
const assert = require('node:assert/strict');

process.env.CLOUDINARY_URL ||= 'cloudinary://test-key:test-secret@test-cloud';

const Staff = require('../models/Staff');
const User = require('../models/User');
const SalonSettings = require('../models/SalonSettings');
const { ensureSettingsDocument, defaultSettings } = require('./settingsController');
const { _test } = require('./appointmentController');

const {
  getStaffAssignmentIdsForUser,
  getStaffEarningsWindow,
} = _test;

test('staff assignments require an explicit userId link and never query by name', async (t) => {
  const originalFindOne = Staff.findOne;
  let receivedFilter;

  Staff.findOne = (filter) => {
    receivedFilter = filter;
    return {
      select: async () => null,
    };
  };

  t.after(() => {
    Staff.findOne = originalFindOne;
  });

  await assert.rejects(
    getStaffAssignmentIdsForUser({
      _id: '64b64c3f2f5f5b1c8c123450',
      name: 'Shared Name',
      role: 'staff',
    }),
    (error) => error.statusCode === 409 && error.message === 'Staff profile unlinked or not found'
  );

  assert.deepEqual(receivedFilter, { userId: '64b64c3f2f5f5b1c8c123450' });
  assert.equal(Object.hasOwn(receivedFilter, 'name'), false);
});

test('Staff schema requires userId and defines a unique partial userId index', () => {
  assert.equal(Staff.schema.path('userId').isRequired, true);

  const userIdIndex = Staff.schema.indexes().find(([fields]) => fields.userId === 1);
  assert.ok(userIdIndex);
  assert.equal(userIdIndex[1].unique, true);
  assert.deepEqual(userIdIndex[1].partialFilterExpression, {
    userId: { $type: 'objectId' },
  });
});

test('User schema excludes password hashes from queries by default', () => {
  assert.equal(User.schema.path('password').options.select, false);
});

test('settings initialization uses one atomic keyed upsert', async (t) => {
  const originalFindOneAndUpdate = SalonSettings.findOneAndUpdate;
  let receivedArguments;
  const settingsDocument = { ...defaultSettings };

  SalonSettings.findOneAndUpdate = async (...args) => {
    receivedArguments = args;
    return settingsDocument;
  };

  t.after(() => {
    SalonSettings.findOneAndUpdate = originalFindOneAndUpdate;
  });

  const result = await ensureSettingsDocument();

  assert.equal(result, settingsDocument);
  assert.deepEqual(receivedArguments[0], { key: 'global' });
  assert.deepEqual(receivedArguments[1], { $setOnInsert: defaultSettings });
  assert.equal(receivedArguments[2].upsert, true);
  assert.equal(receivedArguments[2].returnDocument, 'after');
});

test('staff earnings windows roll over at Colombo midnight', () => {
  const justAfterColomboMidnight = new Date('2026-01-01T18:31:00.000Z');
  const window = getStaffEarningsWindow(
    { range: 'LAST_7_DAYS' },
    justAfterColomboMidnight
  );

  assert.equal(window.year, 2026);
  assert.equal(window.startDateKey, '2025-12-27');
  assert.equal(window.endDateKey, '2026-01-02');
  assert.equal(window.startDate.toISOString(), '2025-12-26T18:30:00.000Z');
  assert.equal(window.endDate.toISOString(), '2026-01-02T18:29:59.999Z');
});
