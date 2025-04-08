const ParkingRequest = require('../models/ParkingRequest');
const ParkingSession = require('../models/ParkingSession');
const ParkingSlot = require('../models/ParkingSlot');
const Vehicle = require('../models/Vehicle');
const logger = require('../config/logger');
const { ApiError } = require('../utils/ApiError');
const emailService = require('../services/emailService');
const QRCode = require('qrcode');
const { uploadImageToCloudinary } = require('../utils/ImageUploader');
const User = require('../models/User');

// Create a new parking request
exports.createParkingRequest = async (req, res, next) => {
    try {
        const { vehicleId, parkingSlotId } = req.body;

        // Validate vehicle
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            throw new ApiError(404, 'Vehicle not found');
        }

        // Validate parking slot
        const parkingSlot = await ParkingSlot.findById(parkingSlotId);
        if (!parkingSlot) {
            throw new ApiError(404, 'Parking slot not found');
        }

        // Check if parking slot is available
        if (parkingSlot.status !== 'available') {
            throw new ApiError(400, 'Parking slot is not available');
        }

        // Check if there's already a pending request for this slot
        const existingRequest = await ParkingRequest.findOne({
            parkingSlot: parkingSlotId,
            status: 'pending'
        });

        if (existingRequest) {
            throw new ApiError(400, 'This parking slot already has a pending request');
        }

        // Create parking request
        const parkingRequest = new ParkingRequest({
            vehicle: vehicleId,
            parkingSlot: parkingSlotId,
            requestedBy: req.user._id
        });

        await parkingRequest.save();

        // Update parking slot status to reserved
        await ParkingSlot.findByIdAndUpdate(parkingSlotId, {
            status: 'reserved',
            currentVehicle: vehicleId
        });

        logger.info(`New parking request created for vehicle ${vehicleId} at slot ${parkingSlotId} and slot marked as reserved`);
        
        res.status(201).json({
            success: true,
            data: parkingRequest
        });
    } catch (error) {
        logger.error(`Error creating parking request: ${error.message}`);
        next(error);
    }
};

// Get all parking requests
exports.getAllParkingRequests = async (req, res, next) => {
    try {
        const query = {};
        
        // Add filters if provided
        if (req.query.status) {
            query.status = req.query.status;
        }
        if (req.query.vehicle) {
            query.vehicle = req.query.vehicle;
        }
        if (req.query.parkingSlot) {
            query.parkingSlot = req.query.parkingSlot;
        }

        const requests = await ParkingRequest.find(query)
            .populate('vehicle', 'licensePlate vehicleType make model')
            .populate('parkingSlot', 'slotNumber block')
            .populate('requestedBy', 'name email')
            .populate('respondedBy', 'name email')
            .sort({ requestTime: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        logger.error(`Error fetching parking requests: ${error.message}`);
        next(error);
    }
};

// Get single parking request
exports.getParkingRequest = async (req, res, next) => {
    try {
        const request = await ParkingRequest.findById(req.params.id)
            .populate('vehicle', 'licensePlate vehicleType make model')
            .populate('parkingSlot', 'slotNumber block')
            .populate('requestedBy', 'name email')
            .populate('respondedBy', 'name email')
            .populate('parkingSession');

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Parking request not found'
            });
        }

        res.status(200).json({
            success: true,
            data: request
        });
    } catch (error) {
        logger.error(`Error fetching parking request: ${error.message}`);
        next(error);
    }
};

// Get parking requests by user ID
exports.getParkingRequestsByUserId = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        
        const requests = await ParkingRequest.find({ requestedBy: userId })
            .populate('vehicle', 'licensePlate vehicleType make model')
            .populate('parkingSlot', 'slotNumber block')
            .populate('respondedBy', 'name email')
            .populate('parkingSession')
            .sort({ requestTime: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        logger.error(`Error fetching user parking requests: ${error.message}`);
        next(error);
    }
};

