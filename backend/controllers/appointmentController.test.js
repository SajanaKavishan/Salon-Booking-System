const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.CLOUDINARY_URL ||= 'cloudinary://test-key:test-secret@test-cloud';
process.env.JWT_SECRET ||= 'appointment-route-integration-test-secret';

const Appointment = require('../models/appointmentModel');
const Holiday = require('../models/Holiday');
const LeaveRequest = require('../models/LeaveRequest');
const SalonSettings = require('../models/SalonSettings');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const User = require('../models/User');
const appointmentRoutes = require('../routes/appointmentRoutes');
const {
  getAllAppointments,
  getAppointmentsReviews,
  getStaffAppointments,
  hideAppointmentByCustomer,
} = require('./appointmentController');

const ADMIN_ID = '64b64c3f2f5f5b1c8c123451';
const CUSTOMER_ID = '64b64c3f2f5f5b1c8c123452';
const STAFF_ID = '64b64c3f2f5f5b1c8c123453';
const STAFF_USER_ID = '64b64c3f2f5f5b1c8c123454';
const SERVICE_ID = '64b64c3f2f5f5b1c8c123455';
const APPOINTMENT_ID = '64b64c3f2f5f5b1c8c123456';

const adminUser = {
  _id: ADMIN_ID,
  role: 'admin',
  name: 'Admin User',
  email: 'admin@example.com',
  isActive: true,
};

const customer = {
  _id: CUSTOMER_ID,
  role: 'customer',
  name: 'Test Customer',
  email: 'customer@example.com',
  phone: '0771234567',
};

const selectedService = {
  _id: SERVICE_ID,
  name: 'Hair Cut',
  duration: 60,
  price: 1500,
  isActive: true,
};

const selectedStaff = {
  _id: STAFF_ID,
  userId: STAFF_USER_ID,
  name: 'Test Stylist',
  workingHours: { start: '09:00', end: '17:00' },
  offDays: [],
  isActive: true,
};

const openingHours = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
].reduce((hours, day) => ({
  ...hours,
  [day]: { isOpen: true, start: '09:00', end: '17:00' },
}), {});

const defaultSettings = {
  salonName: 'Salon DEES',
  supportEmail: 'support@example.com',
  contactNumber: '0771234567',
  bookingAlerts: false,
  weekendBookings: true,
  defaultBufferTime: 15,
  openingHours,
};

