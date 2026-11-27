const express = require('express');
const router = express.Router();
const {
  getBootstrapData,
  createGymOwner,
  toggleGymStatus,
  deleteGymOwner,
  updateGymPlan,
  recordSaasPayment,
  deleteSaasPayment,
  updatePlatformSettings,
  createMember,
  toggleMemberStatus,
  deleteMember,
  createGymPlan,
  deleteGymPlan,
  recordMemberPayment,
  markMemberReminderSent,
  getImageKitAuth,
  recordMemberCheckIn,
  downloadReceiptPdf,
  generateReceiptPdfFromBody,
  updateMember,
  getAuditLogs
} = require('../controllers/dashboardController');
const {
  protect,
  optionalAuth,
  superAdminOnly,
  authorizeGymScope,
  requireActiveSubscription
} = require('../middleware/authMiddleware');

// Bootstrap dashboard state (scoped by JWT role: SUPER_ADMIN vs GYM_OWNER)
router.get('/bootstrap', optionalAuth, getBootstrapData);

// Super Admin routes (strictly password/JWT protected)
router.post('/superadmin/gyms', protect, superAdminOnly, createGymOwner);
router.patch('/superadmin/gyms/:gymId/status', protect, superAdminOnly, toggleGymStatus);
router.delete('/superadmin/gyms/:gymId', protect, superAdminOnly, deleteGymOwner);
router.put('/superadmin/gyms/:gymId/plan', protect, superAdminOnly, updateGymPlan);
router.post('/superadmin/payments', protect, superAdminOnly, recordSaasPayment);
router.delete('/superadmin/payments/:paymentId', protect, superAdminOnly, deleteSaasPayment);
router.put('/superadmin/settings', protect, superAdminOnly, updatePlatformSettings);

// Gym Owner routes (scoped per authenticated gymId or SUPER_ADMIN, requires active SaaS subscription)
router.post('/gyms/:gymId/members', protect, authorizeGymScope, requireActiveSubscription, createMember);
router.put('/gyms/:gymId/members/:memberId', protect, authorizeGymScope, requireActiveSubscription, updateMember);
router.patch('/gyms/:gymId/members/:memberId/status', protect, authorizeGymScope, requireActiveSubscription, toggleMemberStatus);
router.delete('/gyms/:gymId/members/:memberId', protect, authorizeGymScope, requireActiveSubscription, deleteMember);
router.post('/gyms/:gymId/plans', protect, authorizeGymScope, requireActiveSubscription, createGymPlan);
router.delete('/gyms/:gymId/plans/:planId', protect, authorizeGymScope, requireActiveSubscription, deleteGymPlan);
router.post('/gyms/:gymId/payments', protect, authorizeGymScope, requireActiveSubscription, recordMemberPayment);
router.patch('/gyms/:gymId/members/:memberId/reminder', protect, authorizeGymScope, requireActiveSubscription, markMemberReminderSent);
router.get('/gyms/:gymId/imagekit-auth', protect, authorizeGymScope, requireActiveSubscription, getImageKitAuth);
router.post('/gyms/:gymId/check-in', protect, authorizeGymScope, requireActiveSubscription, recordMemberCheckIn);
router.get('/gyms/:gymId/payments/:paymentId/receipt-pdf', protect, authorizeGymScope, requireActiveSubscription, downloadReceiptPdf);
router.post('/gyms/:gymId/receipt-pdf', protect, authorizeGymScope, requireActiveSubscription, generateReceiptPdfFromBody);
router.get('/gyms/:gymId/audit-logs', protect, authorizeGymScope, requireActiveSubscription, getAuditLogs);

module.exports = router;
