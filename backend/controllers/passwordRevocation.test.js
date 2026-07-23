const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET ||= 'password-reset-test-secret';
process.env.CLOUDINARY_URL ||= 'cloudinary://test-key:test-secret@test-cloud';

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { forgotPassword, login, resetPassword } = require('./authController');
const { registerUser, updateUserProfile } = require('./userController');

const createResponse = () => ({
  statusCode: 200,
  body: null,
  headersSent: false,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    this.headersSent = true;
    return this;
  },
});

test('password login explicitly selects the password hash', async (t) => {
  const originalFindOne = User.findOne;
  const originalCompare = bcrypt.compare;
  let selectedFields = '';
  const user = {
    _id: '64b64c3f2f5f5b1c8c123459',
    role: 'customer',
    name: 'Login Test User',
    email: 'login@example.com',
    password: 'stored-hash',
    isActive: true,
    isFirstLogin: false,
  };

  User.findOne = () => ({
    select: async (fields) => {
      selectedFields = fields;
      return user;
    },
  });
  bcrypt.compare = async () => true;

  t.after(() => {
    User.findOne = originalFindOne;
    bcrypt.compare = originalCompare;
  });

  const res = createResponse();
  await login({ body: { email: user.email, password: 'password123' } }, res);

  assert.equal(selectedFields, '+password');
  assert.equal(res.statusCode, 200);
  assert.equal(typeof res.body.token, 'string');
});

test('password recovery returns the same success response for unknown and cooldown accounts', async (t) => {
  const originalFindOne = User.findOne;
  const genericResponse = {
    success: true,
    message: 'If an account exists with that email, a password reset link has been sent.',
  };

  User.findOne = async ({ email }) => {
    if (email === 'cooldown@example.com') {
      return {
        _id: '64b64c3f2f5f5b1c8c123458',
        resetPasswordExpire: new Date(Date.now() + 10 * 60 * 1000),
      };
    }

    return null;
  };

  t.after(() => {
    User.findOne = originalFindOne;
  });

  const unknownAccountResponse = createResponse();
  await forgotPassword(
    { body: { email: 'unknown@example.com' }, headers: {} },
    unknownAccountResponse
  );

  const cooldownAccountResponse = createResponse();
  await forgotPassword(
    { body: { email: 'cooldown@example.com' }, headers: {} },
    cooldownAccountResponse
  );

  assert.equal(unknownAccountResponse.statusCode, 200);
  assert.equal(cooldownAccountResponse.statusCode, 200);
  assert.deepEqual(unknownAccountResponse.body, genericResponse);
  assert.deepEqual(cooldownAccountResponse.body, genericResponse);
});

test('password reset records passwordChangedAt before saving', async (t) => {
  const originalFindOne = User.findOne;
  const originalGenSalt = bcrypt.genSalt;
  const originalHash = bcrypt.hash;
  const user = {
    _id: '64b64c3f2f5f5b1c8c123456',
    role: 'customer',
    password: 'old-hash',
    resetPasswordToken: 'stored-token',
    resetPasswordExpire: new Date(Date.now() + 60_000),
    saveCalled: false,
    async save() { this.saveCalled = true; },
  };

  User.findOne = async (query) => {
    assert.equal(
      query.resetPasswordToken,
      crypto.createHash('sha256').update('reset-token').digest('hex')
    );
    return user;
  };
  bcrypt.genSalt = async () => 'salt';
  bcrypt.hash = async () => 'new-hash';

  t.after(() => {
    User.findOne = originalFindOne;
    bcrypt.genSalt = originalGenSalt;
    bcrypt.hash = originalHash;
  });

  const res = createResponse();
  const beforeReset = Date.now();
  await resetPassword(
    { params: { token: 'reset-token' }, body: { password: 'new-password' } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(user.password, 'new-hash');
  assert.ok(user.passwordChangedAt instanceof Date);
  assert.ok(user.passwordChangedAt.getTime() >= beforeReset);
  assert.equal(user.saveCalled, true);
  assert.equal(res.body.message, 'Password updated successfully');
  assert.equal(typeof res.body.token, 'string');
  assert.equal(res.body.token.split('.').length, 3);
  const decodedToken = jwt.verify(res.body.token, process.env.JWT_SECRET);
  assert.equal(decodedToken.id, user._id);
  assert.equal(decodedToken.role, user.role);
  assert.equal(decodedToken.passwordChangedAt, user.passwordChangedAt.toISOString());
});

test('authenticated password change returns a fresh token with the updated timestamp', async (t) => {
  const originalFindById = User.findById;
  const originalCompare = bcrypt.compare;
  const originalGenSalt = bcrypt.genSalt;
  const originalHash = bcrypt.hash;
  const user = {
    _id: '64b64c3f2f5f5b1c8c123457',
    role: 'customer',
    name: 'Password Test User',
    email: 'password@example.com',
    phone: '0771234567',
    password: 'old-hash',
    preferredStylist: null,
    profileImage: '',
    profileImagePublicId: '',
    async save() { return this; },
  };

  User.findById = () => ({
    select: async () => user,
  });
  bcrypt.compare = async () => true;
  bcrypt.genSalt = async () => 'salt';
  bcrypt.hash = async () => 'new-hash';

  t.after(() => {
    User.findById = originalFindById;
    bcrypt.compare = originalCompare;
    bcrypt.genSalt = originalGenSalt;
    bcrypt.hash = originalHash;
  });

  const res = createResponse();
  await updateUserProfile({
    user: { _id: user._id },
    body: {
      currentPassword: 'current-password',
      newPassword: 'new-password',
    },
    headers: { authorization: 'Bearer stale-token' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, 'Password updated successfully');
  assert.notEqual(res.body.token, 'stale-token');
  assert.equal(res.body.user.email, user.email);
  assert.equal(res.body.user.role, user.role);
  const decodedToken = jwt.verify(res.body.token, process.env.JWT_SECRET);
  assert.equal(decodedToken.id, user._id);
  assert.equal(decodedToken.passwordChangedAt, user.passwordChangedAt.toISOString());
});

test('registration rejects passwords shorter than eight characters', async () => {
  const res = createResponse();

  await registerUser({
    body: {
      name: 'Short Password User',
      email: 'short-password@example.com',
      phone: '0771234567',
      password: 'seven77',
    },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Password must be at least 8 characters long.');
});
