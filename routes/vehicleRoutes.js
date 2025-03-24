const express = require('express');
const vehicleController = require('../controllers/vehicleController');
const { auth, isAdmin } = require('../middleware/auth');

const router = express.Router();


// Regular vehicle routes
router.route('/')
    .get(auth, vehicleController.getAllVehicles)
    .post(auth, vehicleController.createVehicle);

router.route('/:id')
    .get(auth, vehicleController.getVehicle)
    .patch(auth, vehicleController.updateVehicle)
    .delete(auth, vehicleController.deleteVehicle);

// Special routes
router.get('/owner/:ownerId', auth, vehicleController.getVehiclesByOwner);
router.get('/regular', auth, vehicleController.getRegularVehicles);

module.exports = router; 