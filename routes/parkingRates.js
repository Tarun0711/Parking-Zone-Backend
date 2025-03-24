const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const {
    createParkingRate,
    getAllParkingRates,
    getParkingRate,
    updateParkingRate,
    deleteParkingRate
} = require('../controllers/parkingRateController');

// Public routes
router.get('/', getAllParkingRates);
router.get('/:id', getParkingRate);

// Protected routes (admin only)
router.post('/', auth, isAdmin, createParkingRate);
router.put('/:id', auth, isAdmin, updateParkingRate);
router.delete('/:id', auth, isAdmin, deleteParkingRate);

module.exports = router; 