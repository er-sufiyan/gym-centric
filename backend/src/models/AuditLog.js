const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
      index: true
    },
    actorRole: {
      type: String,
      enum: ['GYM_OWNER', 'SUPER_ADMIN'],
      default: 'GYM_OWNER'
    },
    action: {
      type: String,
      enum: [
        'MEMBER_CREATED',
        'MEMBER_UPDATED',
        'MEMBER_DELETED',
        'PAYMENT_RECORDED',
        'STATUS_CHANGED'
      ],
      required: true
    },
    memberId: {
      type: String,
      default: ''
    },
    memberName: {
      type: String,
      default: ''
    },
    rollNo: {
      type: String,
      default: ''
    },
    amount: {
      type: Number,
      default: null
    },
    mode: {
      type: String,
      default: ''
    },
    details: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

auditLogSchema.index({ gymId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
