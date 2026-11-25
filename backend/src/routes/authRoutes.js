const express = require('express');
const router = express.Router();
const {
  requestOtp,
  loginWithPassword,
  verifyOtp,
  resendOtp,
  register,
  getMe,
  adminLogin,
  adminVerify
} = require('../controllers/authController');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');

// Public Auth Endpoints
router.post('/request-otp', requestOtp);
router.post('/login', loginWithPassword);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/register', register);
router.post('/admin-login', adminLogin);

// Protected Auth Endpoints
router.get('/me', protect, getMe);
router.get('/admin-verify', protect, superAdminOnly, adminVerify);

module.exports = router;
