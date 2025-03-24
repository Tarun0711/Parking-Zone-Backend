const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const {
    register,
    verifyEmail,
    resendVerificationOTP,
    login,
    forgotPassword,
    resetPassword,
    getProfile,
    updateProfile
} = require('../controllers/authController');

// Validation middleware
const validateRegister = [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/\d/)
        .withMessage('Password must contain at least one number')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter'),
    body('name')
        .trim()
        .isLength({ min: 2 })
        .withMessage('Name must be at least 2 characters long')
];

const validateLogin = [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
];

const validateOTP = [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('otp')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP must be 6 digits')
        .matches(/^\d+$/)
        .withMessage('OTP must contain only numbers')
];

const validatePasswordReset = [
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/\d/)
        .withMessage('Password must contain at least one number')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
];

// Routes
router.post('/register', validateRegister, register);
router.post('/verify-email', validateOTP, verifyEmail);
router.post('/resend-verification', body('email').isEmail().withMessage('Please enter a valid email'), resendVerificationOTP);
router.post('/login', validateLogin, login);
router.post('/forgot-password', body('email').isEmail().withMessage('Please enter a valid email'), forgotPassword);
router.post('/reset-password', validatePasswordReset, resetPassword);

// Protected routes
router.get('/profile', auth, getProfile);
router.patch('/profile', auth, updateProfile);

module.exports = router; 