const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const BRAND_NAME = 'Salon DEES';
const LOGO_CID = 'salon-dees-logo';
const localLogoPath = path.resolve(__dirname, '..', '..', 'frontend', 'public', 'logo.jpeg');

const getPublicLogoUrl = () => {
    const explicitLogoUrl = String(process.env.EMAIL_LOGO_URL || '').trim();
    if (explicitLogoUrl) return explicitLogoUrl;

    const frontendUrl = String(process.env.FRONTEND_URL || process.env.CLIENT_URL || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)[0];

    return frontendUrl ? `${frontendUrl.replace(/\/$/, '')}/logo.jpeg` : '';
};

const stripHtml = (html = '') => String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildBrandedEmailHtml = (contentHtml = '', logoSrc = '') => `
<!doctype html>
<html>
  <body style="margin:0; padding:0; background:#0b0b0b; font-family:Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0b; padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; background:#111111; border:1px solid #262626; border-radius:18px; overflow:hidden;">
            <tr>
              <td align="center" style="padding:28px 24px 18px; background:#050505; border-bottom:1px solid #262626;">
                ${logoSrc ? `<img src="${logoSrc}" alt="${BRAND_NAME}" width="96" style="display:block; width:96px; max-width:96px; height:auto; margin:0 auto 12px; border-radius:14px;" />` : ''}
                <div style="font-size:20px; line-height:1.3; font-weight:700; letter-spacing:0.08em; color:#d4af37; text-transform:uppercase;">
                  ${BRAND_NAME}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                ${contentHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 24px 26px; color:#8a8a8a; font-size:12px; line-height:1.6;">
                This email was sent by ${BRAND_NAME}.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

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
        const hasLocalLogo = fs.existsSync(localLogoPath);
        const publicLogoUrl = getPublicLogoUrl();
        const logoSrc = hasLocalLogo ? `cid:${LOGO_CID}` : publicLogoUrl;
        const html = options.message
            ? buildBrandedEmailHtml(options.message, logoSrc)
            : undefined;
        const attachments = [...(options.attachments || [])];

        if (hasLocalLogo) {
            attachments.push({
                filename: 'logo.jpeg',
                path: localLogoPath,
                cid: LOGO_CID,
                contentType: 'image/jpeg',
            });
        }

        const mailOptions = {
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: options.email,
            subject: options.subject,
            text: options.text || stripHtml(options.message),
            html,
            attachments,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${options.email}`);
    } catch (error) {
        console.error("Email sending error:", error);
        throw error;
    }
};

module.exports = sendEmail;
