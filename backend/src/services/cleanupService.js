const cron = require('node-cron');
const Member = require('../models/Member');
const Payment = require('../models/Payment');
const SaasPayment = require('../models/SaasPayment');
const GymLedgerEntry = require('../models/GymLedgerEntry');

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

    const startOfCurrentMonth = getStartOfMonthDate(now);

    // Sync any members whose expiryDate has already passed to EXPIRED (members are NOT auto-deleted)
    await Member.updateMany(
      { status: 'ACTIVE', expiryDate: { $lt: now } },
      { $set: { status: 'EXPIRED' } }
    );

    const [deletedMemberPayments, deletedSaasPayments, deletedLedger] = await Promise.all([
      Payment.deleteMany({ paymentDate: { $lt: oneYearAgo } }),
      SaasPayment.deleteMany({ paymentDate: { $lt: oneYearAgo } }),
      GymLedgerEntry.deleteMany({ paymentDate: { $lt: startOfCurrentMonth } })
    ]);

    if (
      deletedMemberPayments.deletedCount ||
      deletedSaasPayments.deletedCount ||
      deletedLedger.deletedCount
    ) {
      console.log(
        `[Retention Cleanup] Removed: ${deletedMemberPayments.deletedCount} member payments (>1yr), ` +
          `${deletedSaasPayments.deletedCount} SaaS payments (>1yr), ` +
          `${deletedLedger.deletedCount} monthly ledger entries (previous month)`
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
