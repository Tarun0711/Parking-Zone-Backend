const Block = require('../models/Block');
const logger = require('../config/logger');
const { ApiError } = require('../utils/ApiError');

// Create a new block (Admin only)
exports.createBlock = async (req, res, next) => {
    try {
        
        // Check if block with same name already exists
        const existingBlock = await Block.findOne({ blockName: req.body.blockName.toUpperCase() });
        if (existingBlock) {
            throw new ApiError(400, `Block with name "${req.body.blockName}" already exists`);
        }

        // Process vehicle types
        const vehicleTypes = {
            car: req.body.vehicleTypes?.car || 0,
            truck: req.body.vehicleTypes?.truck || 0,
            bike: req.body.vehicleTypes?.bike || 0
        };

        // Validate that the sum of vehicle types doesn't exceed total slots
        const totalVehicleTypes = vehicleTypes.car + vehicleTypes.truck + vehicleTypes.bike;
        if (totalVehicleTypes > req.body.totalSlots) {
            throw new ApiError(400, 'Sum of vehicle types cannot exceed total slots');
        }

        const blockData = {
            ...req.body,
            vehicleTypes,
            createdBy: req.user._id
        };

        const block = await Block.create(blockData);
        
        logger.info(`New block created: ${block.blockName} by user: ${req.user._id}`);
        
        res.status(201).json({
            success: true,
            data: block
        });
    } catch (error) {
        // Check for MongoDB duplicate key error
        if (error.code === 11000) {
            logger.error(`Duplicate block name attempted: ${req.body.blockName}`);
            return next(new ApiError(400, `Block with name "${req.body.blockName}" already exists`));
        }
        
        logger.error(`Error creating block: ${error.message}`);
        next(error);
    }
};

// Get all blocks
exports.getAllBlocks = async (req, res, next) => {
    try {
        const query = { isActive: true };
        
        // If not admin, only return active blocks
        if (!req.user.isAdmin) {
            query.isActive = true;
        }

        const blocks = await Block.find(query)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: blocks.length,
            data: blocks
        });
    } catch (error) {
        logger.error(`Error fetching blocks: ${error.message}`);
        next(error);
    }
};

// Get single block by ID
exports.getBlockById = async (req, res, next) => {
    try {
        const block = await Block.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!block) {
            throw new ApiError(404, 'Block not found');
        }

        // If not admin and block is inactive, deny access
        if (!req.user.isAdmin && !block.isActive) {
            throw new ApiError(403, 'Access denied');
        }

        res.status(200).json({
            success: true,
            data: block
        });
    } catch (error) {
        logger.error(`Error fetching block: ${error.message}`);
        next(error);
    }
};

// Update block (Admin only)
exports.updateBlock = async (req, res, next) => {
    try {
        if (!req.user.isAdmin) {
            throw new ApiError(403, 'Only administrators can update blocks');
        }

        const block = await Block.findById(req.params.id);
        
        if (!block) {
            throw new ApiError(404, 'Block not found');
        }

        // Prevent updating totalSlots if parking slots are already created
        if (req.body.totalSlots && block.totalSlots !== req.body.totalSlots) {
            throw new ApiError(400, 'Cannot update total slots after block creation');
        }

        // Process vehicle types if provided
        if (req.body.vehicleTypes) {
            const vehicleTypes = {
                car: req.body.vehicleTypes.car || block.vehicleTypes.car,
                truck: req.body.vehicleTypes.truck || block.vehicleTypes.truck,
                bike: req.body.vehicleTypes.bike || block.vehicleTypes.bike
            };

            // Validate that the sum of vehicle types doesn't exceed total slots
            const totalVehicleTypes = vehicleTypes.car + vehicleTypes.truck + vehicleTypes.bike;
            if (totalVehicleTypes > block.totalSlots) {
                throw new ApiError(400, 'Sum of vehicle types cannot exceed total slots');
            }

            req.body.vehicleTypes = vehicleTypes;
        }

        const updatedBlock = await Block.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        logger.info(`Block updated: ${block.blockName} by user: ${req.user._id}`);

        res.status(200).json({
            success: true,
            data: updatedBlock
        });
    } catch (error) {
        logger.error(`Error updating block: ${error.message}`);
        next(error);
    }
};

// Delete block (Admin only - Soft delete)
exports.deleteBlock = async (req, res, next) => {
    try {
        if (!req.user.isAdmin) {
            throw new ApiError(403, 'Only administrators can delete blocks');
        }

        const block = await Block.findById(req.params.id);
        
        if (!block) {
            throw new ApiError(404, 'Block not found');
        }

        // Soft delete by setting isActive to false
        block.isActive = false;
        await block.save();

        logger.info(`Block deleted (soft): ${block.blockName} by user: ${req.user._id}`);

        res.status(200).json({
            success: true,
            message: 'Block successfully deleted'
        });
    } catch (error) {
        logger.error(`Error deleting block: ${error.message}`);
        next(error);
    }
}; 