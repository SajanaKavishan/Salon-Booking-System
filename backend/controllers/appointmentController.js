const Appointment = require('../models/appointmentModel');

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Private
const createAppointment = async (req, res) => {
    const { service, date, time } = req.body;

    if (!service || !date || !time) {
        return res.status(400).json({ message: 'Please enter all details' });
    }

    const appointment = await Appointment.create({
        user: req.user.id, // Get the User ID from the token
        service,
        date,
        time
    });

    res.status(201).json(appointment);
};

// @desc    Get user appointments
// @route   GET /api/appointments
// @access  Private
const getMyAppointments = async (req, res) => {
    const appointments = await Appointment.find({ user: req.user.id });
    res.status(200).json(appointments);
};

// @desc    Get all appointments (Admin Only)
// @route   GET /api/appointments/all
// @access  Private/Admin
const getAllAppointments = async (req, res) => {
    const appointments = await Appointment.find({}).populate('user', 'name email'); 
    // This route is intended for admin users to view all appointments. It retrieves all appointments from the database and populates the user field with the user's name and email for better readability. The response is sent back as a JSON array of appointments.  
    res.status(200).json(appointments);
};

module.exports = {
    createAppointment,
    getMyAppointments,
    getAllAppointments
};