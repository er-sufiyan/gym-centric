const Gym = require('../models/Gym');
const GymPlan = require('../models/GymPlan');
const jwt = require('jsonwebtoken');
const whatsappService = require('../services/whatsappService');
const emailService = require('../services/emailService');

// Helper to generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'gymcentric_jwt_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

// Extract last 10 digits so "+91 98765 43210" and "9876543210" match seamlessly
const extractLast10 = (raw = '') => String(raw || '').replace(/\D/g, '').slice(-10);

const formatDisplayPhone = (raw = '') => {
  const digits = extractLast10(raw);
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return String(raw || '').trim();
};

const escapeRegex = (val = '') => val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const maskEmail = (email = '') => {
  const [name, domain] = String(email).split('@');
  if (!domain) return email;
  const visible = name.length <= 2 ? name[0] || '' : name.slice(0, 2);
  return `${visible}***@${domain}`;
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

const findGymByEmail = async (rawEmail, extraSelect = '') => {
  const trimmed = String(rawEmail || '').trim();
  const query = Gym.findOne({ email: { $regex: `^${escapeRegex(trimmed)}$`, $options: 'i' } });
  if (extraSelect) query.select(extraSelect);
  return query;
};

const findGymByIdentifier = async (identifier, extraSelect = '') => {
  const trimmed = String(identifier || '').trim();
  if (!trimmed) return null;
  if (trimmed.includes('@')) {
    return findGymByEmail(trimmed, extraSelect);
  }
  return findGymByPhone(trimmed, extraSelect);
};

const dispatchOtpToGym = async (gym, otp) => {
  const emailResult = gym.email
    ? await emailService.sendOtpEmail(gym.email, otp, gym.gymName, gym.ownerName)
    : { success: false, mode: 'NO_EMAIL' };

  const waResult = await whatsappService.sendOtpMessage(gym.phone, otp);

  const sentEmail = emailResult.mode === 'EMAIL_DISPATCH';
  const sentWhatsApp = waResult.mode === 'API_DISPATCH';
  const dispatchedLive = sentEmail || sentWhatsApp;

  let channel = 'preview';
  let sentTo = gym.phone;
  let message = `6-digit OTP generated for ${gym.gymName}`;

  if (sentEmail && sentWhatsApp) {
    channel = 'email_and_whatsapp';
    sentTo = `${maskEmail(gym.email)} & ${gym.phone}`;
    message = `6-digit OTP sent to your email (${maskEmail(gym.email)}) and WhatsApp`;
  } else if (sentEmail) {
    channel = 'email';
    sentTo = maskEmail(gym.email);
    message = `6-digit OTP sent to your email (${maskEmail(gym.email)})`;
  } else if (sentWhatsApp) {
    channel = 'whatsapp';
    sentTo = gym.phone;
    message = `6-digit OTP sent to WhatsApp (${gym.phone})`;
  } else if (gym.email) {
    message = `6-digit OTP ready for ${gym.gymName} (${maskEmail(gym.email)})`;
  }

  const includePreviewOtp = process.env.NODE_ENV !== 'production' || !dispatchedLive;

  return {
    channel,
    sentTo,
    message,
    dispatchedLive,
    deliveryMode: sentEmail ? 'EMAIL_DISPATCH' : waResult.mode,
    devOtp: includePreviewOtp ? otp : undefined
  };
};

const serializeAuthGym = (gym) => ({
  id: String(gym._id),
  gymName: gym.gymName,
  ownerName: gym.ownerName,
  phone: gym.phone,
  email: gym.email || '',
  city: gym.city || 'India',
  address: gym.address || gym.city || 'India',
  logoUrl: gym.logoUrl,
  saasPlan: gym.saasPlan,
  validUntil: gym.validUntil,
  status: gym.status,
  isSubscriptionActive: gym.isSubscriptionActive()
});

/**
 * @desc    Mobile or Email Login: Enter Registered Mobile Number or Email -> Sends 6-Digit OTP
 * @route   POST /api/auth/request-otp
 * @access  Public
 */
exports.requestOtp = async (req, res) => {
  try {
    const rawIdentifier = (req.body.identifier || req.body.email || req.body.phone || '').trim();
    if (!rawIdentifier) {
      return res.status(400).json({ success: false, message: 'Please enter your registered mobile number or email' });
    }

    const isEmail = rawIdentifier.includes('@');
    if (!isEmail && extractLast10(rawIdentifier).length < 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number or email' });
    }

    const gym = await findGymByIdentifier(rawIdentifier);
    if (!gym) {
      return res.status(404).json({
        success: false,
        notRegistered: true,
        message: 'No gym found for this email or mobile number. Switch to Register New Gym to onboard.'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    gym.otp = otp;
    gym.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await gym.save({ validateBeforeSave: false });

    const delivery = await dispatchOtpToGym(gym, otp);

    return res.status(200).json({
      success: true,
      message: delivery.message,
      channel: delivery.channel,
      sentTo: delivery.sentTo,
      phone: gym.phone,
      email: gym.email || '',
      gymName: gym.gymName,
      deliveryMode: delivery.deliveryMode,
      devOtp: delivery.devOtp
    });
  } catch (error) {
    console.error('[Request OTP Error]:', error);
    return res.status(500).json({ success: false, message: 'Server error while sending OTP', error: error.message });
  }
};

/**
 * @desc    Step 1 (Legacy/Password): Gym Owner Login with Phone/Email & Password -> Triggers OTP
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.loginWithPassword = async (req, res) => {
  try {
    const rawIdentifier = (req.body.identifier || req.body.email || req.body.phone || '').trim();
    const { password } = req.body;

    if (!rawIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide phone/email and password' });
    }

    const gym = await findGymByIdentifier(rawIdentifier, '+password');

    if (!gym) {
      return res.status(401).json({ success: false, message: 'No gym owner found with this account' });
    }

    const isMatch = await gym.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    gym.otp = otp;
    gym.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await gym.save({ validateBeforeSave: false });

    const delivery = await dispatchOtpToGym(gym, otp);

    return res.status(200).json({
      success: true,
      message: delivery.message,
      channel: delivery.channel,
      sentTo: delivery.sentTo,
      phone: gym.phone,
      email: gym.email || '',
      gymName: gym.gymName,
      deliveryMode: delivery.deliveryMode,
      devOtp: delivery.devOtp
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    return res.status(500).json({ success: false, message: 'Server error during login', error: error.message });
  }
};

/**
 * @desc    Step 2: Verify 6-Digit OTP -> Returns JWT Token & Gym Details
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
exports.verifyOtp = async (req, res) => {
  try {
    const rawIdentifier = (req.body.identifier || req.body.email || req.body.phone || '').trim();
    const { otp } = req.body;

    if (!rawIdentifier || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide mobile/email and OTP' });
    }

    const gym = await findGymByIdentifier(rawIdentifier, '+otp +otpExpiry');

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
 * @desc    Resend 6-Digit OTP (Email / WhatsApp)
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
exports.resendOtp = async (req, res) => {
  try {
    const rawIdentifier = (req.body.identifier || req.body.email || req.body.phone || '').trim();
    if (!rawIdentifier) {
      return res.status(400).json({ success: false, message: 'Mobile number or email is required' });
    }

    const gym = await findGymByIdentifier(rawIdentifier);
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym owner not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    gym.otp = otp;
    gym.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await gym.save({ validateBeforeSave: false });

    const delivery = await dispatchOtpToGym(gym, otp);

    return res.status(200).json({
      success: true,
      message: delivery.message,
      channel: delivery.channel,
      sentTo: delivery.sentTo,
      phone: gym.phone,
      email: gym.email || '',
      deliveryMode: delivery.deliveryMode,
      devOtp: delivery.devOtp
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error resending OTP', error: error.message });
  }
};

/**
 * @desc    Register a new Gym Tenant + Send Email/WhatsApp OTP Immediately
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const { gymName, ownerName, phone, email, city, address, password, saasPlan } = req.body;
    const last10 = extractLast10(phone);
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!gymName || !ownerName || last10.length < 10 || !cleanEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Gym Name, Owner Name, valid Email, and 10-digit mobile number are required'
      });
    }

    const existingPhone = await findGymByPhone(phone);
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'A gym with this mobile number already exists. Please use Login instead.'
      });
    }

    const existingEmail = await findGymByEmail(cleanEmail);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'A gym with this email already exists. Please use Login instead.'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedPhone = formatDisplayPhone(phone);
    const cleanCity = (city || 'India').trim();

    const gym = await Gym.create({
      gymName: gymName.trim(),
      ownerName: ownerName.trim(),
      phone: formattedPhone,
      email: cleanEmail,
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

    const delivery = await dispatchOtpToGym(gym, otp);

    return res.status(201).json({
      success: true,
      message: delivery.message,
      channel: delivery.channel,
      sentTo: delivery.sentTo,
      gymId: String(gym._id),
      phone: gym.phone,
      email: gym.email,
      gymName: gym.gymName,
      deliveryMode: delivery.deliveryMode,
      devOtp: delivery.devOtp
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
