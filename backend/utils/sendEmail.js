const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    try {
        const transporterOptions = process.env.EMAIL_HOST
            ? {
                host: process.env.EMAIL_HOST,
                port: Number(process.env.EMAIL_PORT) || 587,
                secure: process.env.EMAIL_SECURE === 'true',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            }
            : {
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            };

        const transporter = nodemailer.createTransport(transporterOptions);

        const mailOptions = {
            from: `"Salon Booking System" <${process.env.EMAIL_USER}>`,
            to: options.email,
            subject: options.subject,
            text: options.text || options.message,
            html: options.message,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${options.email}`);
    } catch (error) {
        console.error("Email sending error:", error);
        throw error;
    }
};

module.exports = sendEmail;
