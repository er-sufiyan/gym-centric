const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const gymSchema = new mongoose.Schema(
  {
    gymName: {
      type: String,
      required: [true, 'Gym Name is required'],
      trim: true
    },
    logoUrl: {
      type: String,
      default: ''
    },
    ownerName: {
      type: String,
      required: [true, 'Owner Name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true
    },
    email: {
      type: String,
      default: '',
      trim: true
    },
    city: {
      type: String,
      default: 'India',
      trim: true
    },
    address: {
      type: String,
      default: '',
      trim: true
    },
    joinedDate: {
      type: Date,
      default: Date.now
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: ['GYM_OWNER', 'SUPER_ADMIN'],
      default: 'GYM_OWNER'
    },

    // Platform Subscription (Managed by Super Admin)
    saasPlan: {
      type: String,
      enum: ['BASE', 'PRO'],
      default: 'BASE'
    },
    validUntil: {
      type: Date,
      default: () => new Date(+new Date() + 30 * 24 * 60 * 60 * 1000)
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'BLOCKED'],
      default: 'ACTIVE'
    },

    // WhatsApp / Phone OTP 2-Factor Verification
    otp: {
      type: String,
      select: false
    },
    otpExpiry: {
      type: Date,
      select: false
    }
  },
  { timestamps: true }
);

gymSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

gymSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

gymSchema.methods.isSubscriptionActive = function () {
  if (this.status === 'BLOCKED') return false;
  if (!this.validUntil) return false;
  return new Date(this.validUntil) >= new Date();
};

module.exports = mongoose.model('Gym', gymSchema);
