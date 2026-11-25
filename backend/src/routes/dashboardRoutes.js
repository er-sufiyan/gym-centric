const express = require('express');
const router = express.Router();
const {
  getBootstrapData,
  createGymOwner,
  toggleGymStatus,
  updateGymPlan,
  recordSaasPayment,
  deleteSaasPayment,
  createMember,
  toggleMemberStatus,
  deleteMember,
  createGymPlan,
  deleteGymPlan,
  recordMemberPayment
} = require('../controllers/dashboardController');

// Bootstrap full multi-tenant dashboard state
router.get('/bootstrap', getBootstrapData);

// Super Admin routes
router.post('/superadmin/gyms', createGymOwner);
router.patch('/superadmin/gyms/:gymId/status', toggleGymStatus);
router.put('/superadmin/gyms/:gymId/plan', updateGymPlan);
router.post('/superadmin/payments', recordSaasPayment);
router.delete('/superadmin/payments/:paymentId', deleteSaasPayment);

// Gym Owner routes (scoped per gymId)
router.post('/gyms/:gymId/members', createMember);
router.patch('/gyms/:gymId/members/:memberId/status', toggleMemberStatus);
router.delete('/gyms/:gymId/members/:memberId', deleteMember);
router.post('/gyms/:gymId/plans', createGymPlan);
router.delete('/gyms/:gymId/plans/:planId', deleteGymPlan);
router.post('/gyms/:gymId/payments', recordMemberPayment);

module.exports = router;
