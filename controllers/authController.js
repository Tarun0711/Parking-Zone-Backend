const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');
const emailService = require('../services/emailService');
const NotificationService = require('../services/notificationService');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
}; 

// Register new user
const register = async (req, res) => {
    try { 
        const { email, password, name } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create new user
        const user = new User({
            email,
            password,
            name
        });

        // Generate email verification token
        const verificationToken = user.generateEmailVerificationToken();
        await user.save();
        const otp = emailService.generateOTP();
        user.otp = otp;

        // Send verification email with OTP
        await emailService.sendOTPVerification(email, otp);
        await emailService.sendWelcomeEmail(email, name);

        // Initialize notification service with socket service from app.locals
        const notificationService = new NotificationService(req.app.locals.socketService);

        // Send welcome notification
        await notificationService.createNotification(
            user._id,
            'Welcome to Our Platform!',
            `Hi ${name}, welcome to our platform! We're excited to have you on board.`,
            'welcome',
            '/profile',
            { name }
        );

        res.status(201).json({
            message: 'User registered successfully. Please verify your email.',
            email: user.email
        });
    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({ error: 'Error registering user' });
    }
};

// Verify email with OTP
const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify email
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.json({
            message: 'Email verified successfully',
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        logger.error('Email verification error:', error);
        res.status(500).json({ error: 'Error verifying email' });
    }
};

// Resend verification OTP
const resendVerificationOTP = async (req, res) => {
    try {
        const { email } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ error: 'Email already verified' });
        }

        // Generate new OTP
        const otp = emailService.generateOTP();
        user.otp = otp;
        user.otpExpires = Date.now() + 600000; // 10 minutes
        await user.save();

        // Send verification email
        await emailService.sendOTPVerification(email, otp);

        res.json({ message: 'Verification OTP sent successfully' });
    } catch (error) {
        logger.error('Resend OTP error:', error);
        res.status(500).json({ error: 'Error resending verification OTP' });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user and include password field
        const user = await User.findOne({ email }).select('+password');
        
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            await user.incrementLoginAttempts();
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
            return res.status(401).json({ 
                error: 'Please verify your email before logging in' 
            });
        }

        // Reset login attempts on successful login
        await user.resetLoginAttempts();
        
        // Update last login
        user.lastLogin = Date.now();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Error during login' });
    }
};

// Request password reset
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate reset token
        const resetToken = user.generatePasswordResetToken();
        await user.save();

        // Send reset email
        await emailService.sendPasswordResetEmail(email, resetToken);

        res.json({ message: 'Password reset instructions sent to email' });
    } catch (error) {
        logger.error('Password reset request error:', error);
        res.status(500).json({ error: 'Error processing password reset request' });
    }
};

// Reset password
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        // Hash token to compare with stored hash
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Update password
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        logger.error('Password reset error:', error);
        res.status(500).json({ error: 'Error resetting password' });
    }
};

// Get current user profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        logger.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Error fetching profile' });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const updates = req.body;
        delete updates.password; // Prevent password update through this route

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        logger.error('Profile update error:', error);
        res.status(500).json({ error: 'Error updating profile' });
    }
};

module.exports = {
    register,
    verifyEmail,
    resendVerificationOTP,
    login,
    forgotPassword,
    resetPassword,
    getProfile,
    updateProfile
}; 