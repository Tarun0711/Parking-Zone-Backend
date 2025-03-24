const ParkingSession = require('../models/ParkingSession');
const ParkingSlot = require('../models/ParkingSlot');
const Vehicle = require('../models/Vehicle');
const logger = require('../config/logger');
const emailService = require('../services/emailService');
const { ApiError } = require('../utils/ApiError');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;



exports.createParkingSession = async (req, res, next) => {
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

        // Create parking session
        const parkingSession = new ParkingSession({
            vehicle: vehicleId,
            parkingSlot: parkingSlotId,
            issuedBy: req.user._id
        });

        // Generate QR code 
        parkingSession.qrCode = parkingSession.generateQRCode();

        // Generate QR code as a buffer
        const qrCodeBuffer = await QRCode.toBuffer(parkingSession.qrCode);

        // Upload QR code to external API
        const formData = new FormData();
        formData.append('file', qrCodeBuffer, `qr-${parkingSession._id}.png`);

        const uploadResponse = await axios.post('https://api.propertywallah.org/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (!uploadResponse.data || !uploadResponse.data.url) {
            throw new ApiError(500, 'Failed to upload QR code');
        }

        const qrCodeUrl = uploadResponse.data.url;

        // Get vehicle owner's email
        const vehicleWithOwner = await Vehicle.findById(vehicleId).populate('owner');
        if (!vehicleWithOwner || !vehicleWithOwner.owner || !vehicleWithOwner.owner.email) {
            throw new ApiError(400, 'Vehicle owner information not found');
        }

        // Send email with QR code
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Parking Session Details</h2>
                <p>Your parking session has been created successfully.</p>
                <p><strong>Session ID:</strong> ${parkingSession._id}</p>
                <p><strong>Vehicle:</strong> ${vehicle.licensePlate}</p>
                <p><strong>Parking Slot:</strong> ${parkingSlot.slotNumber}</p>
                <p><strong>Entry Time:</strong> ${parkingSession.entryTime}</p>
                <div style="text-align: center; margin: 20px 0;">
                    <p><strong>Your Parking QR Code:</strong></p>
                    <img src="${qrCodeUrl}" alt="Parking QR Code" style="max-width: 200px;"/>
                </div>
                <p>Please show this QR code when exiting the parking area.</p>
                <p>Note: This QR code is unique to your parking session. Do not share it with others.</p>
            </div>
        `;

        await emailService.sendEmail(
            vehicleWithOwner.owner.email, 
            'Parking Session QR Code',
            emailHtml
        );
        logger.info(`Email sent to ${vehicleWithOwner.owner.email}`);

        logger.info(`New parking session created for vehicle ${vehicleId} at slot ${parkingSlotId}`);
        
        res.status(201).json({
            success: true,
            data: parkingSession
        });
    } catch (error) {
        logger.error(`Error creating parking session: ${error.message}`);
        next(error);
    }
};


// Get all parking sessions
exports.getAllParkingSessions = async (req, res, next) => {
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

        const sessions = await ParkingSession.find(query)
            .populate('vehicle', 'licensePlate vehicleType make model')
            .populate('parkingSlot', 'slotNumber block')
            .populate('issuedBy', 'name email')
            .sort({ entryTime: -1 });

        res.status(200).json({
            success: true,
            count: sessions.length,
            data: sessions
        });
    } catch (error) {
        logger.error(`Error fetching parking sessions: ${error.message}`);
        next(error);
    }
};

// Get single parking session
exports.getParkingSession = async (req, res, next) => {
    try {
        const session = await ParkingSession.findById(req.params.id)
            .populate('vehicle', 'licensePlate vehicleType make model')
            .populate('parkingSlot', 'slotNumber block')
            .populate('issuedBy', 'name email');

        if (!session) {
            return res.status(200).json({
                success: true,
                message: 'Parking session not found'
            });
        }

        res.status(200).json({
            success: true,
            data: session
        });
    } catch (error) {
        logger.error(`Error fetching parking session: ${error.message}`);
        next(error);
    }
};

// Complete parking session
exports.completeParkingSession = async (req, res, next) => {
    try {
        const session = await ParkingSession.findById(req.params.id);
        
        if (!session) {
            throw new ApiError(404, 'Parking session not found');
        }

        if (session.status !== 'active') {
            throw new ApiError(400, 'Parking session is not active');
        }

        // Set exit time and calculate amount
        session.exitTime = new Date();
        session.amount = await session.calculateParkingFee();
        session.status = 'completed';
        
        await session.save();

        // Send completion email
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Parking Session Completed</h2>
                <p>Your parking session has been completed successfully.</p>
                <p><strong>Session ID:</strong> ${session._id}</p>
                <p><strong>Entry Time:</strong> ${session.entryTime}</p>
                <p><strong>Exit Time:</strong> ${session.exitTime}</p>
                <p><strong>Total Amount:</strong> $${session.amount}</p>
                <p>Thank you for using our parking service!</p>
            </div>
        `;

        const vehicle = await Vehicle.findById(session.vehicle).populate('owner');
        await emailService.sendEmail(
            vehicle.owner.email,
            'Parking Session Completed',
            emailHtml
        );

        logger.info(`Parking session ${session._id} completed`);

        res.status(200).json({
            success: true,
            data: session
        }); 
    } catch (error) {
        logger.error(`Error completing parking session: ${error.message}`);
        next(error);
    }
};

