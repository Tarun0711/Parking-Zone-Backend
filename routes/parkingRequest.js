const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const { body } = require('express-validator');
const {
    createParkingRequest,
    getAllParkingRequests,
    getParkingRequest,
    getParkingRequestsByUserId,
    approveParkingRequest,
    rejectParkingRequest
} = require('../controllers/parkingRequestController');

// Validation middleware
const validateCreateRequest = [
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

const validateRejectRequest = [
    body('reason')
        .optional()
        .isString()
        .withMessage('Reason must be a string')
];

// All routes require authentication
router.use(auth);

// Routes
router.route('/')
    .post(validateCreateRequest, createParkingRequest)
    .get(isAdmin, getAllParkingRequests);

router.route('/:id')
    .get(getParkingRequest);

router.route('/user/:userId')
    .get(getParkingRequestsByUserId);

router.route('/:id/approve')
    .post(isAdmin, approveParkingRequest);

router.route('/:id/reject')
    .post(isAdmin, validateRejectRequest, rejectParkingRequest);

module.exports = router; 