const axios = require('axios');
const whatsappService = require('./whatsappService');
const emailService = require('./emailService');
const { generateReceiptPdf } = require('./pdfReceiptService');

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
 * Upload a PDF Buffer to Meta WhatsApp Cloud API Media endpoint and return its media ID.
 */
async function uploadPdfToWhatsAppMedia(pdfBuffer, filename, apiUrl, phoneNumberId, accessToken) {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', 'application/pdf');
  form.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), filename);

  const res = await fetch(`${apiUrl}/${phoneNumberId}/media`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: form
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) {
    const errMsg = data?.error?.message || data?.message || `Media upload failed (${res.status})`;
    throw new Error(errMsg);
  }
  return data.id;
}

/**
 * Send automatic billing notification + PDF receipt to a member.
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

  // 1) WhatsApp PDF document notification via Meta Cloud API (mandatory for billing saves)
  const formattedPhone = phone ? whatsappService.formatPhone(phone) : '';
  if (!formattedPhone || formattedPhone.length < 10) {
    return {
      success: false,
      whatsapp: {
        success: false,
        mode: 'INVALID_PHONE',
        error: 'A valid 10+ digit member WhatsApp phone number is required to send the PDF receipt.'
      },
      email: null
    };
  }

  const refId = opts.receiptNo || `NTF-${Date.now().toString().slice(-4)}`;
  const pdfFilename = `Receipt-${refId}.pdf`;
  const pdfBuffer = await generateReceiptPdf({
    receiptNo: refId,
    gymName: opts.gymName,
    memberName: opts.memberName,
    rollNo: opts.rollNo,
    phone: opts.phone,
    planName: opts.planName || 'Membership',
    amount: opts.amount,
    mode: opts.mode,
    date: opts.date,
    shift: opts.shift,
    validUntil: opts.validUntil,
    type
  });

  if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    try {
      const apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v21.0';
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

      // Step 1: Upload PDF to Meta WhatsApp Media API
      const mediaId = await uploadPdfToWhatsAppMedia(
        pdfBuffer,
        pdfFilename,
        apiUrl,
        phoneNumberId,
        accessToken
      );

      // Step 2: Send PDF document message with receipt summary caption
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'document',
        document: {
          id: mediaId,
          filename: pdfFilename,
          caption: messageText
        }
      };

      await axios.post(`${apiUrl}/${phoneNumberId}/messages`, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      results.whatsapp = { success: true, mode: 'API_PDF_DISPATCH', filename: pdfFilename };
    } catch (err) {
      const metaError = err.response?.data?.error?.message || err.response?.data || err.message;
      console.error('[Billing Notification WhatsApp PDF Error]:', metaError);
      results.whatsapp = {
        success: false,
        mode: 'API_ERROR',
        error: typeof metaError === 'string' ? metaError : JSON.stringify(metaError)
      };
      return { success: false, ...results };
    }
  } else {
    console.log(
      `[BILLING NOTIFICATION - ${type}] PDF (${pdfFilename}, ${pdfBuffer.length} bytes) ready for WhatsApp ${formattedPhone}`
    );
    results.whatsapp = { success: true, mode: 'DEVELOPMENT_SIMULATION', filename: pdfFilename };
  }

  // 2) Free automatic Email PDF receipt (if member email is provided)
  if (email && String(email).includes('@')) {
    results.email = await emailService.sendReceiptEmail(email, opts, pdfBuffer, pdfFilename);
  }

  return { success: true, ...results };
}

module.exports = { sendBillingNotification, buildReceiptText };
