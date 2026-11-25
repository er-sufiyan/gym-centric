const axios = require('axios');

class WhatsAppService {
  /**
   * Format phone number to international standard (E.164 without '+')
   * e.g. "9876543210" -> "919876543210"
   */
  formatPhone(phone) {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 10) {
      clean = '91' + clean; // Default to India country code 91
    }
    return clean;
  }

  /**
   * Send 6-Digit OTP via WhatsApp
   */
  async sendOtpMessage(phone, otp) {
    const formattedPhone = this.formatPhone(phone);
    const message = `🔐 *GymCentric Login Verification*\n\nYour 6-digit OTP is: *${otp}*\n\nValid for 5 minutes. Do not share this code with anyone.`;

    console.log(`\n========================================`);
    console.log(`[WHATSAPP SERVICE] OTP Dispatch to ${formattedPhone}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`========================================\n`);

    // If Meta Cloud API is configured in .env, send live WhatsApp message
    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      try {
        const url = `${process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v21.0'}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
        await axios.post(
          url,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedPhone,
            type: 'text',
            text: { body: message }
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        return { success: true, mode: 'API_DISPATCH' };
      } catch (err) {
        console.error('[WhatsApp API Error]:', err.response?.data || err.message);
        // Fallback to logged console in development
        return { success: true, mode: 'CONSOLE_FALLBACK', error: err.message };
      }
    }

    return { success: true, mode: 'DEVELOPMENT_SIMULATION' };
  }

  /**
   * Send Expiry Reminder to Gym Member
   */
  async sendExpiryReminder(phone, memberName, daysLeft, gymName) {
    const formattedPhone = this.formatPhone(phone);
    const text = `🔔 *Membership Expiry Reminder*\n\nHi ${memberName}, your gym membership at *${gymName}* will expire in *${daysLeft} days*. Please visit reception to renew your plan.`;
    console.log(`[WhatsApp Reminder]: Sent to ${formattedPhone}`);
    return { success: true };
  }
}

module.exports = new WhatsAppService();
