const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const {
    getAllParkingSlots,
    getParkingSlotsByBlock,
    getParkingSlotById,
    updateParkingSlot,
    updateSlotStatus,
    deleteParkingSlot
} = require('../controllers/parkingSlotController');

// Public routes
router.get('/', auth, getAllParkingSlots);
router.get('/block/:blockId', auth, getParkingSlotsByBlock);
router.get('/:id', auth, getParkingSlotById);

// Protected routes requiring admin access
router.put('/:id', auth, isAdmin, updateParkingSlot);
router.patch('/:id/status', auth, updateSlotStatus);
router.delete('/:id', auth, isAdmin, deleteParkingSlot);

module.exports = router; 