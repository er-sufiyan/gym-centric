const Gym = require('../models/Gym');
const GymPlan = require('../models/GymPlan');
const jwt = require('jsonwebtoken');
const whatsappService = require('../services/whatsappService');

// Helper to generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'gymcentric_jwt_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

// Extract digits & last 10 digits so "+91 98765 43210" and "9876543210" match seamlessly
const extractLast10 = (raw = '') => String(raw || '').replace(/\D/g, '').slice(-10);

const formatDisplayPhone = (raw = '') => {
  const digits = extractLast10(raw);
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return String(raw || '').trim();
};

const findGymByPhone = async (rawPhone, extraSelect = '') => {
  const trimmed = String(rawPhone || '').trim();
  const last10 = extractLast10(trimmed);
  const query = Gym.findOne(
    last10.length === 10
      ? {
          $or: [
            { phone: trimmed },
            { phone: { $regex: `${last10.split('').join('[\\s-]*')}$` } }
          ]
        }
      : { phone: trimmed }
  );
  if (extraSelect) query.select(extraSelect);
  return query;
};

const serializeAuthGym = (gym) => ({
  id: String(gym._id),
  gymName: gym.gymName,
  ownerName: gym.ownerName,
  phone: gym.phone,
  city: gym.city || 'India',
  address: gym.address || gym.city || 'India',
  logoUrl: gym.logoUrl,
  saasPlan: gym.saasPlan,
  validUntil: gym.validUntil,
  status: gym.status,
  isSubscriptionActive: gym.isSubscriptionActive()
});

/**
 * @desc    Mobile-first Login: Enter Registered Phone Number -> Sends WhatsApp OTP
 * @route   POST /api/auth/request-otp
 * @access  Public
 */
exports.requestOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    const last10 = extractLast10(phone);

    if (last10.length < 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number' });
    }

    const gym = await findGymByPhone(phone);
    if (!gym) {
      return res.status(404).json({
        success: false,
        notRegistered: true,
        message: 'No gym found for this mobile number. Switch to Register New Gym to onboard.'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    gym.otp = otp;
    gym.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await gym.save({ validateBeforeSave: false });

    const waResult = await whatsappService.sendOtpMessage(gym.phone, otp);
    const includePreviewOtp = process.env.NODE_ENV !== 'production' || waResult.mode !== 'API_DISPATCH';

    return res.status(200).json({
      success: true,
      message: `6-digit OTP sent to WhatsApp (${gym.phone})`,
      phone: gym.phone,
      gymName: gym.gymName,
      deliveryMode: waResult.mode,
      devOtp: includePreviewOtp ? otp : undefined
    });
  } catch (error) {
    console.error('[Request OTP Error]:', error);
    return res.status(500).json({ success: false, message: 'Server error while sending OTP', error: error.message });
  }
};

/**
 * @desc    Step 1 (Legacy/Password): Gym Owner Login with Phone & Password -> Triggers WhatsApp OTP
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.loginWithPassword = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide phone number and password' });
    }

    const gym = await findGymByPhone(phone, '+password');

    if (!gym) {
      return res.status(401).json({ success: false, message: 'No gym owner found with this phone number' });
    }

    const isMatch = await gym.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    gym.otp = otp;
    gym.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await gym.save({ validateBeforeSave: false });

    const waResult = await whatsappService.sendOtpMessage(gym.phone, otp);
    const includePreviewOtp = process.env.NODE_ENV !== 'production' || waResult.mode !== 'API_DISPATCH';

    return res.status(200).json({
      success: true,
      message: `Verification OTP sent to your WhatsApp (${gym.phone})`,
      phone: gym.phone,
      gymName: gym.gymName,
      deliveryMode: waResult.mode,
      devOtp: includePreviewOtp ? otp : undefined
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

    const gym = await findGymByPhone(phone, '+otp +otpExpiry');

    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }

    if (!gym.otp || gym.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP entered' });
    }

    if (new Date() > new Date(gym.otpExpiry)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    gym.otp = undefined;
    gym.otpExpiry = undefined;
    await gym.save({ validateBeforeSave: false });

    const token = generateToken(gym._id, gym.role);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      gym: serializeAuthGym(gym)
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

    const gym = await findGymByPhone(phone);
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym owner not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    gym.otp = otp;
    gym.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await gym.save({ validateBeforeSave: false });

    const waResult = await whatsappService.sendOtpMessage(gym.phone, otp);
    const includePreviewOtp = process.env.NODE_ENV !== 'production' || waResult.mode !== 'API_DISPATCH';

    return res.status(200).json({
      success: true,
      message: `Fresh OTP resent to your WhatsApp (${gym.phone})`,
      phone: gym.phone,
      deliveryMode: waResult.mode,
      devOtp: includePreviewOtp ? otp : undefined
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error resending OTP', error: error.message });
  }
};

/**
 * @desc    Register a new Gym Tenant + Send Verification OTP Immediately
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const { gymName, ownerName, phone, city, address, password, saasPlan } = req.body;
    const last10 = extractLast10(phone);

    if (!gymName || !ownerName || last10.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Gym Name, Owner Name, and a valid 10-digit mobile number are required'
      });
    }

    const existing = await findGymByPhone(phone);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A gym with this mobile number already exists. Please use Login instead.'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedPhone = formatDisplayPhone(phone);
    const cleanCity = (city || 'India').trim();

    const gym = await Gym.create({
      gymName: gymName.trim(),
      ownerName: ownerName.trim(),
      phone: formattedPhone,
      city: cleanCity,
      address: (address || cleanCity).trim(),
      password: password && password.length >= 6 ? password : `otp_${last10}_${Date.now()}`,
      saasPlan: saasPlan === 'PRO' ? 'PRO' : 'BASE',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      otp,
      otpExpiry: new Date(Date.now() + 5 * 60 * 1000)
    });

    await GymPlan.create([
      { gymId: gym._id, name: '1 Month Standard', price: 1200, durationDays: 30 },
      { gymId: gym._id, name: '3 Months Value Pack', price: 3200, durationDays: 90 }
    ]);

    const waResult = await whatsappService.sendOtpMessage(gym.phone, otp);
    const includePreviewOtp = process.env.NODE_ENV !== 'production' || waResult.mode !== 'API_DISPATCH';

    return res.status(201).json({
      success: true,
      message: `Gym registered! 6-digit verification OTP sent to ${gym.phone}`,
      gymId: String(gym._id),
      phone: gym.phone,
      gymName: gym.gymName,
      deliveryMode: waResult.mode,
      devOtp: includePreviewOtp ? otp : undefined
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
      gym: serializeAuthGym(gym)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching profile', error: error.message });
  }
};
