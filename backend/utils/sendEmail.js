const nodemailer = require('nodemailer');

const BRAND_NAME = 'Salon DEES';

// Removes HTML tags, script, and style content from a string to produce plain text.
const stripHtml = (html = '') => String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Sends an email using nodemailer with the exact content and attachments supplied by the caller.
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
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: options.email,
            subject: options.subject,
            html: options.html || options.message,
            text: options.text || stripHtml(options.html || options.message),
            attachments: options.attachments || [],
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${options.email}`);
    } catch (error) {
        console.error("Email sending error:", error);
        throw error;
    }
};

module.exports = sendEmail;