const mongoose = require('mongoose');

const parkingRateSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['VVIP', 'VIP', 'NORMAL'],
        required: true
    },
    vehicleType: {
        type: String,
        enum: ['car', 'bike', 'truck'], // Changed 'motorcycle' to 'bike' to match frontend
        required: true,
        default: 'car'
    },
    hourlyRate: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
parkingRateSchema.index({ type: 1, isActive: 1 });
parkingRateSchema.index({ vehicleType: 1, type: 1 });

const ParkingRate = mongoose.model('ParkingRate', parkingRateSchema);
module.exports = ParkingRate;