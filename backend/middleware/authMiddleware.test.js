const test = require('node:test');
const assert = require('node:assert/strict');

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, _test } = require('./authMiddleware');

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

test('detects JWTs issued before a password change', () => {
  const changedAt = new Date('2030-01-01T00:01:00.000Z');

  assert.equal(_test.wasTokenIssuedBeforePasswordChange({ iat: 1893455999 }, changedAt), true);
  assert.equal(_test.wasTokenIssuedBeforePasswordChange({ iat: 1893456060 }, changedAt), false);
  assert.equal(_test.wasTokenIssuedBeforePasswordChange({}, changedAt), true);
  assert.equal(_test.wasTokenIssuedBeforePasswordChange({ iat: 1 }, undefined), false);
});

test('protect rejects a revoked JWT with HTTP 401', async (t) => {
  const originalVerify = jwt.verify;
  const originalFindById = User.findById;

  jwt.verify = () => ({ id: '64b64c3f2f5f5b1c8c123456', iat: 100 });
  User.findById = () => ({
    select: async () => ({
      _id: '64b64c3f2f5f5b1c8c123456',
      role: 'customer',
      isActive: true,
      passwordChangedAt: new Date(101 * 1000),
    }),
  });

  t.after(() => {
    jwt.verify = originalVerify;
    User.findById = originalFindById;
  });

  const req = { headers: { authorization: 'Bearer header.payload.signature' } };
  const res = createResponse();
  let nextCalled = false;

  await protect(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /session expired.*password was changed/i);
  assert.equal(nextCalled, false);
});

test('protect accepts a JWT issued after the password change', async (t) => {
  const originalVerify = jwt.verify;
  const originalFindById = User.findById;

  jwt.verify = () => ({ id: '64b64c3f2f5f5b1c8c123456', iat: 102 });
  User.findById = () => ({
    select: async () => ({
      _id: '64b64c3f2f5f5b1c8c123456',
      role: 'customer',
      isActive: true,
      passwordChangedAt: new Date(101 * 1000),
    }),
  });

  t.after(() => {
    jwt.verify = originalVerify;
    User.findById = originalFindById;
  });

  const req = { headers: { authorization: 'Bearer header.payload.signature' } };
  const res = createResponse();
  let nextCalled = false;

  await protect(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});
