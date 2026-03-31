const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    try {
        // 1. Create a transporter object using the default SMTP transport. In this case, we're using Gmail's SMTP server to send emails. The authentication details (email and password) are stored in environment variables for security reasons.
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // 2. Define the email options
        const mailOptions = {
            from: `"Salon Booking System" <${process.env.EMAIL_USER}>`,
            to: options.email,
            subject: options.subject,
            html: options.message, // Use HTML content for the email body
        };

        // 3. Send the email
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${options.email}`);
    } catch (error) {
        console.error("Email sending error:", error);
    }
};

module.exports = sendEmail;