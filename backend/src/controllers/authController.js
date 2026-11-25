const Gym = require('../models/Gym');
const jwt = require('jsonwebtoken');
const whatsappService = require('../services/whatsappService');

// Helper to generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'gymcentric_jwt_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

/**
 * @desc    Step 1: Gym Owner Login with Phone & Password -> Triggers WhatsApp OTP
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.loginWithPassword = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide phone number and password' });
    }

    // 1. Find Gym by Phone (include password for verification)
    const gym = await Gym.findOne({ phone: phone.trim() }).select('+password');

    if (!gym) {
      return res.status(401).json({ success: false, message: 'No gym owner found with this phone number' });
    }

    // 2. Check Password
    const isMatch = await gym.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    // 3. Generate 6-Digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 Minutes

    // 4. Save OTP to DB
    gym.otp = otp;
    gym.otpExpiry = otpExpiry;
    await gym.save({ validateBeforeSave: false });

    // 5. Send OTP via WhatsApp
    await whatsappService.sendOtpMessage(gym.phone, otp);

    return res.status(200).json({
      success: true,
      message: `Verification OTP sent to your WhatsApp (${gym.phone})`,
      phone: gym.phone,
      // For development/testing convenience, include OTP in response if in dev mode
      devOtp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    return res.status(500).json({ success: false, message: 'Server error during login', error: error.message });
  }
};

/**
 * @desc    Step 2: Verify WhatsApp OTP -> Returns JWT Token & Gym Details
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide phone number and OTP' });
    }

    // Find Gym including OTP fields
    const gym = await Gym.findOne({ phone: phone.trim() }).select('+otp +otpExpiry');

    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }

    // Validate OTP
    if (!gym.otp || gym.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP entered' });
    }

    // Check Expiration
    if (new Date() > new Date(gym.otpExpiry)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Clear OTP upon successful verification
    gym.otp = undefined;
    gym.otpExpiry = undefined;
    await gym.save({ validateBeforeSave: false });

    // Generate Access Token
    const token = generateToken(gym._id, gym.role);

    // Check SaaS subscription status
    const isSubscriptionValid = gym.isSubscriptionActive();

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      gym: {
        id: gym._id,
        gymName: gym.gymName,
        ownerName: gym.ownerName,
        phone: gym.phone,
        logoUrl: gym.logoUrl,
        saasPlan: gym.saasPlan,
        validUntil: gym.validUntil,
        status: gym.status,
        isSubscriptionActive: isSubscriptionValid
      }
    });
  } catch (error) {
    console.error('[Verify OTP Error]:', error);
    return res.status(500).json({ success: false, message: 'Server error during OTP verification', error: error.message });
  }
};

/**
 * @desc    Resend OTP to WhatsApp
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
exports.resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const gym = await Gym.findOne({ phone: phone.trim() });
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym owner not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    gym.otp = otp;
    gym.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await gym.save({ validateBeforeSave: false });

    await whatsappService.sendOtpMessage(gym.phone, otp);

    return res.status(200).json({
      success: true,
      message: `Fresh OTP resent to your WhatsApp (${gym.phone})`,
      devOtp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error resending OTP', error: error.message });
  }
};

/**
 * @desc    Register a new Gym Tenant
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const { gymName, ownerName, phone, password, saasPlan } = req.body;

    const existing = await Gym.findOne({ phone: phone.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A gym with this phone number already exists' });
    }

    const gym = await Gym.create({
      gymName,
      ownerName,
      phone: phone.trim(),
      password,
      saasPlan: saasPlan || 'BASE',
      validUntil: new Date(+new Date() + 30 * 24 * 60 * 60 * 1000), // 30 Days Trial / Initial
      status: 'ACTIVE'
    });

    return res.status(201).json({
      success: true,
      message: 'Gym registered successfully. You can now log in with your phone and password.',
      gymId: gym._id
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error registering gym', error: error.message });
  }
};

/**
 * @desc    Get Current Authenticated Gym Profile
 * @route   GET /api/auth/me
 * @access  Private (Gym Owner / Super Admin)
 */
exports.getMe = async (req, res) => {
  try {
    const gym = await Gym.findById(req.gym.id);
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }

    return res.status(200).json({
      success: true,
      gym: {
        id: gym._id,
        gymName: gym.gymName,
        ownerName: gym.ownerName,
        phone: gym.phone,
        logoUrl: gym.logoUrl,
        saasPlan: gym.saasPlan,
        validUntil: gym.validUntil,
        status: gym.status,
        isSubscriptionActive: gym.isSubscriptionActive()
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching profile', error: error.message });
  }
};
