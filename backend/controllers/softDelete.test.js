const test = require('node:test');
const assert = require('node:assert/strict');

process.env.CLOUDINARY_URL ||= 'cloudinary://test-key:test-secret@test-cloud';

const mongoose = require('mongoose');
const Appointment = require('../models/appointmentModel');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const User = require('../models/User');
const { deleteService } = require('./serviceController');
const { deleteStaff } = require('./staffController');

const VALID_ID = '64b64c3f2f5f5b1c8c123456';

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

test('service deletion is blocked when an active appointment references it', async (t) => {
  const originalFindById = Service.findById;
  const originalExists = Appointment.exists;
  let saved = false;

  Service.findById = async () => ({
    _id: VALID_ID,
    isActive: true,
    save: async () => { saved = true; },
  });
  Appointment.exists = async () => ({ _id: VALID_ID });

  t.after(() => {
    Service.findById = originalFindById;
    Appointment.exists = originalExists;
  });

  const res = createResponse();
  await deleteService({ params: { id: VALID_ID } }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /pending or confirmed appointments/i);
  assert.equal(saved, false);
});

test('service deletion deactivates the document when no active appointment exists', async (t) => {
  const originalFindById = Service.findById;
  const originalExists = Appointment.exists;
  const service = {
    _id: VALID_ID,
    isActive: true,
    save: async () => {},
  };

  Service.findById = async () => service;
  Appointment.exists = async () => null;

  t.after(() => {
    Service.findById = originalFindById;
    Appointment.exists = originalExists;
  });

  const res = createResponse();
  await deleteService({ params: { id: VALID_ID } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(service.isActive, false);
  assert.equal(res.body.message, 'Service deactivated');
});

test('staff deletion is blocked when an active appointment references the profile', async (t) => {
  const originalStartSession = mongoose.startSession;
  const originalFindById = Staff.findById;
  const originalExists = Appointment.exists;
  let transactionStarted = false;
  let sessionEnded = false;

  mongoose.startSession = async () => ({
    withTransaction: async () => { transactionStarted = true; },
    endSession: async () => { sessionEnded = true; },
  });
  Staff.findById = async () => ({ _id: VALID_ID, isActive: true, userId: null });
  Appointment.exists = async () => ({ _id: VALID_ID });

  t.after(() => {
    mongoose.startSession = originalStartSession;
    Staff.findById = originalFindById;
    Appointment.exists = originalExists;
  });

  const res = createResponse();
  await deleteStaff({ params: { id: VALID_ID } }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /pending or confirmed appointments/i);
  assert.equal(transactionStarted, false);
  assert.equal(sessionEnded, true);
});

test('staff deletion deactivates both profile and linked staff account', async (t) => {
  const originalStartSession = mongoose.startSession;
  const originalFindById = Staff.findById;
  const originalFindByIdAndUpdate = Staff.findByIdAndUpdate;
  const originalExists = Appointment.exists;
  const originalUpdateOne = User.updateOne;
  let staffUpdate = null;
  let userFilter = null;

  mongoose.startSession = async () => ({
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  });
  Staff.findById = async () => ({ _id: VALID_ID, isActive: true, userId: VALID_ID });
  Staff.findByIdAndUpdate = async (_id, update) => { staffUpdate = update; };
  Appointment.exists = async () => null;
  User.updateOne = async (filter) => {
    userFilter = filter;
    return { modifiedCount: 1 };
  };

  t.after(() => {
    mongoose.startSession = originalStartSession;
    Staff.findById = originalFindById;
    Staff.findByIdAndUpdate = originalFindByIdAndUpdate;
    Appointment.exists = originalExists;
    User.updateOne = originalUpdateOne;
  });

  const res = createResponse();
  await deleteStaff({ params: { id: VALID_ID } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(staffUpdate, { $set: { isActive: false } });
  assert.equal(userFilter.role, 'staff');
  assert.match(res.body.message, /linked user account deactivated/i);
});
