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
