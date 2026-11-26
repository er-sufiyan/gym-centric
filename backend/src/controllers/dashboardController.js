const Gym = require('../models/Gym');
const GymPlan = require('../models/GymPlan');
const Member = require('../models/Member');
const Payment = require('../models/Payment');
const SaasPayment = require('../models/SaasPayment');
const GymLedgerEntry = require('../models/GymLedgerEntry');
const PlatformSettings = require('../models/PlatformSettings');
const { getEndOfMonthDate, runRetentionCleanup } = require('../services/cleanupService');
const { getUploadAuthParams, deleteImageKitFiles } = require('../services/imagekitService');

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
    photoUrl:
      m.photoUrl ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=faces',
    admittedDate: formatDisplayDate(m.admittedDate || m.createdAt),
    shift: m.shift,
    shiftTime: m.shiftTime || (m.shift === 'MORNING' ? '06:30 AM – 08:00 AM' : '06:00 PM – 07:30 PM'),
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

    const durationMap = { '1_MONTH': 30, '3_MONTHS': 90, '6_MONTHS': 180, '1_YEAR': 365 };
    const priceMap = {
      BASE: { '1_MONTH': 3000, '3_MONTHS': 8000, '6_MONTHS': 15000, '1_YEAR': 26000 },
      PRO: { '1_MONTH': 5000, '3_MONTHS': 12500, '6_MONTHS': 22000, '1_YEAR': 35000 }
    };

    const days = durationMap[duration] || 30;
    const amount = priceMap[saasPlan]?.[duration] || 3000;
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

    const durationMap = { '1_MONTH': 30, '3_MONTHS': 90, '6_MONTHS': 180, '1_YEAR': 365 };
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
      shift = 'MORNING',
      planName,
      planPrice,
      planDurationDays = 30,
      photoUrl,
      photoFileId = ''
    } = req.body;

    const expiryDate = new Date(Date.now() + Number(planDurationDays) * 24 * 60 * 60 * 1000);
    const shiftTime = shift === 'MORNING' ? '06:30 AM – 08:00 AM' : '06:00 PM – 07:30 PM';
    const now = new Date();

    const member = await Member.create({
      gymId,
      rollNo: rollNo.trim(),
      name: name.trim(),
      phone: phone.trim(),
      photoUrl:
        photoUrl ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=faces',
      photoFileId: String(photoFileId || '').trim(),
      admittedDate: now,
      shift,
      shiftTime,
      planName,
      planPrice: Number(planPrice),
      expiryDate,
      status: 'ACTIVE',
      lastInteractionDate: now,
      totalCheckIns: 1,
      uniqueQrCode: `GYM-${gymId.slice(-4)}-${rollNo.trim()}-${Date.now()}`
    });

    const receiptNo = `RCP-${Math.floor(1000 + Math.random() * 9000)}`;
    const [payment, ledgerEntry] = await Promise.all([
      Payment.create({
        gymId,
        memberId: member._id,
        receiptNo,
        memberName: member.name,
        rollNo: member.rollNo,
        planName: member.planName,
        amount: Number(planPrice),
        mode: 'CASH',
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
        amount: Number(planPrice),
        mode: 'CASH',
        paymentDate: now,
        expiresAt: getEndOfMonthDate(now)
      })
    ]);

    return res.status(201).json({
      success: true,
      member: serializeMember(member),
      payment: serializePayment(payment),
      ledgerEntry: serializePayment(ledgerEntry)
    });
  } catch (error) {
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

    member.status = member.status === 'ACTIVE' ? 'EXPIRED' : 'ACTIVE';
    if (member.status === 'ACTIVE') {
      member.lastInteractionDate = new Date();
      member.expiredAt = null;
      member.lastReminderMilestone = null;
      member.lastReminderSentAt = null;
      if (new Date(member.expiryDate) < new Date()) {
        member.expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
    } else {
      member.expiredAt = new Date();
    }
    await member.save();

    return res.status(200).json({ success: true, member: serializeMember(member) });
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
      deleted.photoFileId ? deleteImageKitFiles([deleted.photoFileId]) : Promise.resolve()
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

    const receiptNo = `RCP-${Math.floor(1000 + Math.random() * 9000)}`;
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
      })
    ]);

    return res.status(201).json({
      success: true,
      member: serializeMember(member),
      payment: serializePayment(payment),
      ledgerEntry: serializePayment(ledgerEntry)
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
