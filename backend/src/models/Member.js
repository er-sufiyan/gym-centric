const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
      index: true
    },
    rollNo: {
      type: String,
      required: [true, 'Roll number is required'],
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Member name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Member phone number is required'],
      trim: true
    },
    photoUrl: {
      type: String,
      default: ''
    },
    admittedDate: {
      type: Date,
      default: Date.now
    },
    shift: {
      type: String,
      enum: ['MORNING', 'EVENING'],
      required: [true, 'Shift slot is required']
    },
    shiftTime: {
      type: String,
      default: ''
    },
    planName: {
      type: String,
      required: true
    },
    planPrice: {
      type: Number,
      required: true
    },
    expiryDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED'],
      default: 'ACTIVE'
    },
    lastInteractionDate: {
      type: Date,
      default: Date.now
    },
    totalCheckIns: {
      type: Number,
      default: 0
    },
    rank: {
      type: Number,
      default: null
    },
    uniqueQrCode: {
      type: String,
      unique: true,
      index: true
    }
  },
  { timestamps: true }
);

// Members are retained permanently until explicitly deleted by the Gym Owner
memberSchema.index({ gymId: 1, rollNo: 1 }, { unique: true });

module.exports = mongoose.model('Member', memberSchema);
