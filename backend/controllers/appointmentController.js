const Appointment = require('../models/appointmentModel');
const Service = require('../models/Service'); // Import the Service model to interact with the services collection in the database
const sendEmail = require('../utils/sendEmail'); // Import the sendEmail utility function to send email notifications to users about their appointment status updates

// Utility functions to convert time formats for easier calculations when checking for overlapping appointments. The timeToMinutes function converts a time string (e.g., "10:30 AM") into total minutes, while the minutesToTime function converts total minutes back into a time string format. These functions are essential for accurately determining if appointment times overlap when creating or updating appointments.
const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;

    if (timeStr instanceof Date) {
        return timeStr.getHours() * 60 + timeStr.getMinutes();
    }

    if (typeof timeStr !== 'string') return 0;

    const parts = timeStr.trim().split(' ');
    if (parts.length < 2) return 0;

    const [time, modifier] = parts;
    const timeParts = time.split(':');
    if (timeParts.length < 2) return 0;

    let [hours, minutes] = timeParts.map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;

    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours += 12;
    return hours * 60 + minutes;
};

const minutesToTime = (mins) => {
    let hours = Math.floor(mins / 60);
    let minutes = mins % 60;
    const modifier = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours < 10 ? '0' : ''}${hours}:${minutes === 0 ? '00' : minutes} ${modifier}`;
};

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Private
const createAppointment = async (req, res) => {
    try {
        const { stylist, date, startTime, services } = req.body;

        // Check if all required fields are provided
        if (!stylist || !date || !startTime || !services || services.length === 0) {
            return res.status(400).json({ message: "Please fill in all required fields." });
        }
        const selectedServices = await Service.find({ _id: { $in: services } });
        let totalDuration = 0;
        let totalAmount = 0;
        selectedServices.forEach(service => {
            totalDuration += service.duration;
            totalAmount += service.price;
        });
        const startMins = timeToMinutes(startTime);
        const endMins = startMins + totalDuration;
        const endTime = minutesToTime(endMins);

        const existingAppointments = await Appointment.find({ 
            date: date, 
            stylist: stylist,
            status: {$ne: 'Rejected'} // Only consider appointments that are not rejected when checking for overlaps
        });

        let hasOverlap = false;
        for (let appt of existingAppointments) {
            const existingStart = timeToMinutes(appt.startTime);
            const existingEnd = timeToMinutes(appt.endTime);

            if ((startMins < existingEnd) && (endMins > existingStart)) {
                hasOverlap = true;
                break;
            }
        }

        if (hasOverlap) {
            return res.status(400).json({ message: "Appointment overlaps with an existing appointment." });
        }

        // Add the user ID to the appointment data. The user ID is obtained from the protect middleware, which adds the logged-in user's information to the req.user object. This way, we can associate the appointment with the user who created it.
        // req.user._id means the ID of the currently logged-in user, which is added to the appointment data when creating a new appointment. This allows us to keep track of which user made which appointment in the database.
        const appointment = await Appointment.create({
            user: req.user._id, 
            services: services,
            date: date,
            startTime: startTime,
            endTime: endTime,
            totalDuration: totalDuration,
            totalAmount: totalAmount,
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

// @desc    Get logged in user's appointments
// @route   GET /api/appointments
// @access  Private
const getMyAppointments = async (req, res) => {
    try {
        // Using req.user._id to find appointments that belong to the currently logged-in user. This ensures that users can only see their own appointments when they access this route. The appointments are sorted by creation date in descending order, so the most recent appointments will appear first in the response.
        const appointments = await Appointment.find({ user: req.user._id }).populate('services', 'name price').sort({ createdAt: -1 });
        res.status(200).json(appointments);
    } catch (error) {
        console.error("Get My Appointments Error:", error);
        res.status(500).json({ message: "Server Error: Could not fetch appointments." });
    }
};

const getAllAppointments = async (req, res) => {
    try {        // Find all appointments and populate the user field with the user's name and email for better readability. The services field is also populated to include the name, price, and duration of each service in the appointment. The appointments are sorted by creation date in descending order, so the most recent appointments will appear first in the response. This route is intended for admin users to view all appointments.
        const appointments = await Appointment.find({}).populate('user', 'name email phone').populate('services', 'name price').sort({ createdAt: -1 }); 
        res.status(200).json(appointments);
    }catch (error) {
        console.error("Get All Appointments Error:", error);
        res.status(500).json({ message: "Server Error: Could not fetch all appointments." });
    }
};

// @desc    Get appointments assigned to the logged in staff member
// @route   GET /api/appointments/staff-schedule
// @access  Private/Staff
const getStaffAppointments = async (req, res) => {
    try {
        if (req.user.role !== 'staff' && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const query = req.user.role === 'admin'
            ? {}
            : { stylist: req.user.name };

        const appointments = await Appointment.find(query)
            .populate('user', 'name email phone')
            .populate('services', 'name price duration')
            .sort({ date: 1, startTime: 1 });

        res.status(200).json(appointments);
    } catch (error) {
        console.error('Get Staff Appointments Error:', error);
        res.status(500).json({ message: 'Server Error: Could not fetch staff appointments.' });
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

        // Robust date parsing: Parse YYYY-MM-DD and HH:MM AM/PM separately to handle timezones correctly
        const [year, month, day] = appointment.date.split('-').map(Number);
        const timeMins = timeToMinutes(appointment.startTime);
        const hours = Math.floor(timeMins / 60);
        const minutes = timeMins % 60;

        // Create appointment date using UTC to avoid timezone issues: YYYY-MM-DD at HH:MM AM/PM
        const appointmentDateObj = new Date(year, month - 1, day, hours, minutes, 0, 0);
        const nowDate = new Date();

        // Calculate difference in milliseconds, then convert to hours with precision
        const diffInMs = appointmentDateObj.getTime() - nowDate.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);

        // Block cancellation if appointment is less than 2 hours away or in the past
        if (diffInHours < 2) {
            return res.status(400).json({
                message: diffInHours < 0
                    ? "Cannot cancel past appointments."
                    : "You can only cancel appointments at least 2 hours in advance."
            });
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

// @desc    Update appointment status (Admin only)
// @route   PUT /api/appointments/:id/status
// @access  Private/Admin
const updateAppointmentStatus = async (req, res) => {
    try {
        const { status } = req.body; 
        
        const appointment = await Appointment.findById(req.params.id).populate('user', 'name email').populate('services', 'name'); // Populate user details for better readability

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found." });
        }

        appointment.status = status;
        const updatedAppointment = await appointment.save();

        // Part of the code to send an email notification to the user about the status update of their appointment. The email includes the appointment details and a message indicating the new status of the appointment. This enhances the user experience by keeping them informed about the status of their appointments in a timely manner.
        if (appointment.user && appointment.user.email) {
            const emailSubject = `Appointment ${status} - Salon Booking System`;

            const serviceNames = appointment.services.map(s => s.name).join(', ');
            
            // Crafting a visually appealing HTML email message to notify the user about the status update of their appointment. The email includes the appointment details such as service, date, time, duration, and total amount. Uses color coding to indicate the status (green for Approved, red for Rejected, etc.).
            const emailMessage = `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 550px; margin: 0 auto; background-color: #f9f9f9;">
                    <h2 style="color: ${status === 'Approved' ? '#27ae60' : status === 'Rejected' ? '#e74c3c' : '#f39c12'}; text-align: center; border-bottom: 2px solid ${status === 'Approved' ? '#27ae60' : status === 'Rejected' ? '#e74c3c' : '#f39c12'}; padding-bottom: 10px;">
                        Appointment Status: ${status}
                    </h2>
                    <p style="font-size: 16px; margin-top: 20px;">Welcome! <strong>${appointment.user.name}</strong>,</p>
                    <p style="font-size: 14px; color: #555; margin-bottom: 20px;">Your appointment status has been updated to: <strong style="color: ${status === 'Approved' ? '#27ae60' : status === 'Rejected' ? '#e74c3c' : '#f39c12'};">${status}</strong></p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <tr>
                            <td style="padding: 10px; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold; width: 40%;">Services:</td>
                            <td style="padding: 10px; border: 1px solid #e0e0e0;">${serviceNames}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Date:</td>
                            <td style="padding: 10px; border: 1px solid #e0e0e0;">${appointment.date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Time:</td>
                            <td style="padding: 10px; border: 1px solid #e0e0e0;">${appointment.startTime} - ${appointment.endTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Duration:</td>
                            <td style="padding: 10px; border: 1px solid #e0e0e0;">${appointment.totalDuration} minutes</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Total Amount:</td>
                            <td style="padding: 10px; border: 1px solid #e0e0e0; color: #27ae60; font-weight: bold;">Rs. ${appointment.totalAmount.toFixed(2)}</td>
                        </tr>
                    </table>
                    <p style="margin-top: 20px; font-size: 14px; color: #777; text-align: center;">
                        Thank you for choosing Salon DEES!<br/><span style="font-size: 12px;">For assistance, contact us at info@salondees.com or +94 77 123 4567</span>
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

// @desc    Update appointment status by assigned staff member
// @route   PUT /api/appointments/:id/staff-status
// @access  Private/Staff
const updateAppointmentStatusByStaff = async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ['Completed', 'No-Show'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'This status transition is not allowed for staff.' });
        }

        if (req.user.role !== 'staff' && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const appointment = await Appointment.findById(req.params.id)
            .populate('user', 'name email')
            .populate('services', 'name');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        if (req.user.role === 'staff' && appointment.stylist !== req.user.name) {
            return res.status(401).json({ message: 'You are not assigned to this appointment.' });
        }

        if (appointment.status !== 'Approved') {
            return res.status(400).json({ message: 'Only approved appointments can be completed or marked no-show.' });
        }

        const [year, month, day] = appointment.date.split('-').map(Number);
        const appointmentStartMinutes = timeToMinutes(appointment.startTime);
        const startHours = Math.floor(appointmentStartMinutes / 60);
        const startMinutes = appointmentStartMinutes % 60;
        const appointmentStart = new Date(year, month - 1, day, startHours, startMinutes, 0, 0);

        if (Date.now() < appointmentStart.getTime()) {
            return res.status(400).json({ message: 'This appointment cannot be updated before its start time.' });
        }

        appointment.status = status;
        const updatedAppointment = await appointment.save();

        res.status(200).json({
            message: 'Status updated successfully!',
            appointment: updatedAppointment
        });
    } catch (error) {
        console.error('Staff Status Update Error:', error);
        res.status(500).json({ message: 'Server Error: Could not update appointment status.' });
    }
};

// @desc    Soft hide an appointment from customer's history
// @route   PUT /api/appointments/:id/hide
// @access  Private
const hideAppointmentByCustomer = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        if (appointment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'You are not authorized to update this appointment.' });
        }

        appointment.isHiddenByCustomer = true;
        await appointment.save();

        res.status(200).json({
            message: 'Appointment hidden successfully.',
            id: appointment._id,
            isHiddenByCustomer: appointment.isHiddenByCustomer
        });
    } catch (error) {
        console.error('Hide Appointment Error:', error);
        res.status(500).json({ message: 'Server Error: Could not hide appointment.' });
    }
};

module.exports = {
    createAppointment,
    getMyAppointments,
    getAllAppointments,
    getStaffAppointments,
    deleteAppointment,
    updateAppointmentStatus,
    updateAppointmentStatusByStaff,
    hideAppointmentByCustomer
};
