const Gym = require('../models/Gym');
const GymPlan = require('../models/GymPlan');
const Member = require('../models/Member');
const Payment = require('../models/Payment');
const SaasPayment = require('../models/SaasPayment');
const GymLedgerEntry = require('../models/GymLedgerEntry');
const PlatformSettings = require('../models/PlatformSettings');
const AuditLog = require('../models/AuditLog');
const { getEndOfMonthDate, runRetentionCleanup } = require('../services/cleanupService');
const { getUploadAuthParams, deleteImageKitFiles } = require('../services/imagekitService');
const { generateReceiptPdf } = require('../services/pdfReceiptService');
const { sendBillingNotification } = require('../services/billingNotificationService');
const emailService = require('../services/emailService');

async function getPlatformSettingsPayload() {
  const settings = await PlatformSettings.findOne({ key: 'default' });
  const supportWhatsApp = (settings?.supportWhatsApp || process.env.PLATFORM_WHATSAPP_NUMBER || '').trim();
  return { supportWhatsApp };
}

function formatDisplayDate(date) {
  if (!date) return '';
  return new Date(date)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/ /g, '-');
}

function calcDaysLeft(targetDate) {
  if (!targetDate) return 0;
  const diff = new Date(targetDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getInitials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('') || 'GY'
  );
}

function serializeGym(g) {
  return {
    id: String(g._id),
    gymName: g.gymName,
    ownerName: g.ownerName,
    phone: g.phone,
    email: g.email || '',
    city: g.city || 'India',
    address: g.address || g.city || 'India',
    joinedDate: formatDisplayDate(g.joinedDate || g.createdAt),
    logoInitial: getInitials(g.gymName),
    saasPlan: g.saasPlan,
    validUntil: formatDisplayDate(g.validUntil),
    daysLeft: calcDaysLeft(g.validUntil),
    status: g.status
  };
}

function serializeMember(m) {
  const daysLeft = calcDaysLeft(m.expiryDate);
  const lastInteract = m.lastInteractionDate || m.updatedAt || m.createdAt;
  const daysSinceInteraction = Math.max(0, Math.floor((Date.now() - new Date(lastInteract).getTime()) / (1000 * 60 * 60 * 24)));
  const isLeastInteract = m.status === 'EXPIRED' && (daysLeft <= -3 || daysSinceInteraction >= 25 || (m.totalCheckIns || 0) <= 5);

  return {
    id: String(m._id),
    gymId: String(m.gymId),
    rollNo: m.rollNo,
    name: m.name,
    phone: m.phone,
    email: m.email || '',
    photoUrl:
      m.photoUrl ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=faces',
    admittedDate: formatDisplayDate(m.admittedDate || m.createdAt),
    shift: m.shift,
    shiftTime: '',
    planName: m.planName,
    planPrice: m.planPrice,
    expiryDate: formatDisplayDate(m.expiryDate),
    daysLeft,
    status: m.status,
    lastInteractionDate: formatDisplayDate(lastInteract),
    daysSinceInteraction,
    totalCheckIns: m.totalCheckIns || 0,
    isLeastInteract,
    lastReminderMilestone: m.lastReminderMilestone || null,
    lastReminderSentAt: m.lastReminderSentAt ? formatDisplayDate(m.lastReminderSentAt) : '',
    uniqueQrCode: m.uniqueQrCode || `GYM-${String(m.gymId).slice(-4)}-${m.rollNo}`,
    rank: m.rank || null
  };
}

function serializePlan(p) {
  return {
    id: String(p._id),
    name: p.name,
    price: p.price,
    durationDays: p.durationDays
  };
}

function serializePayment(p) {
  return {
    id: String(p._id),
    receiptNo: p.receiptNo || `RCP-${String(p._id).slice(-4).toUpperCase()}`,
    memberId: String(p.memberId),
    memberName: p.memberName,
    rollNo: p.rollNo,
    amount: p.amount,
    mode: p.mode,
    planName: p.planName || p.notes,
    date: formatDisplayDate(p.paymentDate || p.createdAt)
  };
}

function serializeSaasPayment(p) {
  return {
    id: String(p._id),
    gymId: String(p.gymId),
    gymName: p.gymName,
    ownerName: p.ownerName,
    amount: p.amount,
    mode: p.mode,
    date: formatDisplayDate(p.paymentDate || p.createdAt),
    invoiceNo: p.invoiceNo,
    notes: p.notes
  };
}

/**
 * GET /api/dashboard/bootstrap
 */
