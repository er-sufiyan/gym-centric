const cron = require('node-cron');
const Member = require('../models/Member');
const Payment = require('../models/Payment');
const SaasPayment = require('../models/SaasPayment');
const GymLedgerEntry = require('../models/GymLedgerEntry');
const { deleteImageKitFiles } = require('./imagekitService');

function getEndOfMonthDate(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
}

function getStartOfMonthDate(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

async function runRetentionCleanup() {
  try {
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const startOfCurrentMonth = getStartOfMonthDate(now);

    // Sync any members whose expiryDate has already passed to EXPIRED
    await Member.updateMany(
      { status: 'ACTIVE', expiryDate: { $lt: now } },
      { $set: { status: 'EXPIRED' } }
    );

    // Find expired members who have not renewed for 3+ months
    const expiredMembersToPurge = await Member.find({
      $or: [
        { expiryDate: { $lt: threeMonthsAgo } },
        { status: 'EXPIRED', expiredAt: { $ne: null, $lt: threeMonthsAgo } }
      ]
    }).select('_id photoFileId');

    const expiredMemberIds = expiredMembersToPurge.map((m) => m._id);
    const expiredFileIds = expiredMembersToPurge.map((m) => m.photoFileId).filter(Boolean);

    const [
      deletedMemberPayments,
      deletedSaasPayments,
      deletedLedger,
      deletedExpiredMembers,
      deletedExpiredPayments,
      deletedExpiredLedger
    ] = await Promise.all([
      Payment.deleteMany({ paymentDate: { $lt: oneYearAgo } }),
      SaasPayment.deleteMany({ paymentDate: { $lt: oneYearAgo } }),
      GymLedgerEntry.deleteMany({ paymentDate: { $lt: startOfCurrentMonth } }),
      expiredMemberIds.length > 0
        ? Member.deleteMany({ _id: { $in: expiredMemberIds } })
        : Promise.resolve({ deletedCount: 0 }),
      expiredMemberIds.length > 0
        ? Payment.deleteMany({ memberId: { $in: expiredMemberIds } })
        : Promise.resolve({ deletedCount: 0 }),
      expiredMemberIds.length > 0
        ? GymLedgerEntry.deleteMany({ memberId: { $in: expiredMemberIds } })
        : Promise.resolve({ deletedCount: 0 }),
      expiredFileIds.length > 0 ? deleteImageKitFiles(expiredFileIds) : Promise.resolve()
    ]);

    if (
      deletedMemberPayments.deletedCount ||
      deletedSaasPayments.deletedCount ||
      deletedLedger.deletedCount ||
      deletedExpiredMembers.deletedCount
    ) {
      console.log(
        `[Retention Cleanup] Removed: ${deletedMemberPayments.deletedCount} member payments (>1yr), ` +
          `${deletedSaasPayments.deletedCount} SaaS payments (>1yr), ` +
          `${deletedLedger.deletedCount} monthly ledger entries (previous month), ` +
          `${deletedExpiredMembers.deletedCount} unrenewed expired members (>3mo, +${deletedExpiredPayments.deletedCount} payments, +${deletedExpiredLedger.deletedCount} ledger)`
      );
    }
  } catch (err) {
    console.error('[Retention Cleanup Error]:', err.message);
  }
}

function startCleanupCron() {
  // Run daily at 00:10 AM
  cron.schedule('10 0 * * *', () => {
    runRetentionCleanup();
  });
}

module.exports = {
  getEndOfMonthDate,
  getStartOfMonthDate,
  runRetentionCleanup,
  startCleanupCron
};
