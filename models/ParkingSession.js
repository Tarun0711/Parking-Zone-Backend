const mongoose = require('mongoose');
const crypto = require('crypto');

const parkingSessionSchema = new mongoose.Schema({
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
    qrCode: {
        type: String,
        required: true,
        unique: true
    },
    bookingTime: {
        type: Date,
        default: Date.now
    },
    entryTime: {
        type: Date
    },
    exitTime: {
        type: Date
    },
    status: { 
        type: String,
        enum: ['active', 'completed', 'expired', 'cancelled'],
        default: 'active'
    }, 
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    amount: {
        type: Number,
        default: 0
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'upi', 'wallet'],
        default: 'cash'
    },
    transactionId: {
        type: String
    },
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Method to generate unique QR code for parking session
parkingSessionSchema.methods.generateQRCode = function() {
    const uniqueString = `${this._id}-${Date.now()}-${Math.random()}`;
    return crypto.createHash('sha256').update(uniqueString).digest('hex').substring(0, 16);
};

// Method to calculate parking fee
parkingSessionSchema.methods.calculateParkingFee = async function() {
    try {
        const ParkingRate = mongoose.model('ParkingRate');
        const ParkingSlot = mongoose.model('ParkingSlot');

        // Get the parking slot details
        const slot = await ParkingSlot.findById(this.parkingSlot);
        if (!slot) {
            throw new Error('Parking slot not found');
        }

        // Get the applicable rate
        const rate = await ParkingRate.findOne({
            type: slot.rateType,
            isActive: true
        });
        if (!rate) {
            throw new Error(`No active rate found for ${slot.rateType}`);
        }

        const entryTime = this.entryTime || new Date();
        const exitTime = this.exitTime || new Date();
        const durationInHours = Math.max(1, Math.ceil((exitTime - entryTime) / (1000 * 60 * 60)));
        
        // Ensure we return a valid number
        const amount = durationInHours * (rate.hourlyRate || 0);
        return isNaN(amount) ? 0 : amount;
    } catch (error) {
        console.error('Error calculating parking fee:', error);
        return 0; // Return 0 as fallback
    }
};

// Pre-save middleware
parkingSessionSchema.pre('save', async function(next) {
    try {
        // Generate QR code if not exists
        if (!this.qrCode) {
            this.qrCode = this.generateQRCode();
        }

        // Update parking slot status
        if (this.isNew) {
            const ParkingSlot = mongoose.model('ParkingSlot');
            await ParkingSlot.findByIdAndUpdate(this.parkingSlot, {
                status: 'occupied',
                currentVehicle: this.vehicle,
                lastOccupied: new Date()
            });
        }

        // Calculate amount if session is completed
        if (this.status === 'completed' && !this.amount) {
            this.amount = this.calculateParkingFee();
        }

        next();
    } catch (error) {
        next(error);
    }
});

// Post-save middleware to handle session completion
parkingSessionSchema.post('save', async function(doc) {
    if (doc.status === 'completed' || doc.status === 'cancelled') {
        const ParkingSlot = mongoose.model('ParkingSlot');
        await ParkingSlot.findByIdAndUpdate(doc.parkingSlot, {
            status: 'available',
            currentVehicle: null
        });
    }
});

// Indexes for efficient querying
parkingSessionSchema.index({ vehicle: 1, status: 1 });
parkingSessionSchema.index({ parkingSlot: 1, status: 1 });
parkingSessionSchema.index({ qrCode: 1 });

const ParkingSession = mongoose.model('ParkingSession', parkingSessionSchema);
module.exports = ParkingSession; 