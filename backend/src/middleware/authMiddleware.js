const jwt = require('jsonwebtoken');
const Gym = require('../models/Gym');

/**
 * Middleware to protect private routes with JWT
 */
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gymcentric_jwt_secret');
    const gym = await Gym.findById(decoded.id);

    if (!gym) {
      return res.status(401).json({ success: false, message: 'The user belonging to this token no longer exists.' });
    }

    req.gym = gym;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token is invalid or expired. Please login again.' });
  }
};

/**
 * Middleware: Enforces SaaS Subscription Lockout
 * If Gym Owner has not paid Super Admin -> Blocks operations!
 */
exports.requireActiveSubscription = (req, res, next) => {
  if (req.gym.role === 'SUPER_ADMIN') {
    return next(); // Super admin bypasses gym subscription check
  }

  if (!req.gym.isSubscriptionActive()) {
    return res.status(403).json({
      success: false,
      code: 'SUBSCRIPTION_LOCKED',
      message: 'Your GymCentric SaaS subscription has expired or is blocked.',
      details: {
        gymName: req.gym.gymName,
        status: req.gym.status,
        validUntil: req.gym.validUntil,
        renewInstruction: 'Please pay your platform fee to Super Admin via UPI to unlock your dashboard.'
      }
    });
  }

  next();
};

/**
 * Middleware: Restricts access to Super Admin only
 */
exports.superAdminOnly = (req, res, next) => {
  if (req.gym.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: 'Access denied. Super Admin privileges required.' });
  }
  next();
};
