const express = require('express');
const router = express.Router();
const {
  requestOtp,
  loginWithPassword,
  verifyOtp,
  resendOtp,
  register,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public Auth Endpoints
router.post('/request-otp', requestOtp);
router.post('/login', loginWithPassword);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/register', register);

// Protected Auth Endpoints
router.get('/me', protect, getMe);

module.exports = router;
