const mongoose = require('mongoose');

const parkingRequestSchema = new mongoose.Schema({
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    parkingSlot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ParkingSlot',
        required: true
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'expired'],
        default: 'pending'
    },
    requestTime: {
        type: Date,
        default: Date.now
    },
    responseTime: {
        type: Date
    },
    respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reason: {
        type: String
    },
    parkingSession: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ParkingSession'
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
parkingRequestSchema.index({ requestedBy: 1, status: 1 });
parkingRequestSchema.index({ parkingSlot: 1, status: 1 });
parkingRequestSchema.index({ status: 1 });

// Pre-save middleware to handle request expiration
parkingRequestSchema.pre('save', async function(next) {
    // If request is pending and older than 24 hours, mark as expired
    if (this.status === 'pending' && this.isModified('status') === false) {
        const requestAge = Date.now() - this.requestTime.getTime();
        const hoursOld = requestAge / (1000 * 60 * 60);
        
        if (hoursOld > 24) {
            this.status = 'expired';
        }
    }
    
    // If status is changed to approved or rejected, set response time
    if (this.isModified('status') && 
        (this.status === 'approved' || this.status === 'rejected')) {
        this.responseTime = new Date();
    }
    
    next();
});

const ParkingRequest = mongoose.model('ParkingRequest', parkingRequestSchema);
module.exports = ParkingRequest; 