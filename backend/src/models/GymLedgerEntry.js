const mongoose = require('mongoose');

// Monthly Gym Fee Ledger: retained for current month (auto-deleted after 1 month)
const gymLedgerEntrySchema = new mongoose.Schema(
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
    paymentDate: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

gymLedgerEntrySchema.index({ gymId: 1, paymentDate: -1 });
// MongoDB TTL index deletes entry at expiresAt (end of month)
gymLedgerEntrySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('GymLedgerEntry', gymLedgerEntrySchema);
