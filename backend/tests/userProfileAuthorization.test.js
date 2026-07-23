const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

process.env.JWT_SECRET ||= 'user-profile-authorization-test-secret';
process.env.CLOUDINARY_URL ||= 'cloudinary://test-key:test-secret@test-cloud';

const User = require('../models/User');
const Staff = require('../models/Staff');
const userRoutes = require('../routes/userRoutes');

test('staff profile updates ignore specialty, working hours, and off-days', async (t) => {
  const originalFindById = User.findById;
  const originalFindStaff = Staff.findOne;
  const originalStartSession = mongoose.startSession;
  const userId = '64b64c3f2f5f5b1c8c123460';
  const originalSchedule = {
    specialty: 'Senior Colorist',
    workingHours: { start: '09:00', end: '17:00' },
    offDays: ['Sunday'],
  };
  const user = {
    _id: userId,
    role: 'staff',
    name: 'Original Staff Name',
    email: 'staff-profile@example.com',
    phone: '0771234567',
    password: 'stored-password-hash',
    preferredStylist: null,
    profileImage: '',
    profileImagePublicId: '',
    isActive: true,
    passwordChangedAt: undefined,
    async save() {
      return this;
    },
  };
  const staff = {
    _id: '64b64c3f2f5f5b1c8c123461',
    userId,
    name: user.name,
    imageUrl: '',
    imagePublicId: '',
    specialty: originalSchedule.specialty,
    workingHours: { ...originalSchedule.workingHours },
    offDays: [...originalSchedule.offDays],
    async save() {
      return this;
    },
  };

  User.findById = () => ({
    select: async () => user,
  });
  Staff.findOne = async (query) => {
    assert.deepEqual(query, { userId });
    return staff;
  };
  mongoose.startSession = async () => ({
    async withTransaction(callback) {
      await callback();
    },
    async endSession() {},
  });

  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  const server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer));
  });

  t.after(async () => {
    User.findById = originalFindById;
    Staff.findOne = originalFindStaff;
    mongoose.startSession = originalStartSession;
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const token = jwt.sign({ id: userId, role: 'staff' }, process.env.JWT_SECRET, {
    expiresIn: '5m',
  });
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/users/profile`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Updated Staff Name',
      phone: '0777654321',
      specialty: 'Unauthorized Specialty',
      workingHours: { start: '01:00', end: '02:00' },
      offDays: ['Monday', 'Tuesday'],
    }),
  });
  const responseBody = await response.json();

  assert.equal(response.status, 200);
  assert.equal(responseBody.message, 'Profile updated successfully');
  assert.equal(user.name, 'Updated Staff Name');
  assert.equal(user.phone, '0777654321');
  assert.equal(staff.name, 'Updated Staff Name');
  assert.equal(staff.specialty, originalSchedule.specialty);
  assert.deepEqual(staff.workingHours, originalSchedule.workingHours);
  assert.deepEqual(staff.offDays, originalSchedule.offDays);
});
