const test = require('node:test');
const assert = require('node:assert/strict');

process.env.CLOUDINARY_URL ||= 'cloudinary://test-key:test-secret@test-cloud';

const { _test } = require('./userController');

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

test('Google login rejects a missing ID token with HTTP 401', async () => {
  const handler = _test.createGoogleLoginHandler({
    verifyToken: async () => assert.fail('verification should not run'),
  });
  const res = createResponse();

  await handler({ body: {} }, res);

  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /ID token is required/i);
});

test('Google login rejects failed cryptographic verification with HTTP 401', async () => {
  const handler = _test.createGoogleLoginHandler({
    verifyToken: async () => { throw new Error('invalid signature'); },
  });
  const res = createResponse();

  await handler({ body: { idToken: 'forged-token' } }, res);

  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /authentication failed/i);
});

test('Google login requires email_verified to be strictly true', async () => {
  const handler = _test.createGoogleLoginHandler({
    verifyToken: async () => ({
      email: 'customer@example.com',
      email_verified: 'true',
      iss: 'accounts.google.com',
    }),
  });
  const res = createResponse();

  await handler({ body: { idToken: 'signed-token' } }, res);

  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /email is not verified/i);
});
