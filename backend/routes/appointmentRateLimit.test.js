const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.CLOUDINARY_URL ||= 'cloudinary://test-key:test-secret@test-cloud';

const appointmentRoutes = require('./appointmentRoutes');

const startTestServer = async (role) => {
  const app = express();
  const limiter = appointmentRoutes._test.createAppointmentCreationRateLimiter();

  app.post('/appointments', (request, _response, next) => {
    request.user = { _id: `${role}-user`, role };
    next();
  }, limiter, (_request, response) => {
    response.status(201).json({ success: true });
  });

  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const address = server.address();

  return {
    url: `http://127.0.0.1:${address.port}/appointments`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
};

test('appointment creation limiter returns standardized HTTP 429 after ten customer requests', async () => {
  const server = await startTestServer('customer');

  try {
    for (let requestNumber = 1; requestNumber <= 10; requestNumber += 1) {
      const response = await fetch(server.url, { method: 'POST' });
      assert.equal(response.status, 201);
    }

    const blockedResponse = await fetch(server.url, { method: 'POST' });
    const payload = await blockedResponse.json();

    assert.equal(blockedResponse.status, 429);
    assert.deepEqual(payload, {
      success: false,
      message: 'Too many booking requests. Please try again within the next hour.',
    });
  } finally {
    await server.close();
  }
});

test('appointment creation limiter skips administrators', async () => {
  const server = await startTestServer('admin');

  try {
    for (let requestNumber = 1; requestNumber <= 12; requestNumber += 1) {
      const response = await fetch(server.url, { method: 'POST' });
      assert.equal(response.status, 201);
    }
  } finally {
    await server.close();
  }
});
