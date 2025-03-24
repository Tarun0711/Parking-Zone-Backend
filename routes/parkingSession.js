const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const { body } = require('express-validator');
const {
    createParkingSession,
    getAllParkingSessions,
    getParkingSession,
    completeParkingSession,
    cancelParkingSession,
    getParkingSessionsByUserId,
    getQRCode,
    verifyQRCode
} = require('../controllers/parkingSessionController');

// Validation middleware
const validateCreateSession = [
    body('vehicleId')
        .notEmpty()
        .withMessage('Vehicle ID is required')
        .isMongoId()
        .withMessage('Invalid vehicle ID format'),
    body('parkingSlotId')
        .notEmpty()
        .withMessage('Parking slot ID is required')
        .isMongoId()
        .withMessage('Invalid parking slot ID format')
];

const validateQRVerification = [
    body('qrCode')
        .notEmpty()
        .withMessage('QR code is required')
        .isString()
        .withMessage('QR code must be a string'),
    body('action')
        .notEmpty()
        .withMessage('Action is required')
        .isIn(['entry', 'exit'])
        .withMessage('Action must be either entry or exit')
];

// All routes require authentication
router.use(auth);

// Routes
router.route('/')
    .post(validateCreateSession, createParkingSession)
    .get(getAllParkingSessions);

router.route('/:id')
    .get(getParkingSession);

router.route('/:id/complete')
    .post(completeParkingSession);

router.route('/:id/cancel')
    .post(cancelParkingSession);

router.route('/user/:userId')
    .get(getParkingSessionsByUserId);

router.route('/:id/qr-code')
    .get(getQRCode);

// QR verification route - admin only
router.route('/verify-qr')
    .post(isAdmin, validateQRVerification, verifyQRCode);

module.exports = router; 