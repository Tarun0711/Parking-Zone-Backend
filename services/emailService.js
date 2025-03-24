const nodemailer = require('nodemailer');
const logger = require('../config/logger');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async sendEmail(to, subject, html) {
        try {
            const mailOptions = {
                from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
                to,
                subject,
                html
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Email sent: ${info.messageId}`);
            return true;
        } catch (error) {
            logger.error('Email sending error:', error);
            throw error;
        }
    }
 
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendOTPVerification(email, otp) {
        const subject = 'Email Verification OTP';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Email Verification</h2>
                <p>Your verification code is:</p>
                <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
            </div>
        `;

        return this.sendEmail(email, subject, html);
    }

    async sendPasswordResetEmail(email, resetToken) {
        const subject = 'Password Reset Request';
        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
        
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
                <p>This link will expire in 10 minutes.</p>
                <p>If you didn't request this reset, please ignore this email.</p>
            </div>
        `;

        return this.sendEmail(email, subject, html);
    }

    async sendWelcomeEmail(email, name) {
        const subject = 'Welcome to Our Platform';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome ${name}!</h2>
                <p>Thank you for joining our platform. We're excited to have you on board!</p>
                <p>If you have any questions, feel free to reach out to our support team.</p>
                <p>Best regards,<br>The Team</p>
            </div>
        `;

        return this.sendEmail(email, subject, html);
    }
}

module.exports = new EmailService(); 