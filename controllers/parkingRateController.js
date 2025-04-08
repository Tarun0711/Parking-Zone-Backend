const ParkingRate = require('../models/ParkingRate');
const logger = require('../config/logger');

// Create a new parking rate
exports.createParkingRate = async (req, res) => {
    try {
        const { type, vehicleType, hourlyRate, description } = req.body;

        const parkingRate = new ParkingRate({
            type,
            vehicleType: vehicleType || 'car', // Default to car if not specified
            hourlyRate,
            description,
            updatedBy: req.user._id
        });

        await parkingRate.save();
        logger.info(`New parking rate created by admin ${req.user._id}`);
        
        res.status(201).json({
            success: true,
            data: parkingRate
        });
    } catch (error) {
        logger.error('Error creating parking rate:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Get all parking rates
exports.getAllParkingRates = async (req, res) => {
    try {
        const parkingRates = await ParkingRate.find()
            .populate('updatedBy', 'name email');

        res.status(200).json({
            success: true,
            count: parkingRates.length,
            data: parkingRates
        });
    } catch (error) {
        logger.error('Error fetching parking rates:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// Get single parking rate
exports.getParkingRate = async (req, res) => {
    try {
        const parkingRate = await ParkingRate.findById(req.params.id)
            .populate('updatedBy', 'name email');

        if (!parkingRate) {
            return res.status(404).json({
                success: false,
                error: 'Parking rate not found'
            });
        }

        res.status(200).json({
            success: true,
            data: parkingRate
        });
    } catch (error) {
        logger.error('Error fetching parking rate:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// Update parking rate
exports.updateParkingRate = async (req, res) => {
    try {
        const { type, vehicleType, hourlyRate, description, isActive } = req.body;

        const parkingRate = await ParkingRate.findById(req.params.id);

        if (!parkingRate) {
            return res.status(404).json({
                success: false,
                error: 'Parking rate not found'
            });
        }

        parkingRate.type = type || parkingRate.type;
        parkingRate.vehicleType = vehicleType || parkingRate.vehicleType;
        parkingRate.hourlyRate = hourlyRate || parkingRate.hourlyRate;
        parkingRate.description = description || parkingRate.description;
        parkingRate.isActive = isActive !== undefined ? isActive : parkingRate.isActive;
        parkingRate.updatedBy = req.user._id;

        await parkingRate.save();
        logger.info(`Parking rate ${parkingRate._id} updated by admin ${req.user._id}`);

        res.status(200).json({
            success: true,
            data: parkingRate
        });
    } catch (error) {
        logger.error('Error updating parking rate:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Delete parking rate
exports.deleteParkingRate = async (req, res) => {
    try {
        const parkingRate = await ParkingRate.findById(req.params.id);

        if (!parkingRate) {
            return res.status(404).json({
                success: false,
                error: 'Parking rate not found'
            });
        }

        await parkingRate.deleteOne();
        logger.info(`Parking rate ${req.params.id} deleted by admin ${req.user._id}`);

        res.status(200).json({
            success: true,
            message: 'Parking rate deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting parking rate:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
}; 