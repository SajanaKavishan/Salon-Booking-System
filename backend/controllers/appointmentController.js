const Appointment = require('../models/appointmentModel');
const sendEmail = require('../utils/sendEmail'); // Import the sendEmail utility function to send email notifications to users about their appointment status updates

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Private
const createAppointment = async (req, res) => {
    try {
        const { stylist, date, time, service } = req.body;

        // Check if all required fields are provided
        if (!stylist || !date || !time || !service) {
            return res.status(400).json({ message: "Please fill in all required fields." });
        }

        // Add the user ID to the appointment data. The user ID is obtained from the protect middleware, which adds the logged-in user's information to the req.user object. This way, we can associate the appointment with the user who created it.
        // req.user._id means the ID of the currently logged-in user, which is added to the appointment data when creating a new appointment. This allows us to keep track of which user made which appointment in the database.
        const appointment = await Appointment.create({
            user: req.user._id, 
            service: service,
            date: date,
            time: time,
            stylist: stylist
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

// @desc    Delete an appointment
// @route   DELETE /api/appointments/:id
// @access  Private
const deleteAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found." });
        }

        // Check if the user is the owner of the appointment or an admin
        if (appointment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(401).json({ message: "You are not authorized to delete this appointment." });
        }

        await appointment.deleteOne();

        res.status(200).json({ 
            id: req.params.id, 
            message: "Appointment deleted successfully!" 
        });

    } catch (error) {
        console.error("Delete Appointment Error:", error);
        res.status(500).json({ message: "Server Error: Could not delete appointment." });
    }
};

// @desc    Update appointment status (Admin Only)
// @route   PUT /api/appointments/:id/status
// @access  Private/Admin
const updateAppointmentStatus = async (req, res) => {
    try {
        const { status } = req.body; 
        
        const appointment = await Appointment.findById(req.params.id).populate('user', 'name email'); // Populate user details for better readability

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found." });
        }

        appointment.status = status;
        const updatedAppointment = await appointment.save();

        // Part of the code to send an email notification to the user about the status update of their appointment. The email includes the appointment details and a message indicating the new status of the appointment. This enhances the user experience by keeping them informed about the status of their appointments in a timely manner.
        if (appointment.user && appointment.user.email) {
            const emailSubject = `Appointment ${status} - Salon Booking System`;
            
            // Crafting a visually appealing HTML email message to notify the user about the status update of their appointment. The email includes the appointment details such as service, date, and time, and uses color coding to indicate the status of the appointment (green for Approved, red for Rejected, etc.). This enhances the user experience by providing clear and concise information about their appointment status in a visually engaging format.
            const emailMessage = `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 500px; margin: 0 auto;">
                    <h2 style="color: ${status === 'Approved' ? 'green' : status === 'Rejected' ? 'red' : '#333'}; text-align: center;">
                        Appointment Status: ${status}
                    </h2>
                    <p>Welcome! <strong>${appointment.user.name}</strong>,</p>
                    <p>Your appointment status has been updated to: ${status}</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <tr>
                            <td style="padding: 8px; border: 1px solid #eee;"><strong>Service:</strong></td>
                            <td style="padding: 8px; border: 1px solid #eee;">${appointment.service}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #eee;"><strong>Date:</strong></td>
                            <td style="padding: 8px; border: 1px solid #eee;">${appointment.date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #eee;"><strong>Time:</strong></td>
                            <td style="padding: 8px; border: 1px solid #eee;">${appointment.time}</td>
                        </tr>
                    </table>
                    <p style="margin-top: 20px; font-size: 14px; color: #666; text-align: center;">
                        Thank you!<br/>Dee's Salon
                    </p>
                </div>
            `;

            // Send data to sendEmail utility function to send the email notification to the user about the status update of their appointment. The email includes the appointment details and a message indicating the new status of the appointment.
            await sendEmail({
                email: appointment.user.email,
                subject: emailSubject,
                message: emailMessage
            });
        }

        res.status(200).json({ 
            message: "Status updated successfully! ", 
            appointment: updatedAppointment 
        });

    } catch (error) {
        console.error("Update Status Error:", error);
        res.status(500).json({ message: "Server Error: Could not update appointment status." });
    }
};

module.exports = {
    createAppointment,
    getMyAppointments,
    getAllAppointments,
    deleteAppointment,
    updateAppointmentStatus
};