const createQuery = (value, { onLimit, onSort } = {}) => {
  const query = {
    populate() {
      return query;
    },
    sort(criteria) {
      onSort?.(criteria);
      return query;
    },
    limit(valueToUse) {
      onLimit?.(valueToUse);
      return query;
    },
    select() {
      return query;
    },
    session() {
      return query;
    },
    lean() {
      return Promise.resolve(value);
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };

  return query;
};

const createControllerResponse = () => ({
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

const getFutureWeekday = () => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 30);

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date.toISOString().slice(0, 10);
};

const createBookingPayload = ({
  bookingDate = getFutureWeekday(),
  startTime = '09:00 AM',
  endTime = '10:00 AM',
  overrides = {},
} = {}) => ({
  staffId: STAFF_ID,
  stylist: STAFF_ID,
  customerId: CUSTOMER_ID,
  customerMobile: customer.phone,
  bookingDate,
  date: bookingDate,
  startTime,
  timeSlot: `${startTime} - ${endTime}`,
  services: [SERVICE_ID],
  ...overrides,
});

const installBookingStubs = (t, {
  exactOverlap = false,
  holiday = null,
  approvedLeave = false,
  settings = defaultSettings,
  staff = selectedStaff,
} = {}) => {
  const originals = [
    [Appointment, 'findOne'],
    [Appointment, 'find'],
    [Holiday, 'findOne'],
    [LeaveRequest, 'exists'],
    [SalonSettings, 'findOne'],
    [SalonSettings, 'findOneAndUpdate'],
    [Service, 'find'],
    [Staff, 'findOne'],
    [User, 'findById'],
    [User, 'findOne'],
  ].map(([target, key]) => [target, key, target[key]]);

  Appointment.findOne = () => createQuery(exactOverlap ? { _id: APPOINTMENT_ID } : null);
  Appointment.find = () => createQuery([]);
  Holiday.findOne = () => createQuery(holiday);
  LeaveRequest.exists = async () => (approvedLeave ? { _id: APPOINTMENT_ID } : null);
  SalonSettings.findOne = () => createQuery(settings);
  SalonSettings.findOneAndUpdate = async () => settings;
  Service.find = async () => [selectedService];
  Staff.findOne = () => createQuery(staff);
  User.findById = () => createQuery(adminUser);
  User.findOne = () => createQuery(customer);

  t.after(() => {
    originals.forEach(([target, key, original]) => {
      target[key] = original;
    });
  });
};

const postAppointment = async (body) => {
  const app = express();
  app.use(express.json());
  app.use('/api/appointments', appointmentRoutes);

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt.sign({ id: ADMIN_ID }, process.env.JWT_SECRET, { expiresIn: '5m' })}`,
      },
      body: JSON.stringify(body),
    });

    return {
      status: response.status,
      body: await response.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

const getPublicReviews = async () => {
  const app = express();
  app.use('/api/appointments', appointmentRoutes);

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const address = server.address();
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/appointments/reviews/public`
    );

    return {
      status: response.status,
      body: await response.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

test('GET /api/appointments/reviews/public returns only sanitized review DTO fields', async (t) => {
  const originalFind = Appointment.find;
  const reviewSubmittedAt = new Date('2026-07-20T09:30:00.000Z');
  let sortCriteria = null;

  Appointment.find = () => createQuery([{
    _id: APPOINTMENT_ID,
    rating: 5,
    feedback: 'Excellent service.',
    reviewSubmittedAt,
    customerMobile: '0771234567',
    adminOverrideReason: 'Internal scheduling note',
    createdAt: new Date('2026-07-20T09:00:00.000Z'),
    updatedAt: new Date('2026-07-20T09:30:00.000Z'),
    totalAmount: 1500,
    totalDuration: 60,
    user: { _id: CUSTOMER_ID, name: 'Test Customer' },
    stylist: { _id: STAFF_ID, name: 'Test Stylist' },
    services: [{ _id: SERVICE_ID, name: 'Hair Cut', price: 1500, duration: 60 }],
  }], {
    onSort(criteria) {
      sortCriteria = criteria;
    },
  });

  t.after(() => {
    Appointment.find = originalFind;
  });

  const response = await getPublicReviews();

  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);
  assert.deepEqual(Object.keys(response.body[0]).sort(), [
    'customerDisplayName',
    'feedback',
    'rating',
    'reviewSubmittedAt',
    'serviceNames',
    'stylistName',
  ]);
  assert.deepEqual(response.body[0], {
    rating: 5,
    feedback: 'Excellent service.',
    reviewSubmittedAt: reviewSubmittedAt.toISOString(),
    customerDisplayName: 'Test Customer',
    stylistName: 'Test Stylist',
    serviceNames: ['Hair Cut'],
  });
  assert.equal(response.body[0].customerMobile, undefined);
  assert.equal(response.body[0].adminOverrideReason, undefined);
  assert.equal(response.body[0]._id, undefined);
  assert.equal(response.body[0].user, undefined);
  assert.equal(response.body[0].stylist, undefined);
  assert.equal(response.body[0].services, undefined);
  assert.deepEqual(sortCriteria, { reviewSubmittedAt: -1, createdAt: -1 });
});

