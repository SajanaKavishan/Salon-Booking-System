const express = require('express');
const router = express.Router();
const { createAppointment, getMyAppointments, getAllAppointments, deleteAppointment, updateAppointmentStatus } = require('../controllers/appointmentController');
const { protect, admin } = require('../middleware/authMiddleware'); // Import the protect and admin middleware to secure the routes and restrict access to admin-only routes    
const Appointment = require('../models/appointmentModel'); // Import the Appointment model to interact with the appointments collection in the database

// Routes for appointments. Both routes are protected, meaning that only authenticated users can access them. The createAppointment route allows users to create a new appointment, while the getMyAppointments route allows users to retrieve their own appointments.
router.route('/').post(protect, createAppointment).get(protect, getMyAppointments);
router.get('/all', protect, admin, getAllAppointments);
router.route('/:id').delete(protect, deleteAppointment);
router.route('/:id/status').put(protect, admin, updateAppointmentStatus); // Admin-only route to update the status of an appointment. This route is protected and requires the user to have admin privileges to access it. The updateAppointmentStatus controller function will handle the logic for updating the appointment status in the database.

module.exports = router;