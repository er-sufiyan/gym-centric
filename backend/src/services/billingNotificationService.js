const whatsappService = require('./whatsappService');
const emailService = require('./emailService');

/**
 * Billing Notification Service
 *
 * Sends automatic WhatsApp and/or email notifications to gym members
 * whenever a billing-related event occurs — fee payment, renewal,
 * new admission, or status change.
 *
 * This provides an audit trail for security and transparency.
 */

/**
 * Build a human-readable receipt text message for WhatsApp.
 */
function buildReceiptText({ type, gymName, memberName, rollNo, planName, amount, mode, date, validUntil, receiptNo, shift }) {
  if (type === 'MEMBER_WELCOME') {
    return [
      `👋 *Welcome to ${gymName}, ${memberName}!*`,
      `Your gym membership is now *ACTIVE*.`,
      ``,
      `🆔 *Member ID:* #${rollNo}`,
      `📋 *Plan:* ${planName}`,
      shift ? `⏰ *Shift:* ${shift}` : null,
      `📅 *Admitted On:* ${date}`,
      validUntil ? `✅ *Valid Until:* ${validUntil}` : null,
      `🧾 *Receipt:* #${receiptNo} • ₹${Number(amount).toLocaleString()} (${mode})`,
      ``,
      `A PDF receipt has been generated for your records.`,
      `See you on the floor! Stay strong 💪`
    ].filter(Boolean).join('\n');
  }

  if (type === 'STATUS_CHANGE_ACTIVE') {
    return [
      `✅ *Membership Reactivated — ${gymName}*`,
      ``,
      `Hi ${memberName} (#${rollNo}), your membership at *${gymName}* has been *reactivated*.`,
      validUntil ? `📅 *Valid Until:* ${validUntil}` : null,
      ``,
      `This is an automated notification for your records.`
    ].filter(Boolean).join('\n');
  }

  if (type === 'STATUS_CHANGE_EXPIRED') {
    return [
      `⚠️ *Membership Deactivated — ${gymName}*`,
      ``,
      `Hi ${memberName} (#${rollNo}), your membership at *${gymName}* has been marked as *EXPIRED*.`,
      ``,
      `Please visit the gym or contact your gym owner to renew.`,
      `This is an automated notification for your records.`
    ].filter(Boolean).join('\n');
  }

  // Default: payment receipt
  return [
    `*${gymName} — Fee Payment Receipt*`,
    `Receipt No: #${receiptNo}`,
    `Member ID: #${rollNo}`,
    `Member: ${memberName}`,
    `Plan: ${planName}`,
    `Amount Paid: ₹${Number(amount).toLocaleString()} (${mode})`,
    `Date: ${date}`,
    validUntil ? `Valid Until: ${validUntil}` : null,
    ``,
    `A PDF receipt has been generated for your records.`,
    `Thank you for training with ${gymName}!`
  ].filter(Boolean).join('\n');
}

/**
 * Send automatic billing notification to a member.
 *
 * @param {Object} opts
 * @param {string} opts.type           - MEMBER | MEMBER_WELCOME | STATUS_CHANGE_ACTIVE | STATUS_CHANGE_EXPIRED
 * @param {string} opts.phone          - Member phone number
 * @param {string} [opts.email]        - Member email (optional)
 * @param {string} opts.gymName        - Gym name
 * @param {string} opts.memberName     - Member full name
 * @param {string} opts.rollNo         - Member roll/ID number
 * @param {string} [opts.planName]     - Plan name
 * @param {number} [opts.amount]       - Amount paid
 * @param {string} [opts.mode]         - CASH / UPI
 * @param {string} [opts.date]         - Payment date
 * @param {string} [opts.validUntil]   - Expiry date
 * @param {string} [opts.receiptNo]    - Receipt number
 * @param {string} [opts.shift]        - MORNING / EVENING
 * @returns {Promise<Object>} Dispatch result
 */
async function sendBillingNotification(opts) {
  const { phone, email, type } = opts;
  const results = { whatsapp: null, email: null };

  const messageText = buildReceiptText(opts);

  // 1) WhatsApp notification via Meta Cloud API (if configured)
  if (phone) {
    const formattedPhone = whatsappService.formatPhone(phone);
    if (formattedPhone && formattedPhone.length >= 10) {
      if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
        try {
          const axios = require('axios');
          const url = `${process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v21.0'}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
          const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedPhone,
            type: 'text',
            text: { body: messageText }
          };

          await axios.post(url, payload, {
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
          results.whatsapp = { success: true, mode: 'API_DISPATCH' };
        } catch (err) {
          const metaError = err.response?.data?.error?.message || err.response?.data || err.message;
          console.error('[Billing Notification WhatsApp Error]:', metaError);
          results.whatsapp = { success: false, mode: 'CONSOLE_FALLBACK', error: String(metaError) };
        }
      } else {
        console.log(`[BILLING NOTIFICATION - ${type}] WhatsApp to ${formattedPhone}: ${messageText.substring(0, 80)}...`);
        results.whatsapp = { success: true, mode: 'DEVELOPMENT_SIMULATION' };
      }
    }
  }

  // 2) Email notification (if member email and SMTP are configured)
  if (email && email.includes('@')) {
    // Currently members don't have email, but future-proof
    console.log(`[BILLING NOTIFICATION - ${type}] Email to ${email}: ${messageText.substring(0, 80)}...`);
    results.email = { success: true, mode: 'DEVELOPMENT_SIMULATION' };
  }

  return results;
}

module.exports = { sendBillingNotification, buildReceiptText };
