/**
 * Normalize a phone number into international digits suitable for https://wa.me/<digits>.
 * Strips formatting, removes a single leading 0 on 11-digit local numbers, and prepends 91 for 10-digit Indian numbers.
 */
export function sanitizePhoneForWa(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Build a WhatsApp chat URL for a target phone number and optional prefilled message.
 * Returns an empty string when no valid phone number is available.
 */
export function buildWhatsAppUrl(phone, text = '') {
  const waPhone = sanitizePhoneForWa(phone);
  if (waPhone.length < 10) return '';
  const base = `https://wa.me/${waPhone}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/**
 * Compute automatic expiry/renewal WhatsApp reminder copy for a member
 * when their plan is at 3 days, 2 days, 1 day, or expired.
 */
export function getMemberExpiryReminder(member, gymName = 'GymCentric') {
  if (!member) return null;
  const daysLeft = Number(member.daysLeft ?? 0);
  const isExpired = member.status === 'EXPIRED' || daysLeft <= 0;

  let milestone = null;
  let badge = '';
  let message = '';

  if (isExpired) {
    milestone = 'EXPIRED';
    badge = 'Expired';
    message = `Hi ${member.name}, your ${gymName} subscription has expired${
      member.expiryDate ? ` (ended on ${member.expiryDate})` : ''
    }. Please renew your subscription to continue gym access.`;
  } else if (daysLeft === 1) {
    milestone = '1D';
    badge = '1 Day Left';
    message = `Hi ${member.name}, your ${gymName} subscription ends in 1 day${
      member.expiryDate ? ` (on ${member.expiryDate})` : ''
    }. Please renew your subscription today.`;
  } else if (daysLeft === 2) {
    milestone = '2D';
    badge = '2 Days Left';
    message = `Hi ${member.name}, your ${gymName} subscription ends in 2 days${
      member.expiryDate ? ` (on ${member.expiryDate})` : ''
    }. Please renew your subscription soon.`;
  } else if (daysLeft === 3) {
    milestone = '3D';
    badge = '3 Days Left';
    message = `Hi ${member.name}, your ${gymName} subscription ends in 3 days${
      member.expiryDate ? ` (on ${member.expiryDate})` : ''
    }. Please renew your subscription to avoid interruption.`;
  } else {
    return null;
  }

  return {
    milestone,
    badge,
    daysLeft,
    message,
    waUrl: buildWhatsAppUrl(member.phone, message),
    alreadySent: member.lastReminderMilestone === milestone
  };
}
