const mongoose = require('mongoose');
const ParkingSlot = require('./ParkingSlot');

const blockSchema = new mongoose.Schema({
    blockName: {
        type: String,
        required: [true, 'Block name is required'],
        unique: true,
        trim: true,
        uppercase: true
    },
    blockDescription: {
        type: String,
        trim: true
    },
    floor: {
        type: Number,
        required: [true, 'Floor number is required'],
        min: [0, 'Floor number cannot be negative']
    },
    totalSlots: {
        type: Number,
        required: [true, 'Total number of slots is required'],
        min: [3, 'Block must have at least three slots to accommodate all rate types']
    },
    vehicleTypes: {
        car: {
            type: Number,
            default: 0
        },
        truck: {
            type: Number,
            default: 0
        },
        bike: {
            type: Number,
            default: 0
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Pre-save middleware to create parking slots
blockSchema.pre('save', async function(next) {
    if (this.isNew) {
        try {
            const slots = [];
            
            // Calculate the number of slots for each category
            const vvipSlots = Math.floor(this.totalSlots / 3);
            const vipSlots = Math.floor(this.totalSlots / 3);
            const normalSlots = this.totalSlots - vvipSlots - vipSlots;
            
            let slotCounter = 1;
            
            // Create VVIP slots (first third)
            for (let i = 0; i < vvipSlots; i++) {
                // Determine vehicle type based on distribution
                let vehicleType = 'car';
                if (i < this.vehicleTypes.truck) {
                    vehicleType = 'truck';
                } else if (i < this.vehicleTypes.truck + this.vehicleTypes.bike) {
                    vehicleType = 'bike';
                }
                
                slots.push({
                    slotNumber: `${this.blockName}-${slotCounter}`,
                    block: this._id,
                    floor: this.floor,
                    rateType: 'VVIP',
                    type: 'vip', // Using VIP slot type for VVIP rate
                    vehicleType: vehicleType
                });
                slotCounter++;
            }
            
            // Create VIP slots (second third)
            for (let i = 0; i < vipSlots; i++) {
                // Determine vehicle type based on distribution
                let vehicleType = 'car';
                if (i < this.vehicleTypes.truck) {
                    vehicleType = 'truck';
                } else if (i < this.vehicleTypes.truck + this.vehicleTypes.bike) {
                    vehicleType = 'bike';
                }
                
                slots.push({
                    slotNumber: `${this.blockName}-${slotCounter}`,
                    block: this._id,
                    floor: this.floor,
                    rateType: 'VIP',
                    type: 'vip',
                    vehicleType: vehicleType
                });
                slotCounter++;
            }
            
            // Create NORMAL slots (final third)
            for (let i = 0; i < normalSlots; i++) {
                // Determine vehicle type based on distribution
                let vehicleType = 'car';
                if (i < this.vehicleTypes.truck) {
                    vehicleType = 'truck';
                } else if (i < this.vehicleTypes.truck + this.vehicleTypes.bike) {
                    vehicleType = 'bike';
                }
                
                slots.push({
                    slotNumber: `${this.blockName}-${slotCounter}`,
                    block: this._id,
                    floor: this.floor,
                    rateType: 'NORMAL',
                    type: 'standard',
                    vehicleType: vehicleType
                });
                slotCounter++;
            }
            
            // Create all slots in bulk
            await ParkingSlot.insertMany(slots);
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// Add validation for minimum slots
blockSchema.path('totalSlots').validate(function(value) {
    return value >= 3;
}, 'Block must have at least 3 slots to accommodate all rate types');

const Block = mongoose.model('Block', blockSchema);
module.exports = Block; 