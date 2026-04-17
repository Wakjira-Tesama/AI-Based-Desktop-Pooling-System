const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Create a transporter object using the default SMTP transport
 * For production, use environment variables for credentials
 */
const createTransporter = () => {
  // Use Gmail by default if credentials are provided, else log warning
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn('Email credentials not found in environment variables. OTP emails will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Use App Password for Gmail
    },
  });
};

/**
 * Send an OTP verification email
 */
const sendOTPEmail = async (toEmail, studentName, otpCode) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    logger.warn(`Mocking OTP Email for ${toEmail}: Code is ${otpCode}`);
    return true; 
  }

  const mailOptions = {
    from: `"ASTU Library Service" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Verification Code for ASTU Desktop Pooling System',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
        <h2 style="color: #2563eb; text-align: center;">Verify Your Account</h2>
        <p>Hello <strong>${studentName}</strong>,</p>
        <p>Thank you for registering for the ASTU Desktop Pooling System. To complete your registration, please use the following one-time password (OTP):</p>
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 15px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">${otpCode}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="text-align: center; color: #94a3b8; font-size: 12px;">© 2026 ASTU Library Service. All rights reserved.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`OTP Email sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Error sending email to ${toEmail}:`, error);
    throw new Error('Failed to send verification email');
  }
};

module.exports = { sendOTPEmail };
