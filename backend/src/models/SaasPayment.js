const mongoose = require('mongoose');

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

const saasPaymentSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
      index: true
    },
    gymName: {
      type: String,
      required: true
    },
    ownerName: {
      type: String,
      required: true
    },
    invoiceNo: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    mode: {
      type: String,
      enum: ['UPI', 'CASH'],
      required: true,
      default: 'UPI'
    },
    notes: {
      type: String,
      default: 'Platform Subscription Fee'
    },
    paymentDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Fast gym queries + automatic deletion from MongoDB after 1 year
saasPaymentSchema.index({ gymId: 1, paymentDate: -1 });
saasPaymentSchema.index({ paymentDate: 1 }, { expireAfterSeconds: ONE_YEAR_SECONDS });

module.exports = mongoose.model('SaasPayment', saasPaymentSchema);
