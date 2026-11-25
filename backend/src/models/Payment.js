const mongoose = require('mongoose');

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

const paymentSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
      index: true
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true
    },
    receiptNo: {
      type: String,
      default: ''
    },
    memberName: {
      type: String,
      required: true
    },
    rollNo: {
      type: String,
      required: true
    },
    planName: {
      type: String,
      default: 'Membership Renewal'
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    mode: {
      type: String,
      enum: ['CASH', 'UPI'],
      required: true,
      default: 'CASH'
    },
    notes: {
      type: String,
      default: 'Membership Renewal'
    },
    paymentDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Fast member & gym queries + automatic deletion from MongoDB after 1 year
paymentSchema.index({ gymId: 1, paymentDate: -1 });
paymentSchema.index({ memberId: 1, paymentDate: -1 });
paymentSchema.index({ paymentDate: 1 }, { expireAfterSeconds: ONE_YEAR_SECONDS });

module.exports = mongoose.model('Payment', paymentSchema);
