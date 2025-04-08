const mongoose = require('mongoose');

const parkingSlotSchema = new mongoose.Schema({
    slotNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    block: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Block',
        required: true
    },
    floor: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['standard', 'handicapped', 'vip', 'electric'],
        default: 'standard'
    },
    vehicleType: {
        type: String,
        enum: ['car', 'truck', 'bike'],
        default: 'car'
    },
    rateType: {
        type: String,
        enum: ['VVIP', 'VIP', 'NORMAL'],
        default: 'NORMAL'
    },
    status: { 
        type: String,
        enum: ['available', 'occupied', 'reserved', 'maintenance'],
        default: 'available'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    currentVehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        default: null
    },
    lastOccupied: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for efficient querying
parkingSlotSchema.index({ block: 1, slotNumber: 1 });
parkingSlotSchema.index({ status: 1 });
parkingSlotSchema.index({ rateType: 1 });
parkingSlotSchema.index({ vehicleType: 1 });

const ParkingSlot = mongoose.model('ParkingSlot', parkingSlotSchema);
module.exports = ParkingSlot; 