// Approve a parking request
exports.approveParkingRequest = async (req, res, next) => {
    try {
        const requestId = req.params.id;

        // Find the parking request
        const parkingRequest = await ParkingRequest.findById(requestId)
            .populate('vehicle')
            .populate('parkingSlot');

        if (!parkingRequest) {
            throw new ApiError(404, 'Parking request not found');
        }

        // Check if request is already processed
        if (parkingRequest.status !== 'pending') {
            throw new ApiError(400, 'Parking request is already processed');
        }

        // Update parking request status
        parkingRequest.status = 'approved';
        parkingRequest.approvedBy = req.user._id;
        parkingRequest.approvedAt = new Date();
        await parkingRequest.save();

        // Create parking session
        const parkingSession = new ParkingSession({
            vehicle: parkingRequest.vehicle._id,
            parkingSlot: parkingRequest.parkingSlot._id,
            issuedBy: req.user._id,
            status: 'active'
        });

        // Generate QR code
        parkingSession.qrCode = parkingSession.generateQRCode();

        // Generate QR code image and upload to cloudinary
        const qrCodeBuffer = await QRCode.toBuffer(parkingSession.qrCode);
        const uploadResult = await uploadImageToCloudinary(qrCodeBuffer, 'parking-qrcodes', 200, 90);
        
        if (!uploadResult || !uploadResult.secure_url) {
            throw new ApiError(500, 'Failed to upload QR code to Cloudinary');
        }
        
        parkingSession.qrCodeUrl = uploadResult.secure_url;
        await parkingSession.save();

        // Update parking slot status to occupied
        await ParkingSlot.findByIdAndUpdate(parkingRequest.parkingSlot._id, {
            status: 'occupied',
            currentVehicle: parkingRequest.vehicle._id,
            currentSession: parkingSession._id
        });

        // Send email notification to vehicle owner
        const vehicleOwner = await User.findById(parkingRequest.vehicle.owner);
        if (vehicleOwner && vehicleOwner.email) {
            await emailService.sendEmail(
                vehicleOwner.email,
                'Parking Request Approved',
                `Your parking request for slot ${parkingRequest.parkingSlot.slotNumber} has been approved.`
            );
        }

        logger.info(`Parking request ${requestId} approved and slot marked as occupied`);
        
        res.status(200).json({
            success: true,
            data: parkingRequest
        });
    } catch (error) {
        logger.error(`Error approving parking request: ${error.message}`);
        next(error);
    }
};

// Reject a parking request
exports.rejectParkingRequest = async (req, res, next) => {
    try {
        const requestId = req.params.id;
        const { reason } = req.body;

        // Find the parking request
        const parkingRequest = await ParkingRequest.findById(requestId)
            .populate('vehicle')
            .populate('parkingSlot');

        if (!parkingRequest) {
            throw new ApiError(404, 'Parking request not found');
        }

        // Check if request is already processed
        if (parkingRequest.status !== 'pending') {
            throw new ApiError(400, 'Parking request is already processed');
        }

        // Update parking request status
        parkingRequest.status = 'rejected';
        parkingRequest.rejectedBy = req.user._id;
        parkingRequest.rejectedAt = new Date();
        parkingRequest.reason = reason || 'No reason provided';
        await parkingRequest.save();

        // Update parking slot status back to available
        await ParkingSlot.findByIdAndUpdate(parkingRequest.parkingSlot._id, {
            status: 'available',
            currentVehicle: null
        });

        // Send email notification to vehicle owner
        const vehicleOwner = await User.findById(parkingRequest.vehicle.owner);
        if (vehicleOwner && vehicleOwner.email) {
            await emailService.sendEmail(
                vehicleOwner.email,
                'Parking Request Rejected',
                `Your parking request for slot ${parkingRequest.parkingSlot.slotNumber} has been rejected. Reason: ${reason || 'No reason provided'}`
            );
        }

        logger.info(`Parking request ${requestId} rejected and slot marked as available`);
        
        res.status(200).json({
            success: true,
            data: parkingRequest
        });
    } catch (error) {
        logger.error(`Error rejecting parking request: ${error.message}`);
        next(error);
    }
};

module.exports = exports; 