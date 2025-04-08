const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    licensePlate: {
        type: String,
        required: [true, 'License plate is required'],
        unique: true,
        trim: true,
        uppercase: true,
        validate: {
            validator: function(v) {
                return /^[A-Z]{2}\s\d{2}\s[A-Z]\s\d{4}$/.test(v);
            },
            message: 'License plate must follow the format: XX 88 X 1224'
        }
    },
    vehicleType: {
        type: String,
        enum: ['car', 'motorcycle', 'truck', 'electric'],
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    make: {
        type: String,
        required: [true, 'Vehicle make is required'], 
        trim: true
    },
    model: {
        type: String,
        trim: true 
    },
    color: {
        type: String,
        trim: true
    },
    isRegular: {
        type: Boolean,
        default: false
    }, 
    preferredBlock: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Block'
    },
    registrationExpiry: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
vehicleSchema.index({ licensePlate: 1 });
vehicleSchema.index({ owner: 1 });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
module.exports = Vehicle; 