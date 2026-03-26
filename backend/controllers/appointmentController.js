const Appointment = require('../models/appointmentModel');

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Private
const createAppointment = async (req, res) => {
    try {
        const { date, time, service } = req.body;

        // Check if all required fields are provided
        if (!date || !time || !service) {
            return res.status(400).json({ message: "Please fill in all required fields." });
        }

        // Add the user ID to the appointment data. The user ID is obtained from the protect middleware, which adds the logged-in user's information to the req.user object. This way, we can associate the appointment with the user who created it.
        // req.user._id means the ID of the currently logged-in user, which is added to the appointment data when creating a new appointment. This allows us to keep track of which user made which appointment in the database.
        const appointment = await Appointment.create({
            user: req.user._id, 
            service: service,
            date: date,
            time: time
        });

        res.status(201).json({
            message: "Appointment created successfully!",
            appointment: appointment
        });

    } catch (error) {
        console.error("Appointment Controller Error:", error);
        res.status(500).json({ message: "Server Error: Appointment could not be created." });
    }
};

// @desc    Get user appointments
// @route   GET /api/appointments
// @access  Private
const getMyAppointments = async (req, res) => {
    try {
        // Using req.user._id to find appointments that belong to the currently logged-in user. This ensures that users can only see their own appointments when they access this route. The appointments are sorted by creation date in descending order, so the most recent appointments will appear first in the response.
        const appointments = await Appointment.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json(appointments);
    } catch (error) {
        console.error("Get My Appointments Error:", error);
        res.status(500).json({ message: "Server Error: Could not fetch appointments." });
    }
};

// @desc    Get all appointments (Admin Only)
// @route   GET /api/appointments/all
// @access  Private/Admin
const getAllAppointments = async (req, res) => {
    try {
        // Find all appointments and populate the user field with the user's name and email for better readability
        const appointments = await Appointment.find({}).populate('user', 'name email').sort({ createdAt: -1 }); 
        // This route is intended for admin users to view all appointments. It retrieves all appointments from the database and populates the user field with the user's name and email for better readability. The response is sent back as a JSON array of appointments.  
        res.status(200).json(appointments);
    } catch (error) {
        console.error("Get All Appointments Error:", error);
        res.status(500).json({ message: "Server Error: Could not fetch all appointments." });
    }
};

module.exports = {
    createAppointment,
    getMyAppointments,
    getAllAppointments
};