exports.getBootstrapData = async (req, res) => {
  try {
    await runRetentionCleanup();

    const platformSettings = await getPlatformSettingsPayload();

    // Unauthenticated visitors only confirm DB status without exposing tenant/member records
    if (!req.gym) {
      return res.status(200).json({
        success: true,
        authenticated: false,
        data: {
          gyms: [],
          plansByGym: {},
          membersByGym: {},
          memberStatsByGym: {},
          memberPaymentsByGym: {},
          gymLedgerByGym: {},
          saasPayments: [],
          platformSettings
        }
      });
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const isSuperAdmin = req.gym.role === 'SUPER_ADMIN';
    const gymFilter = isSuperAdmin ? { role: { $ne: 'SUPER_ADMIN' } } : { _id: req.gym._id };
    const scopedFilter = isSuperAdmin ? {} : { gymId: req.gym._id };

    const [gymDocs, planDocs, memberDocs, paymentDocs, ledgerDocs, saasDocs] = await Promise.all([
      Gym.find(gymFilter).sort({ createdAt: 1 }),
      isSuperAdmin ? Promise.resolve([]) : GymPlan.find(scopedFilter).sort({ createdAt: 1 }),
      isSuperAdmin
        ? Member.find({}).select('gymId status expiryDate')
        : Member.find(scopedFilter).sort({ createdAt: -1 }),
      isSuperAdmin
        ? Promise.resolve([])
        : Payment.find({ ...scopedFilter, paymentDate: { $gte: oneYearAgo } }).sort({ paymentDate: -1 }),
      isSuperAdmin
        ? Promise.resolve([])
        : GymLedgerEntry.find({ ...scopedFilter, paymentDate: { $gte: startOfMonth } }).sort({ paymentDate: -1 }),
      isSuperAdmin ? SaasPayment.find({ paymentDate: { $gte: oneYearAgo } }).sort({ paymentDate: -1 }) : Promise.resolve([])
    ]);

    const gyms = gymDocs.map(serializeGym);
    const plansByGym = {};
    const membersByGym = {};
    const memberStatsByGym = {};
    const memberPaymentsByGym = {};
    const gymLedgerByGym = {};

    gyms.forEach((g) => {
      plansByGym[g.id] = [];
      membersByGym[g.id] = [];
      memberStatsByGym[g.id] = { active: 0, expiring: 0, blocked: 0, total: 0 };
      memberPaymentsByGym[g.id] = [];
      gymLedgerByGym[g.id] = [];
    });

    planDocs.forEach((p) => {
      const gId = String(p.gymId);
      if (!plansByGym[gId]) plansByGym[gId] = [];
      plansByGym[gId].push(serializePlan(p));
    });

    memberDocs.forEach((m) => {
      const gId = String(m.gymId);
      if (!memberStatsByGym[gId]) {
        memberStatsByGym[gId] = { active: 0, expiring: 0, blocked: 0, total: 0 };
      }

      const daysLeft = calcDaysLeft(m.expiryDate);
      const isExpiredOrBlocked = m.status === 'EXPIRED' || daysLeft <= 0;
      memberStatsByGym[gId].total += 1;
      if (isExpiredOrBlocked) {
        memberStatsByGym[gId].blocked += 1;
      } else {
        memberStatsByGym[gId].active += 1;
        if (daysLeft <= 7) {
          memberStatsByGym[gId].expiring += 1;
        }
      }

      // Never expose individual member details to Super Admin
      if (!isSuperAdmin) {
        if (!membersByGym[gId]) membersByGym[gId] = [];
        membersByGym[gId].push(serializeMember(m));
      }
    });

    paymentDocs.forEach((p) => {
      const gId = String(p.gymId);
      if (!memberPaymentsByGym[gId]) memberPaymentsByGym[gId] = [];
      memberPaymentsByGym[gId].push(serializePayment(p));
    });

    ledgerDocs.forEach((p) => {
      const gId = String(p.gymId);
      if (!gymLedgerByGym[gId]) gymLedgerByGym[gId] = [];
      gymLedgerByGym[gId].push(serializePayment(p));
    });

    const saasPayments = saasDocs.map(serializeSaasPayment);

    return res.status(200).json({
      success: true,
      data: {
        gyms,
        plansByGym,
        membersByGym,
        memberStatsByGym,
        memberPaymentsByGym,
        gymLedgerByGym,
        saasPayments,
        platformSettings
      }
    });
  } catch (error) {
    console.error('[Bootstrap Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/dashboard/superadmin/gyms
 */
exports.createGymOwner = async (req, res) => {
  try {
    const {
      gymName,
      ownerName,
      phone,
      email,
      city,
      address,
      saasPlan = 'PRO',
      duration = '1_MONTH',
      paymentMode = 'UPI',
      password = 'admin123'
    } = req.body;

    const existing = await Gym.findOne({ phone: phone.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A gym with this phone number already exists' });
    }

    const durationMap = { '10_DAYS': 10, '1_MONTH': 30, '3_MONTHS': 90, '6_MONTHS': 180, '1_YEAR': 365 };
    const priceMap = {
      BASE: { '10_DAYS': 0, '1_MONTH': 2000, '3_MONTHS': 5000, '6_MONTHS': 10000, '1_YEAR': 18000 },
      PRO: { '10_DAYS': 0, '1_MONTH': 3000, '3_MONTHS': 8000, '6_MONTHS': 15000, '1_YEAR': 26000 }
    };

    const days = durationMap[duration] || 30;
    const amount = priceMap[saasPlan]?.[duration] ?? 2000;
    const validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const gym = await Gym.create({
      gymName: gymName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      email: (email || '').trim(),
      city: (city || 'India').trim(),
      address: (address || city || 'India').trim(),
      password,
      saasPlan,
      validUntil,
      status: 'ACTIVE',
      joinedDate: new Date()
    });

    const defaultPlans = await GymPlan.create([
      { gymId: gym._id, name: '1 Month Standard', price: 1200, durationDays: 30 },
      { gymId: gym._id, name: '3 Months Value Pack', price: 3200, durationDays: 90 }
    ]);

    const invoiceNo = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    const saasPay = await SaasPayment.create({
      gymId: gym._id,
      gymName: gym.gymName,
      ownerName: gym.ownerName,
      invoiceNo,
      amount,
      mode: paymentMode,
      notes: `New ${saasPlan} Onboarding (${duration.replace('_', ' ')})`,
      paymentDate: new Date()
    });

    return res.status(201).json({
      success: true,
      gym: serializeGym(gym),
      plans: defaultPlans.map(serializePlan),
      initialPayment: serializeSaasPayment(saasPay)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/dashboard/superadmin/gyms/:gymId/status
 */
exports.toggleGymStatus = async (req, res) => {
  try {
    const gym = await Gym.findById(req.params.gymId);
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    gym.status = gym.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    await gym.save({ validateBeforeSave: false });

    return res.status(200).json({ success: true, gym: serializeGym(gym) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/dashboard/superadmin/gyms/:gymId
 * Permanently deletes a BLOCKED gym and ALL related members, plans, payments, ledger, and SaaS billing data
 */
exports.deleteGymOwner = async (req, res) => {
  try {
    const gym = await Gym.findById(req.params.gymId);
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }

    if (gym.status !== 'BLOCKED') {
      return res.status(400).json({
        success: false,
        message: 'Only BLOCKED gyms can be permanently deleted. Block the gym first.'
      });
    }

    const memberDocsForFiles = await Member.find({ gymId: gym._id }).select('photoFileId');
    const memberFileIds = memberDocsForFiles.map((m) => m.photoFileId).filter(Boolean);

    const [membersRes, plansRes, paymentsRes, saasRes, ledgerRes] = await Promise.all([
      Member.deleteMany({ gymId: gym._id }),
      GymPlan.deleteMany({ gymId: gym._id }),
      Payment.deleteMany({ gymId: gym._id }),
      SaasPayment.deleteMany({ gymId: gym._id }),
      GymLedgerEntry.deleteMany({ gymId: gym._id }),
      memberFileIds.length > 0 ? deleteImageKitFiles(memberFileIds) : Promise.resolve()
    ]);

    await Gym.findByIdAndDelete(gym._id);

    return res.status(200).json({
      success: true,
      deletedGymId: String(gym._id),
      deletedCounts: {
        members: membersRes.deletedCount || 0,
        plans: plansRes.deletedCount || 0,
        payments: paymentsRes.deletedCount || 0,
        saasPayments: saasRes.deletedCount || 0,
        ledgerEntries: ledgerRes.deletedCount || 0
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/dashboard/superadmin/gyms/:gymId/plan
 */
exports.updateGymPlan = async (req, res) => {
  try {
    const { saasPlan, duration, amount, paymentMode } = req.body;
    const gym = await Gym.findById(req.params.gymId);
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    const durationMap = { '10_DAYS': 10, '1_MONTH': 30, '3_MONTHS': 90, '6_MONTHS': 180, '1_YEAR': 365 };
    const days = durationMap[duration] || 30;
    const nextExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    gym.saasPlan = saasPlan;
    gym.status = 'ACTIVE';
    gym.validUntil = nextExpiry;
    await gym.save({ validateBeforeSave: false });

    const invoiceNo = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    const saasPay = await SaasPayment.create({
      gymId: gym._id,
      gymName: gym.gymName,
      ownerName: gym.ownerName,
      invoiceNo,
      amount: Number(amount),
      mode: paymentMode,
      notes: `${saasPlan} Plan (${duration.replace('_', ' ')})`,
      paymentDate: new Date()
    });

    return res.status(200).json({
      success: true,
      gym: serializeGym(gym),
      payment: serializeSaasPayment(saasPay)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/dashboard/superadmin/payments
 */
exports.recordSaasPayment = async (req, res) => {
  try {
    const { gymId, amount, mode = 'UPI', notes = 'Platform Subscription Fee' } = req.body;
    const gym = await Gym.findById(gymId);
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    const invoiceNo = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    const tx = await SaasPayment.create({
      gymId: gym._id,
      gymName: gym.gymName,
      ownerName: gym.ownerName,
      invoiceNo,
      amount: Number(amount),
      mode,
      notes,
      paymentDate: new Date()
    });

    return res.status(201).json({ success: true, payment: serializeSaasPayment(tx) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/dashboard/superadmin/payments/:paymentId
 */
exports.deleteSaasPayment = async (req, res) => {
  try {
    await SaasPayment.deleteOne({ _id: req.params.paymentId });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/dashboard/gyms/:gymId/members
 */
exports.createMember = async (req, res) => {
  try {
    const { gymId } = req.params;
    const {
      name,
      rollNo,
      phone,
      email = '',
      shift = 'MORNING',
      paymentMode = 'CASH',
      planName,
      planPrice,
      planDurationDays = 30,
      photoUrl,
      photoFileId = ''
    } = req.body;
    const resolvedPaymentMode = String(paymentMode).toUpperCase() === 'UPI' ? 'UPI' : 'CASH';

    if (!String(name || '').trim() || !String(rollNo || '').trim() || !String(phone || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Member name, Roll No., and Phone number are required.'
      });
    }

    const [gymDoc, currentMemberCount] = await Promise.all([
      Gym.findById(gymId).select('saasPlan'),
      Member.countDocuments({ gymId })
    ]);
    if (!gymDoc) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }
    const memberLimit = gymDoc.saasPlan === 'PRO' ? 500 : 200;
    if (currentMemberCount >= memberLimit) {
      return res.status(403).json({
        success: false,
        code: 'MEMBER_LIMIT_REACHED',
        message: `Member limit reached (${currentMemberCount}/${memberLimit} on ${gymDoc.saasPlan} Plan). Delete expired members who have not renewed for a long time to free up space.`
      });
    }

    const resolvedPlanName = String(planName || '').trim() || '1 Month Standard';
    const resolvedPlanPrice = Number(planPrice) > 0 ? Number(planPrice) : 1200;
    const resolvedDurationDays = Number(planDurationDays) > 0 ? Number(planDurationDays) : 30;

    const existingRoll = await Member.findOne({ gymId, rollNo: rollNo.trim() }).select('_id');
    if (existingRoll) {
      return res.status(400).json({
        success: false,
        message: `Roll No. #${rollNo.trim()} already exists in this gym. Please use a different Roll No.`
      });
    }

    const expiryDate = new Date(Date.now() + resolvedDurationDays * 24 * 60 * 60 * 1000);
    const shiftTime = '';
    const now = new Date();
    const receiptNo = `RCP-${Math.floor(1000 + Math.random() * 9000)}`;

    const gym = await Gym.findById(gymId).select('gymName');
    const notif = await sendBillingNotification({
      type: 'MEMBER_WELCOME',
      phone: phone.trim(),
      email: String(email || '').trim(),
      gymName: gym?.gymName || 'GymCentric',
      memberName: name.trim(),
      rollNo: rollNo.trim(),
      planName: resolvedPlanName,
      amount: resolvedPlanPrice,
      mode: resolvedPaymentMode,
      date: formatDisplayDate(now),
      validUntil: formatDisplayDate(expiryDate),
      receiptNo,
      shift
    });

    if (!notif.success) {
      const status = notif.whatsapp?.mode === 'INVALID_PHONE' ? 400 : 502;
      return res.status(status).json({
        success: false,
        message: `Member not saved: WhatsApp notification failed (${notif.whatsapp?.error || 'Dispatch failed'}).`
      });
    }

    const member = await Member.create({
      gymId,
      rollNo: rollNo.trim(),
      name: name.trim(),
      phone: phone.trim(),
      email: String(email || '').trim(),
      photoUrl:
        photoUrl ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=faces',
      photoFileId: String(photoFileId || '').trim(),
      admittedDate: now,
      shift,
      shiftTime,
      planName: resolvedPlanName,
      planPrice: resolvedPlanPrice,
      expiryDate,
      status: 'ACTIVE',
      lastInteractionDate: now,
      totalCheckIns: 1,
      uniqueQrCode: `GYM-${gymId.slice(-4)}-${rollNo.trim()}-${Date.now()}`
    });

    const [payment, ledgerEntry] = await Promise.all([
      Payment.create({
        gymId,
        memberId: member._id,
        receiptNo,
        memberName: member.name,
        rollNo: member.rollNo,
        planName: member.planName,
        amount: resolvedPlanPrice,
        mode: resolvedPaymentMode,
        notes: member.planName,
        paymentDate: now
      }),
      GymLedgerEntry.create({
        gymId,
        memberId: member._id,
        receiptNo,
        memberName: member.name,
        rollNo: member.rollNo,
        planName: member.planName,
        amount: resolvedPlanPrice,
        mode: resolvedPaymentMode,
        paymentDate: now,
        expiresAt: getEndOfMonthDate(now)
      }),
      AuditLog.create({
        gymId,
        actorRole: req.gym?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'GYM_OWNER',
        action: 'MEMBER_CREATED',
        memberId: String(member._id),
        memberName: member.name,
        rollNo: member.rollNo,
        amount: resolvedPlanPrice,
        mode: resolvedPaymentMode,
        details: `Admitted on ${resolvedPlanName} (${resolvedDurationDays}d)`
      }).catch(() => {})
    ]);

    return res.status(201).json({
      success: true,
      member: serializeMember(member),
      payment: serializePayment(payment),
      ledgerEntry: serializePayment(ledgerEntry),
      notification: notif.whatsapp
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `Roll No. #${String(req.body?.rollNo || '').trim()} already exists in this gym. Please use a different Roll No.`
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/dashboard/gyms/:gymId/members/:memberId/status
 */
exports.toggleMemberStatus = async (req, res) => {
  try {
    const member = await Member.findOne({ _id: req.params.memberId, gymId: req.params.gymId });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    const nextStatus = member.status === 'ACTIVE' ? 'EXPIRED' : 'ACTIVE';
    let nextExpiryDate = member.expiryDate;
    if (nextStatus === 'ACTIVE' && new Date(member.expiryDate) < new Date()) {
      nextExpiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const gym = await Gym.findById(req.params.gymId).select('gymName');
    const notif = await sendBillingNotification({
      type: nextStatus === 'ACTIVE' ? 'STATUS_CHANGE_ACTIVE' : 'STATUS_CHANGE_EXPIRED',
      phone: member.phone,
      email: member.email || '',
      gymName: gym?.gymName || 'GymCentric',
      memberName: member.name,
      rollNo: member.rollNo,
      planName: member.planName,
      validUntil: formatDisplayDate(nextExpiryDate)
    });

    if (!notif.success) {
      const status = notif.whatsapp?.mode === 'INVALID_PHONE' ? 400 : 502;
      return res.status(status).json({
        success: false,
        message: `Status not updated: WhatsApp notification failed (${notif.whatsapp?.error || 'Dispatch failed'}).`
      });
    }

    member.status = nextStatus;
    if (member.status === 'ACTIVE') {
      member.lastInteractionDate = new Date();
      member.expiredAt = null;
      member.lastReminderMilestone = null;
      member.lastReminderSentAt = null;
      member.expiryDate = nextExpiryDate;
    } else {
      member.expiredAt = new Date();
    }
    await member.save();

    AuditLog.create({
      gymId: req.params.gymId,
      actorRole: req.gym?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'GYM_OWNER',
      action: 'STATUS_CHANGED',
      memberId: String(member._id),
      memberName: member.name,
      rollNo: member.rollNo,
      details: `Status changed to ${member.status}`
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      member: serializeMember(member),
      notification: notif.whatsapp
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/dashboard/gyms/:gymId/members/:memberId
 * Permanently removes a member AND all of their payment history & ledger entries from MongoDB
 */
exports.deleteMember = async (req, res) => {
  try {
    const { gymId, memberId } = req.params;
    const deleted = await Member.findOneAndDelete({ _id: memberId, gymId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    await Promise.all([
      Payment.deleteMany({ gymId, memberId }),
      GymLedgerEntry.deleteMany({ gymId, memberId }),
      deleted.photoFileId ? deleteImageKitFiles([deleted.photoFileId]) : Promise.resolve(),
      AuditLog.create({
        gymId,
        actorRole: req.gym?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'GYM_OWNER',
        action: 'MEMBER_DELETED',
        memberId: String(deleted._id),
        memberName: deleted.name,
        rollNo: deleted.rollNo,
        details: 'Member & all billing records permanently deleted'
      }).catch(() => {})
    ]);

    return res.status(200).json({ success: true, deletedMemberId: memberId });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/dashboard/gyms/:gymId/plans
 */
exports.createGymPlan = async (req, res) => {
  try {
    const { name, price, durationDays = 30 } = req.body;
    const plan = await GymPlan.create({
      gymId: req.params.gymId,
      name: name.trim(),
      price: Number(price),
      durationDays: Number(durationDays)
    });

    return res.status(201).json({ success: true, plan: serializePlan(plan) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/dashboard/gyms/:gymId/plans/:planId
 */
exports.deleteGymPlan = async (req, res) => {
  try {
    await GymPlan.deleteOne({ _id: req.params.planId, gymId: req.params.gymId });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/dashboard/gyms/:gymId/payments
 */
exports.recordMemberPayment = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { memberId, amount, mode = 'CASH', extendDays = 30, notes = 'Membership Renewal' } = req.body;

    const member = await Member.findOne({ _id: memberId, gymId });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    const now = new Date();
    const nextExpiry = new Date(Date.now() + Number(extendDays) * 24 * 60 * 60 * 1000);
    const receiptNo = `RCP-${Math.floor(1000 + Math.random() * 9000)}`;

    const gym = await Gym.findById(gymId).select('gymName');
    const notif = await sendBillingNotification({
      type: 'MEMBER',
      phone: member.phone,
      email: member.email || '',
      gymName: gym?.gymName || 'GymCentric',
      memberName: member.name,
      rollNo: member.rollNo,
      planName: notes,
      amount: Number(amount),
      mode,
      date: formatDisplayDate(now),
      validUntil: formatDisplayDate(nextExpiry),
      receiptNo
    });

    if (!notif.success) {
      const status = notif.whatsapp?.mode === 'INVALID_PHONE' ? 400 : 502;
      return res.status(status).json({
        success: false,
        message: `Payment not saved: WhatsApp notification failed (${notif.whatsapp?.error || 'Dispatch failed'}).`
      });
    }

    member.status = 'ACTIVE';
    member.expiredAt = null;
    member.lastReminderMilestone = null;
    member.lastReminderSentAt = null;
    member.planName = notes;
    member.planPrice = Number(amount);
    member.expiryDate = nextExpiry;
    member.lastInteractionDate = now;
    member.totalCheckIns = (member.totalCheckIns || 0) + 1;
    await member.save();

    const [payment, ledgerEntry] = await Promise.all([
      Payment.create({
        gymId,
        memberId: member._id,
        receiptNo,
        memberName: member.name,
        rollNo: member.rollNo,
        planName: notes,
        amount: Number(amount),
        mode,
        notes,
        paymentDate: now
      }),
      GymLedgerEntry.create({
        gymId,
        memberId: member._id,
        receiptNo,
        memberName: member.name,
        rollNo: member.rollNo,
        planName: notes,
        amount: Number(amount),
        mode,
        paymentDate: now,
        expiresAt: getEndOfMonthDate(now)
      }),
      AuditLog.create({
        gymId,
        actorRole: req.gym?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'GYM_OWNER',
        action: 'PAYMENT_RECORDED',
        memberId: String(member._id),
        memberName: member.name,
        rollNo: member.rollNo,
        amount: Number(amount),
        mode,
        details: `Receipt #${receiptNo} • ${notes} (+${extendDays}d)`
      }).catch(() => {})
    ]);

    return res.status(201).json({
      success: true,
      member: serializeMember(member),
      payment: serializePayment(payment),
      ledgerEntry: serializePayment(ledgerEntry),
      notification: notif.whatsapp
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/dashboard/superadmin/settings
 */
exports.updatePlatformSettings = async (req, res) => {
  try {
    const rawPhone = String(req.body?.supportWhatsApp || '').trim();
    const digits = rawPhone.replace(/\D/g, '');
    if (rawPhone && digits.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid WhatsApp phone number (at least 10 digits with country code if outside India).'
      });
    }

    const updated = await PlatformSettings.findOneAndUpdate(
      { key: 'default' },
      { key: 'default', supportWhatsApp: rawPhone },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      platformSettings: {
        supportWhatsApp: updated.supportWhatsApp || ''
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/dashboard/gyms/:gymId/members/:memberId/reminder
 */
exports.markMemberReminderSent = async (req, res) => {
  try {
    const { gymId, memberId } = req.params;
    const milestone = String(req.body?.milestone || '').toUpperCase();
    if (!['3D', '2D', '1D', 'EXPIRED'].includes(milestone)) {
      return res.status(400).json({ success: false, message: 'Invalid reminder milestone' });
    }

    const member = await Member.findOneAndUpdate(
      { _id: memberId, gymId },
      { lastReminderMilestone: milestone, lastReminderSentAt: new Date() },
      { new: true }
    );
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    return res.status(200).json({ success: true, member: serializeMember(member) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/dashboard/gyms/:gymId/imagekit-auth
 */
exports.getImageKitAuth = async (req, res) => {
  try {
    const auth = getUploadAuthParams();
    return res.status(200).json({ success: true, ...auth });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/dashboard/gyms/:gymId/check-in
 */
exports.recordMemberCheckIn = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { qrCode = '', memberId = '', rollNo = '' } = req.body || {};

    let member = null;
    if (memberId) {
      member = await Member.findOne({ _id: memberId, gymId });
    }
    if (!member && qrCode) {
      const cleanQr = String(qrCode).trim();
      member = await Member.findOne({ gymId, uniqueQrCode: cleanQr });
      if (!member && cleanQr.toUpperCase().startsWith('GYM-')) {
        const parts = cleanQr.split('-');
        const extractedRoll = parts[2] || '';
        if (extractedRoll) {
          member = await Member.findOne({ gymId, rollNo: extractedRoll });
        }
      }
    }
    if (!member && rollNo) {
      member = await Member.findOne({ gymId, rollNo: String(rollNo).trim() });
    }
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member QR pass not found in this gym.' });
    }

    const daysLeft = calcDaysLeft(member.expiryDate);
    const isExpired = member.status === 'EXPIRED' || daysLeft <= 0;

    if (isExpired) {
      if (member.status !== 'EXPIRED') {
        member.status = 'EXPIRED';
        await member.save();
      }
      return res.status(200).json({
        success: true,
        access: 'DENIED',
        member: serializeMember(member)
      });
    }

    member.totalCheckIns = (member.totalCheckIns || 0) + 1;
    member.lastInteractionDate = new Date();
    await member.save();

    return res.status(200).json({
      success: true,
      access: 'GRANTED',
      member: serializeMember(member)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/dashboard/gyms/:gymId/payments/:paymentId/receipt-pdf
 * Downloads a PDF receipt for a specific payment.
 */
exports.downloadReceiptPdf = async (req, res) => {
  try {
    const { gymId, paymentId } = req.params;

    const payment = await Payment.findOne({ _id: paymentId, gymId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const [member, gym] = await Promise.all([
      Member.findById(payment.memberId),
      Gym.findById(gymId).select('gymName')
    ]);

    const receiptData = {
      receiptNo: payment.receiptNo || `RCP-${String(payment._id).slice(-4).toUpperCase()}`,
      gymName: gym?.gymName || 'GymCentric',
      memberName: payment.memberName,
      rollNo: payment.rollNo,
      phone: member?.phone || '',
      planName: payment.planName || payment.notes || 'Membership Fee',
      amount: payment.amount,
      mode: payment.mode,
      date: formatDisplayDate(payment.paymentDate || payment.createdAt),
      shift: member?.shift || '',
      validUntil: member ? formatDisplayDate(member.expiryDate) : '',
      type: 'MEMBER'
    };

    const pdfBuffer = await generateReceiptPdf(receiptData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Receipt-${receiptData.receiptNo}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('[Receipt PDF Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/dashboard/gyms/:gymId/receipt-pdf
 * Generates a PDF receipt from request body data (for receipts not yet saved / frontend-only flows).
 */
exports.generateReceiptPdfFromBody = async (req, res) => {
  try {
    const {
      receiptNo,
      gymName,
      gymId,
      ownerName,
      memberName,
      rollNo,
      phone,
      planName,
      amount,
      mode,
      date,
      shift,
      validUntil,
      type
    } = req.body;

    if (!receiptNo || !memberName || !amount) {
      return res.status(400).json({
        success: false,
        message: 'receiptNo, memberName, and amount are required.'
      });
    }

    const pdfBuffer = await generateReceiptPdf({
      receiptNo,
      gymName: gymName || 'GymCentric',
      gymId: gymId || '',
      ownerName: ownerName || memberName,
      memberName,
      rollNo: rollNo || '',
      phone: phone || '',
      planName: planName || 'Membership Fee',
      amount: Number(amount),
      mode: mode || 'CASH',
      date: date || formatDisplayDate(new Date()),
      shift: shift || '',
      validUntil: validUntil || '',
      type: type || 'MEMBER'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Receipt-${receiptNo}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('[Receipt PDF Generate Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/dashboard/gyms/:gymId/members/:memberId
 * Update member profile details (name, phone, optional email, shift, photo) without deleting/recreating
 */
exports.updateMember = async (req, res) => {
  try {
    const { gymId, memberId } = req.params;
    const { name, phone, email, shift, photoUrl, photoFileId } = req.body || {};

    const member = await Member.findOne({ _id: memberId, gymId });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    if (name !== undefined && String(name).trim()) {
      member.name = String(name).trim();
    }
    if (phone !== undefined && String(phone).trim()) {
      member.phone = String(phone).trim();
    }
    if (email !== undefined) {
      member.email = String(email || '').trim();
    }
    if (shift && ['MORNING', 'EVENING'].includes(String(shift).toUpperCase())) {
      member.shift = String(shift).toUpperCase();
    }
    if (photoUrl !== undefined && String(photoUrl).trim()) {
      member.photoUrl = String(photoUrl).trim();
    }
    if (photoFileId !== undefined) {
      member.photoFileId = String(photoFileId || '').trim();
    }

    await member.save();

    AuditLog.create({
      gymId,
      actorRole: req.gym?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'GYM_OWNER',
      action: 'MEMBER_UPDATED',
      memberId: String(member._id),
      memberName: member.name,
      rollNo: member.rollNo,
      details: `Updated profile (Shift: ${member.shift}${member.email ? `, Email: ${member.email}` : ''})`
    }).catch(() => {});

    return res.status(200).json({ success: true, member: serializeMember(member) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/dashboard/gyms/:gymId/audit-logs
 * Returns recent tamper-proof billing & member activity logs for this gym
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const { gymId } = req.params;
    const logs = await AuditLog.find({ gymId }).sort({ createdAt: -1 }).limit(100);
    return res.status(200).json({
      success: true,
      logs: logs.map((l) => ({
        id: String(l._id),
        actorRole: l.actorRole,
        action: l.action,
        memberId: l.memberId,
        memberName: l.memberName,
        rollNo: l.rollNo,
        amount: l.amount,
        mode: l.mode,
        details: l.details,
        createdAt: l.createdAt
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/dashboard/gyms/:gymId/send-receipt-email
 * Sends a PDF receipt directly to the specified email address
 */
exports.sendReceiptEmail = async (req, res) => {
  try {
    const {
      email,
      receiptNo,
      gymName,
      gymId,
      ownerName,
      memberName,
      rollNo,
      phone,
      planName,
      amount,
      mode,
      date,
      shift,
      validUntil,
      type
    } = req.body || {};

    const cleanEmail = String(email || '').trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid member email address is required.' });
    }
    if (!receiptNo || !memberName) {
      return res.status(400).json({ success: false, message: 'receiptNo and memberName are required.' });
    }

    const pdfBuffer = await generateReceiptPdf({
      receiptNo,
      gymName: gymName || 'GymCentric',
      gymId: gymId || '',
      ownerName: ownerName || memberName,
      memberName,
      rollNo: rollNo || '',
      phone: phone || '',
      planName: planName || 'Membership Fee',
      amount: Number(amount || 0),
      mode: mode || 'CASH',
      date: date || formatDisplayDate(new Date()),
      shift: shift || '',
      validUntil: validUntil || '',
      type: type || 'MEMBER'
    });

    const filename = `Receipt-${receiptNo}.pdf`;
    const result = await emailService.sendReceiptEmail(
      cleanEmail,
      {
        gymName: gymName || 'GymCentric',
        memberName,
        receiptNo,
        amount: Number(amount || 0),
        mode: mode || 'CASH',
        type: type || 'MEMBER'
      },
      pdfBuffer,
      filename
    );

    if (!result.success) {
      return res.status(502).json({
        success: false,
        message: result.error || 'Failed to send email receipt.'
      });
    }

    return res.status(200).json({
      success: true,
      mode: result.mode,
      message: `PDF receipt #${receiptNo} sent to ${cleanEmail}.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
