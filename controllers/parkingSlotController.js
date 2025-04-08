const ParkingSlot = require('../models/ParkingSlot');
const Block = require('../models/Block');
const logger = require('../config/logger');
const { ApiError } = require('../utils/ApiError');

// Get all parking slots with block information
exports.getAllParkingSlots = async (req, res, next) => {
    try {
        const query = { isActive: true };
        
        // Add filters if provided
        if (req.query.status) {
            query.status = req.query.status;
        }
        if (req.query.type) {
            query.type = req.query.type;
        }
        if (req.query.rateType) {
            query.rateType = req.query.rateType;
        }
        if (req.query.block) {
            query.block = req.query.block;
        }
        if (req.query.vehicleType) {
            query.vehicleType = req.query.vehicleType;
        }

        const slots = await ParkingSlot.find(query)
            .populate({
                path: 'block',
                select: 'blockName blockDescription floor isActive'
            })
            .populate({
                path: 'currentVehicle',
                select: 'licensePlate vehicleType make model color'
            })
            .sort({ slotNumber: 1 });

        res.status(200).json({
            success: true,
            count: slots.length,
            data: slots
        });
    } catch (error) {
        logger.error(`Error fetching parking slots: ${error.message}`);
        next(error);
    }
};

// Get parking slots by block ID
exports.getParkingSlotsByBlock = async (req, res, next) => {
    try {
        const { blockId } = req.params;

        // Verify block exists
        const block = await Block.findById(blockId);
        if (!block) {
            throw new ApiError(404, 'Block not found');
        }

        const query = { 
            block: blockId,
            isActive: true 
        };

        // Add vehicle type filter if provided
        if (req.query.vehicleType) {
            query.vehicleType = req.query.vehicleType;
        }

        const slots = await ParkingSlot.find(query)
            .populate({
                path: 'currentVehicle',
                select: 'licensePlate vehicleType make model color'
            })
            .sort({ slotNumber: 1 });

        res.status(200).json({
            success: true,
            count: slots.length,
            data: slots
        });
    } catch (error) {
        logger.error(`Error fetching parking slots for block: ${error.message}`);
        next(error);
    }
};

// Get single parking slot by ID
exports.getParkingSlotById = async (req, res, next) => {
    try {
        const slot = await ParkingSlot.findById(req.params.id)
            .populate({
                path: 'block',
                select: 'blockName blockDescription floor isActive'
            })
            .populate({
                path: 'currentVehicle',
                select: 'licensePlate vehicleType make model color'
            });

        if (!slot) {
            throw new ApiError(404, 'Parking slot not found');
        }

        res.status(200).json({
            success: true,
            data: slot
        });
    } catch (error) {
        logger.error(`Error fetching parking slot: ${error.message}`);
        next(error);
    }
};

// Update parking slot (Admin only)
exports.updateParkingSlot = async (req, res, next) => {
    try {
        if (!req.user.isAdmin) {
            throw new ApiError(403, 'Only administrators can update parking slots');
        }

        const slot = await ParkingSlot.findById(req.params.id);
        
        if (!slot) {
            throw new ApiError(404, 'Parking slot not found');
        }

        // Prevent updating certain fields if slot is occupied
        if (slot.status === 'occupied' && (req.body.type || req.body.rateType || req.body.vehicleType)) {
            throw new ApiError(400, 'Cannot update slot type, rate type, or vehicle type while slot is occupied');
        }

        const updatedSlot = await ParkingSlot.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).populate({
            path: 'block',
            select: 'blockName blockDescription floor isActive'
        });

        logger.info(`Parking slot updated: ${slot.slotNumber} by user: ${req.user._id}`);

        res.status(200).json({
            success: true,
            data: updatedSlot
        });
    } catch (error) {
        logger.error(`Error updating parking slot: ${error.message}`);
        next(error);
    }
};

// Change parking slot status
exports.updateSlotStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const validStatuses = ['available', 'occupied', 'reserved', 'maintenance'];

        if (!validStatuses.includes(status)) {
            throw new ApiError(400, 'Invalid status value');
        }

        const slot = await ParkingSlot.findById(req.params.id);
        
        if (!slot) {
            throw new ApiError(404, 'Parking slot not found');
        }

        // Additional validation for status changes
        if (status === 'occupied' && !req.body.currentVehicle) {
            throw new ApiError(400, 'Current vehicle ID is required when setting status to occupied');
        }

        // Validate vehicle type compatibility if vehicle is provided
        if (status === 'occupied' && req.body.currentVehicle) {
            // This would require a lookup to the Vehicle model to check vehicle type
            // For now, we'll assume the frontend will handle this validation
            // In a real implementation, you would add code here to check vehicle type compatibility
        }

        // Update the slot
        const updates = {
            status,
            currentVehicle: status === 'occupied' ? req.body.currentVehicle : null,
            lastOccupied: status === 'occupied' ? new Date() : slot.lastOccupied
        };

        const updatedSlot = await ParkingSlot.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).populate({
            path: 'block',
            select: 'blockName blockDescription floor isActive'
        });

        logger.info(`Parking slot status updated: ${slot.slotNumber} to ${status} by user: ${req.user._id}`);

        res.status(200).json({
            success: true,
            data: updatedSlot
        });
    } catch (error) {
        logger.error(`Error updating parking slot status: ${error.message}`);
        next(error);
    }
};

// Delete parking slot (Admin only - Soft delete)
exports.deleteParkingSlot = async (req, res, next) => {
    try {
        if (!req.user.isAdmin) {
            throw new ApiError(403, 'Only administrators can delete parking slots');
        }

        const slot = await ParkingSlot.findById(req.params.id);
        
        if (!slot) {
            throw new ApiError(404, 'Parking slot not found');
        }

        // Prevent deletion if slot is occupied
        if (slot.status === 'occupied') {
            throw new ApiError(400, 'Cannot delete an occupied parking slot');
        }

        // Soft delete by setting isActive to false
        slot.isActive = false;
        await slot.save();

        logger.info(`Parking slot deleted (soft): ${slot.slotNumber} by user: ${req.user._id}`);

        res.status(200).json({
            success: true,
            message: 'Parking slot successfully deleted'
        });
    } catch (error) {
        logger.error(`Error deleting parking slot: ${error.message}`);
        next(error);
    }
}; 