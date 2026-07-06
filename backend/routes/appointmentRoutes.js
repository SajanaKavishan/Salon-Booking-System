const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getStaffAvailability,
  getMyAppointments,
  getAllAppointments,
  getPendingAppointmentsCount,
  getStaffAppointments,
  getStaffEarningsSummary,
  submitAppointmentReview,
  getPublicReviews,
  getAppointmentsReviews,
  toggleReviewApproval,
  deleteAppointmentReview,
  deleteAppointment,
  updateAppointmentStatus,
  updateAppointmentStatusByStaff,
  markAppointmentRunningLate,
  shiftUpcomingAppointments,
  hideAppointmentByCustomer
} = require('../controllers/appointmentController');
const { protect, admin, staffOrAdmin } = require('../middleware/authMiddleware'); // Import the protect and admin middleware to secure the routes and restrict access to admin-only routes    
const validateObjectId = require('../middleware/validateObjectId');
const Appointment = require('../models/appointmentModel'); // Import the Appointment model to interact with the appointments collection in the database

// Routes for appointments. Both routes are protected, meaning that only authenticated users can access them. The createAppointment route allows users to create a new appointment, while the getMyAppointments route allows users to retrieve their own appointments.
router.route('/').post(protect, createAppointment).get(protect, getMyAppointments);
router.get('/all', protect, admin, getAllAppointments);
router.get('/pending/count', protect, staffOrAdmin, getPendingAppointmentsCount);
router.get('/staff/earnings-summary', protect, staffOrAdmin, getStaffEarningsSummary);
router.get('/staff', protect, getStaffAppointments);
router.get('/staff-schedule', protect, getStaffAppointments);
router.get('/availability', getStaffAvailability);
router.post('/shift-slots', protect, admin, shiftUpcomingAppointments);
router.get('/reviews/public', getPublicReviews);
router.get('/reviews/all', protect, admin, getAppointmentsReviews);

// Utility functions to convert time formats for easier calculations when checking for blocked time slots
const timeToMins = (timeStr) => {
  if (!timeStr) return 0;

  if (timeStr instanceof Date) {
    return timeStr.getHours() * 60 + timeStr.getMinutes();
  }

  if (typeof timeStr !== 'string') return 0;

  const parts = timeStr.trim().split(/\s+/);
  if (parts.length === 1) {
    const [hours, minutes] = parts[0].split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
    return hours * 60 + minutes;
  }

  const [time, modifier] = parts;
  const timeParts = time.split(':');
  if (timeParts.length < 2) return 0;

  let [hours, minutes] = timeParts.map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;

  if (hours === 12) hours = 0;
  if (modifier === 'PM') hours += 12;
  return hours * 60 + minutes;
};

const minsToTime = (mins) => {
    let hours = Math.floor(mins / 60);
    let minutes = mins % 60;
    const modifier = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours < 10 ? '0' : ''}${hours}:${minutes === 0 ? '00' : minutes} ${modifier}`;
};

// Route to get booked times for a specific date and stylist. This endpoint is public (no auth required) so the frontend can check available times. It accepts query parameters for the date and stylist ID, and returns a list of time slots that are already booked. This allows the frontend to display which time slots are available for booking.
router.get('/booked-times', async (req, res) => {
  try {
    const date = req.query.bookingDate || req.query.date;
    const stylistId = req.query.staffId || req.query.stylistId;

    if (!date || !stylistId) {
      return res.status(400).json({ message: 'Date and stylist ID are required' });
    }

    const bookingDate = new Date(`${String(date).slice(0, 10)}T00:00:00.000Z`);
    const appointments = await Appointment.find({
      $or: [
        { date: String(date).slice(0, 10), stylist: stylistId },
        { bookingDate, staffId: stylistId },
      ],
      status: { $nin: ['cancelled', 'rejected', 'Rejected', 'Cancelled'] }
    });

    let blockedSlots = [];

    // Loop through each appointment and calculate the blocked time slots based on the start and end times. The timeToMins function converts the time string to minutes for easier calculations, and the minsToTime function converts the minutes back to a time string format. The loop iterates through each appointment's time range in 30-minute increments and adds the corresponding time slots to the blockedSlots array, which is then returned as a JSON response to the client.
    appointments.forEach(app => {
        let start = timeToMins(app.startTime);
        let end = timeToMins(app.endTime);
        
        for (let t = start; t < end; t += 30) {
            blockedSlots.push(minsToTime(t));
        }
    });

    // Return the list of blocked time slots
    res.json(blockedSlots);
  } catch (error) {
    console.error('Error fetching booked times:', error);
    res.status(500).json({ message: 'Error fetching booked times' });
  }
});

// Routes with ID parameters - defined after specific routes to avoid conflicts
router.route('/:id').delete(validateObjectId(), protect, deleteAppointment);
router.post('/:id/review', validateObjectId(), protect, submitAppointmentReview);
router.delete('/:id/review', validateObjectId(), protect, admin, deleteAppointmentReview);
router.put('/:id/review-approve', validateObjectId(), protect, admin, toggleReviewApproval);
router.route('/:id/running-late').post(validateObjectId(), protect, markAppointmentRunningLate);
router.route('/:id/status').put(validateObjectId(), protect, staffOrAdmin, updateAppointmentStatus); // Admin and staff route to update the status of an appointment.
router.route('/:id/staff-status').put(validateObjectId(), protect, staffOrAdmin, updateAppointmentStatusByStaff);
router.route('/:id/hide').put(validateObjectId(), protect, hideAppointmentByCustomer);

module.exports = router;
