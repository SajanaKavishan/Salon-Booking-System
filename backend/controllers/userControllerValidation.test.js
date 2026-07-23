const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET ||= 'user-controller-validation-test-secret';
process.env.CLOUDINARY_URL ||= 'cloudinary://test-key:test-secret@test-cloud';

const mongoose = require('mongoose');
const User = require('../models/User');
const Staff = require('../models/Staff');
const { registerUser, updateUserProfile } = require('./userController');

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

test('registration rejects malformed email addresses with HTTP 400', async () => {
  const response = createResponse();

  await registerUser({
    body: {
      name: 'Valid Name',
      email: 'not-an-email',
      phone: '0771234567',
      password: 'password123',
    },
  }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, 'Please enter a valid email address.');
});

test('registration rejects empty and overlong normalized names with HTTP 400', async () => {
  for (const name of ['   ', 'x'.repeat(101)]) {
    const response = createResponse();

    await registerUser({
      body: {
        name,
        email: 'valid@example.com',
        phone: '0771234567',
        password: 'password123',
      },
    }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.message, 'Name must be between 1 and 100 characters long.');
  }
});

test('staff profile document saves share one Mongoose transaction session', async (t) => {
  const originalFindById = User.findById;
  const originalStaffFindOne = Staff.findOne;
  const originalStartSession = mongoose.startSession;
  const transactionSession = {
    transactionStarted: false,
    ended: false,
    async withTransaction(callback) {
      this.transactionStarted = true;
      await callback();
    },
    async endSession() {
      this.ended = true;
    },
  };
  const saveSessions = [];
  const user = {
    _id: '64b64c3f2f5f5b1c8c123451',
    role: 'staff',
    name: 'Original Staff',
    email: 'staff@example.com',
    phone: '0771234567',
    password: 'stored-hash',
    preferredStylist: null,
    profileImage: '',
    profileImagePublicId: '',
    async save(options) {
      saveSessions.push(options?.session);
      return this;
    },
  };
  const staff = {
    name: 'Original Staff',
    imageUrl: '',
    imagePublicId: '',
    workingHours: {},
    offDays: [],
    async save(options) {
      saveSessions.push(options?.session);
      return this;
    },
  };

  User.findById = () => ({
    select: async () => user,
  });
  Staff.findOne = async () => staff;
  mongoose.startSession = async () => transactionSession;

  t.after(() => {
    User.findById = originalFindById;
    Staff.findOne = originalStaffFindOne;
    mongoose.startSession = originalStartSession;
  });

  const response = createResponse();
  await updateUserProfile({
    user: { _id: user._id },
    body: { name: 'Updated Staff' },
    headers: {},
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(transactionSession.transactionStarted, true);
  assert.equal(transactionSession.ended, true);
  assert.deepEqual(saveSessions, [transactionSession, transactionSession]);
  assert.equal(user.name, 'Updated Staff');
  assert.equal(staff.name, 'Updated Staff');
});