test('admin review listing sorts by newest review submission first', async (t) => {
  const originalFind = Appointment.find;
  let sortCriteria = null;

  Appointment.find = () => createQuery([], {
    onSort(criteria) {
      sortCriteria = criteria;
    },
  });

  t.after(() => {
    Appointment.find = originalFind;
  });

  const response = createControllerResponse();
  await getAppointmentsReviews({}, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(sortCriteria, { reviewSubmittedAt: -1, createdAt: -1 });
});

test('heavy appointment list endpoints cap requested query limits at 500', async (t) => {
  const originalFind = Appointment.find;
  const appliedLimits = [];

  Appointment.find = () => createQuery([], {
    onLimit(limit) {
      appliedLimits.push(limit);
    },
  });

  t.after(() => {
    Appointment.find = originalFind;
  });

  const allAppointmentsResponse = createControllerResponse();
  await getAllAppointments({
    query: { limit: '5000' },
  }, allAppointmentsResponse);

  const staffAppointmentsResponse = createControllerResponse();
  await getStaffAppointments({
    query: { limit: '900' },
    user: { _id: ADMIN_ID, role: 'admin' },
  }, staffAppointmentsResponse);

  assert.equal(allAppointmentsResponse.statusCode, 200);
  assert.equal(staffAppointmentsResponse.statusCode, 200);
  assert.deepEqual(appliedLimits, [500, 500]);
});

test('POST /api/appointments rejects exact overlaps with HTTP 409 even when every override is enabled', async (t) => {
  installBookingStubs(t, { exactOverlap: true });

  const response = await postAppointment(createBookingPayload({
    overrides: {
      ignoreLeadTimeBuffer: true,
      ignoreStaffLeave: true,
      ignoreWorkingHours: true,
      overrideReason: 'Emergency management approval',
    },
  }));

  assert.equal(response.status, 409);
  assert.match(response.body.message, /overlaps with an existing booking/i);
});

test('POST /api/appointments rejects a full-day holiday even when every override is enabled', async (t) => {
  installBookingStubs(t, {
    holiday: { name: 'Salon Holiday', isFullDay: true, isActive: true },
  });

  const response = await postAppointment(createBookingPayload({
    overrides: {
      ignoreLeadTimeBuffer: true,
      ignoreStaffLeave: true,
      ignoreWorkingHours: true,
      overrideReason: 'Emergency management approval',
    },
  }));

  assert.equal(response.status, 400);
  assert.match(response.body.message, /salon is closed/i);
});

test('POST /api/appointments rejects past timestamps even when every override is enabled', async (t) => {
  installBookingStubs(t);

  const response = await postAppointment(createBookingPayload({
    bookingDate: '2000-01-03',
    overrides: {
      ignoreLeadTimeBuffer: true,
      ignoreStaffLeave: true,
      ignoreWorkingHours: true,
      overrideReason: 'Emergency management approval',
    },
  }));

  assert.equal(response.status, 400);
  assert.match(response.body.message, /past dates or times/i);
});

test('POST /api/appointments does not let a working-hours override bypass approved staff leave', async (t) => {
  installBookingStubs(t, { approvedLeave: true });

  const response = await postAppointment(createBookingPayload({
    overrides: {
      ignoreWorkingHours: true,
      overrideReason: 'Outside-hours request approved',
    },
  }));

  assert.equal(response.status, 400);
  assert.match(response.body.message, /stylist is on approved leave/i);
});

test('POST /api/appointments does not let a staff-leave override bypass working hours', async (t) => {
  installBookingStubs(t);

  const response = await postAppointment(createBookingPayload({
    startTime: '07:00 AM',
    endTime: '08:00 AM',
    overrides: {
      ignoreStaffLeave: true,
      overrideReason: 'Leave exception approved',
    },
  }));

  assert.equal(response.status, 400);
  assert.match(response.body.message, /active scheduling rules/i);
});

test('POST /api/appointments requires one specific stylist', async (t) => {
  installBookingStubs(t);

  const missingStylistPayload = createBookingPayload();
  delete missingStylistPayload.staffId;
  delete missingStylistPayload.stylist;

  const missingStylistResponse = await postAppointment(missingStylistPayload);
  assert.equal(missingStylistResponse.status, 400);
  assert.equal(
    missingStylistResponse.body.message,
    'A specific stylist must be selected for every booking.'
  );

  const anyStylistResponse = await postAppointment(createBookingPayload({
    overrides: { staffId: 'any', stylist: 'any' },
  }));
  assert.equal(anyStylistResponse.status, 400);
  assert.equal(
    anyStylistResponse.body.message,
    'A specific stylist must be selected for every booking.'
  );
});

test('customer cannot hide a pending appointment', async (t) => {
  const originalFindById = Appointment.findById;
  let saveCalled = false;

  Appointment.findById = async () => ({
    _id: APPOINTMENT_ID,
    user: CUSTOMER_ID,
    status: 'pending',
    isHiddenByCustomer: false,
    async save() {
      saveCalled = true;
    },
  });

  t.after(() => {
    Appointment.findById = originalFindById;
  });

  const res = createControllerResponse();
  await hideAppointmentByCustomer({
    params: { id: APPOINTMENT_ID },
    user: { _id: CUSTOMER_ID, role: 'customer' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /only completed, cancelled/i);
  assert.equal(saveCalled, false);
});

test('authenticated customers receive HTTP 403 for staff-only appointment access', async () => {
  const res = createControllerResponse();

  await getStaffAppointments({
    user: { _id: CUSTOMER_ID, role: 'customer' },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Forbidden');
});

test('authenticated customers receive HTTP 403 for another customer appointment', async (t) => {
  const originalFindById = Appointment.findById;
  let saveCalled = false;

  Appointment.findById = async () => ({
    _id: APPOINTMENT_ID,
    user: '64b64c3f2f5f5b1c8c123499',
    status: 'completed',
    async save() {
      saveCalled = true;
    },
  });

  t.after(() => {
    Appointment.findById = originalFindById;
  });

  const res = createControllerResponse();
  await hideAppointmentByCustomer({
    params: { id: APPOINTMENT_ID },
    user: { _id: CUSTOMER_ID, role: 'customer' },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /not authorized/i);
  assert.equal(saveCalled, false);
});

test('customer can hide a no-show appointment', async (t) => {
  const originalFindById = Appointment.findById;
  const appointment = {
    _id: APPOINTMENT_ID,
    user: CUSTOMER_ID,
    status: 'No-Show',
    isHiddenByCustomer: false,
    async save() {},
  };

  Appointment.findById = async () => appointment;

  t.after(() => {
    Appointment.findById = originalFindById;
  });

  const res = createControllerResponse();
  await hideAppointmentByCustomer({
    params: { id: APPOINTMENT_ID },
    user: { _id: CUSTOMER_ID, role: 'customer' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(appointment.isHiddenByCustomer, true);
  assert.equal(res.body.isHiddenByCustomer, true);
});
