const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.CLOUDINARY_URL ||= 'cloudinary://test-key:test-secret@test-cloud';

const Appointment = require('../models/appointmentModel');
const Staff = require('../models/Staff');
const appointmentRoutes = require('../routes/appointmentRoutes');
const { addStaff } = require('../controllers/staffController');

const createResponse = () => ({
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
});

test('legacy staff creation rejects a missing linked user ID with HTTP 400', async (t) => {
  const originalCreate = Staff.create;
  let createCalled = false;
  Staff.create = async () => {
    createCalled = true;
  };

  t.after(() => {
    Staff.create = originalCreate;
  });

  const response = createResponse();
  await addStaff({
    body: {
      name: 'Legacy Staff',
      specialty: 'Stylist',
    },
  }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, 'A linked staff user ID is required.');
  assert.equal(createCalled, false);
});

test('legacy booked-times excludes every non-blocking terminal status', async (t) => {
  const originalFind = Appointment.find;
  let receivedQuery;

  Appointment.find = async (query) => {
    receivedQuery = query;
    return [];
  };

  const app = express();
  app.use('/api/appointments', appointmentRoutes);
  const server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer));
  });

  t.after(async () => {
    Appointment.find = originalFind;
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const { port } = server.address();
  const response = await fetch(
    `http://127.0.0.1:${port}/api/appointments/booked-times?date=2030-01-02&staffId=64b64c3f2f5f5b1c8c123470`
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
  assert.ok(receivedQuery);

  const excludedStatuses = new Set(receivedQuery.status.$nin);
  assert.equal(excludedStatuses.has('CANCELLED_BY_SALON'), true);
  assert.equal(excludedStatuses.has('completed'), true);
  assert.equal(excludedStatuses.has('no-show'), true);
});
