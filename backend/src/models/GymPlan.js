const mongoose = require('mongoose');

const gymPlanSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0
    },
    durationDays: {
      type: Number,
      required: [true, 'Duration in days is required'],
      default: 30
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('GymPlan', gymPlanSchema);