// Cancel parking session
exports.cancelParkingSession = async (req, res, next) => {
    try {
        const session = await ParkingSession.findById(req.params.id);
        
        if (!session) {
            throw new ApiError(404, 'Parking session not found');
        }

        if (session.status !== 'active') {
            throw new ApiError(400, 'Only active parking sessions can be cancelled');
        }

        session.status = 'cancelled';
        await session.save();

        logger.info(`Parking session ${session._id} cancelled`);

        res.status(200).json({
            success: true,
            message: 'Parking session cancelled successfully'
        });
    } catch (error) {
        logger.error(`Error cancelling parking session: ${error.message}`);
        next(error);
    }
};

// Get parking sessions by user ID
exports.getParkingSessionsByUserId = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        
        // Find sessions where either:
        // 1. The user is the issuer of the parking session
        // 2. The user is the owner of the vehicle
        const sessions = await ParkingSession.find({
            $or: [
                { issuedBy: userId },
                {
                    vehicle: {
                        $in: await Vehicle.find({ owner: userId }).distinct('_id')
                    }
                }
            ]
        })
        .populate('vehicle', 'licensePlate vehicleType make model')
        .populate('parkingSlot', 'slotNumber block')
        .populate('issuedBy', 'name email')
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: sessions.length,
            data: sessions
        });
    } catch (error) {
        logger.error(`Error fetching user parking sessions: ${error.message}`);
        next(error);
    }
};

// Get QR code for a parking session
exports.getQRCode = async (req, res, next) => {
    try {
        const session = await ParkingSession.findById(req.params.id);
        
        if (!session) {
            throw new ApiError(404, 'Parking session not found');
        }

        const qrCodeFileName = `qr-${session._id}.png`;
        const qrCodePath = path.join(__dirname, '../uploads/qrcodes', qrCodeFileName);
        
        // Check if file exists
        try {
            await fs.access(qrCodePath);
        } catch (error) {
            // If file doesn't exist, generate it
            await QRCode.toFile(qrCodePath, session.qrCode);
        }

        // Set proper content type and cache control
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        res.sendFile(qrCodePath);
    } catch (error) {
        logger.error(`Error serving QR code: ${error.message}`);
        next(error);
    }
};

// Verify QR code and handle entry/exit
exports.verifyQRCode = async (req, res, next) => {
    try {
        const { qrCode } = req.body;

        // Find parking session by QR code
        const session = await ParkingSession.findOne({ qrCode })
            .populate('vehicle', 'licensePlate vehicleType make model')
            .populate('parkingSlot', 'slotNumber block')
            .populate('issuedBy', 'name email');

        if (!session) {
            throw new ApiError(404, 'Invalid QR code or parking session not found');
        }

        if (session.status !== 'active') {
            throw new ApiError(400, 'Parking session is not active');
        }

        // Determine action automatically
        if (!session.entryTime) {
            // Mark as entry
            session.entryTime = new Date();
            logger.info(`Entry recorded for parking session ${session._id}`);
        } else if (!session.exitTime) {
            // Mark as exit
            session.exitTime = new Date();
            session.amount = await session.calculateParkingFee();
            session.status = 'completed';
            logger.info(`Exit recorded for parking session ${session._id}`);

            // Update parking slot status
            await ParkingSlot.findByIdAndUpdate(session.parkingSlot, {
                status: 'available',
                currentVehicle: null
            });

            // Send completion email
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Parking Session Completed</h2>
                    <p>Your parking session has been completed successfully.</p>
                    <p><strong>Session ID:</strong> ${session._id}</p>
                    <p><strong>Entry Time:</strong> ${session.entryTime}</p>
                    <p><strong>Exit Time:</strong> ${session.exitTime}</p>
                    <p><strong>Total Amount:</strong> $${session.amount}</p>
                    <p>Thank you for using our parking service!</p>
                </div>
            `;

            const vehicle = await Vehicle.findById(session.vehicle).populate('owner');
            await emailService.sendEmail(
                vehicle.owner.email,
                'Parking Session Completed',
                emailHtml
            );
        } else {
            // Session is already completed
            return res.status(200).json({
                success: false,
                message: 'This parking session has already been completed.',
                data: session
            });
        }

        await session.save();

        res.status(200).json({
            success: true,
            message: session.exitTime ? 'Exit recorded successfully' : 'Entry recorded successfully',
            data: session
        });
    } catch (error) {
        logger.error(`Error verifying QR code: ${error.message}`);
        next(error);
    }
};


module.exports = exports; 