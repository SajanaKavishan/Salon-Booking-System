const test = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');

process.env.CLOUDINARY_URL ||= 'cloudinary://test-key:test-secret@test-cloud';

const {
  applyLeaveBulk,
  getDateKey,
  getWorkingDayBreakdown,
  normalizeLeaveRanges,
} = require('./rosterController');

const futureDate = (daysFromToday) => (
  DateTime.now().setZone('Asia/Colombo').startOf('day').plus({ days: daysFromToday }).toISODate()
);

test('continuous leave dates are normalized into one occurrence', () => {
  const ranges = normalizeLeaveRanges([
    { startDate: futureDate(3), endDate: futureDate(5) },
    { startDate: futureDate(1), endDate: futureDate(2) },
  ]);

  assert.equal(ranges.length, 1);
  assert.equal(getDateKey(ranges[0].startDate), futureDate(1));
  assert.equal(getDateKey(ranges[0].endDate), futureDate(5));
});

test('bulk leave rejects more than twelve submitted ranges', () => {
  const ranges = Array.from({ length: 13 }, (_, index) => ({
    startDate: futureDate((index * 2) + 1),
    endDate: futureDate((index * 2) + 1),
  }));

  assert.throws(
    () => normalizeLeaveRanges(ranges),
    /maximum of 12 leave ranges/i
  );
});

test('leave validation rejects an individual range longer than 366 days', () => {
  assert.throws(
    () => normalizeLeaveRanges([{
      startDate: futureDate(1),
      endDate: futureDate(367),
    }]),
    /individual leave range cannot exceed 366 days/i
  );
});

test('leave validation rejects more than 366 total submitted days', () => {
  assert.throws(
    () => normalizeLeaveRanges([
      { startDate: futureDate(1), endDate: futureDate(200) },
      { startDate: futureDate(202), endDate: futureDate(401) },
    ]),
    /total number of submitted leave days cannot exceed 366 days/i
  );
});

test('leave validation rejects dates beyond the two-year horizon and malformed years', () => {
  const moreThanTwoYearsFromToday = DateTime.now()
    .setZone('Asia/Colombo')
    .startOf('day')
    .plus({ years: 2, days: 1 })
    .toISODate();

  assert.throws(
    () => normalizeLeaveRanges([{
      startDate: moreThanTwoYearsFromToday,
      endDate: moreThanTwoYearsFromToday,
    }]),
    /cannot be more than 2 years in the future/i
  );
  assert.throws(
    () => normalizeLeaveRanges([{ startDate: '30-01-01', endDate: '30-01-02' }]),
    /YYYY-MM-DD format/i
  );
});

test('bulk leave rejects reasons longer than 500 characters before database work', async () => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  await applyLeaveBulk({
    user: { _id: '64b64c3f2f5f5b1c8c123450', role: 'staff' },
    body: {
      ranges: [{ startDate: futureDate(1), endDate: futureDate(1) }],
      type: 'Casual',
      reason: 'x'.repeat(501),
    },
  }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /cannot exceed 500 characters/i);
});

test('a five-day continuous working range deducts five leave days', () => {
  const result = getWorkingDayBreakdown({
    startDate: new Date(2030, 0, 7),
    endDate: new Date(2030, 0, 11),
    offDays: [],
    settings: { weekendBookings: false },
    holidayDateKeys: new Set(),
  });

  assert.equal(result.workingDays, 5);
  assert.deepEqual(result.workingDaysByYear, { 2030: 5 });
});

test('working-day calculation excludes rostered off days and holidays', () => {
  const result = getWorkingDayBreakdown({
    startDate: new Date(2030, 0, 7),
    endDate: new Date(2030, 0, 13),
    offDays: ['Friday'],
    settings: { weekendBookings: false },
    holidayDateKeys: new Set(['2030-01-09']),
  });

  assert.equal(result.workingDays, 3);
  assert.deepEqual(result.workingDaysByYear, { 2030: 3 });
});

test('calendar keys roll over at Colombo midnight instead of host midnight', () => {
  assert.equal(getDateKey(new Date('2030-01-06T18:29:59.000Z')), '2030-01-06');
  assert.equal(getDateKey(new Date('2030-01-06T18:30:00.000Z')), '2030-01-07');
});
