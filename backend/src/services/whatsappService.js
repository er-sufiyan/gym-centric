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
        const templateName = (process.env.WHATSAPP_OTP_TEMPLATE || '').trim();
        const templateComponents = [
          {
            type: 'body',
            parameters: [{ type: 'text', text: String(otp) }]
          }
        ];
        if (process.env.WHATSAPP_OTP_BUTTON === 'true') {
          templateComponents.push({
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: String(otp) }]
          });
        }
        const payload = templateName
          ? {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: formattedPhone,
              type: 'template',
              template: {
                name: templateName,
                language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en_US' },
                components: templateComponents
              }
            }
          : {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: formattedPhone,
              type: 'text',
              text: { body: message }
            };

        await axios.post(url, payload, {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        return { success: true, mode: 'API_DISPATCH' };
      } catch (err) {
        const metaError = err.response?.data?.error?.message || err.response?.data || err.message;
        console.error('[WhatsApp API Error]:', metaError);
        return { success: true, mode: 'CONSOLE_FALLBACK', error: String(metaError) };
      }
    }

    return { success: true, mode: 'DEVELOPMENT_SIMULATION' };
  }

  /**
   * Send Expiry / Renewal Reminder to Gym Member (3d, 2d, 1d, or Expired)
   */
  async sendExpiryReminder(phone, memberName, daysLeft, gymName, milestone = null) {
    const formattedPhone = this.formatPhone(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      return { success: false, mode: 'INVALID_PHONE' };
    }

    const resolvedMilestone =
      milestone || (daysLeft <= 0 ? 'EXPIRED' : daysLeft === 1 ? '1D' : daysLeft === 2 ? '2D' : '3D');

    let statusPhrase = `ends in ${daysLeft} days`;
    let text = `🔔 *Membership Renewal Reminder*\n\nHi ${memberName}, your subscription at *${gymName}* ends in *${daysLeft} days*. Please renew your plan to avoid interruption.`;

    if (resolvedMilestone === 'EXPIRED' || daysLeft <= 0) {
      statusPhrase = 'has expired';
      text = `⚠️ *Membership Expired*\n\nHi ${memberName}, your subscription at *${gymName}* has *expired*. Please renew your subscription to continue gym access.`;
    } else if (resolvedMilestone === '1D' || daysLeft === 1) {
      statusPhrase = 'ends in 1 day';
      text = `⏳ *Membership Expiring Tomorrow*\n\nHi ${memberName}, your subscription at *${gymName}* ends in *1 day*. Please renew your subscription today.`;
    } else if (resolvedMilestone === '2D' || daysLeft === 2) {
      statusPhrase = 'ends in 2 days';
      text = `🔔 *Membership Expiry Reminder*\n\nHi ${memberName}, your subscription at *${gymName}* ends in *2 days*. Please renew your subscription soon.`;
    } else if (resolvedMilestone === '3D' || daysLeft === 3) {
      statusPhrase = 'ends in 3 days';
      text = `🔔 *Membership Expiry Reminder*\n\nHi ${memberName}, your subscription at *${gymName}* ends in *3 days*. Please renew your subscription to stay active.`;
    }

    console.log(`[WhatsApp Reminder - ${resolvedMilestone}]: To ${formattedPhone} (${memberName}) — ${statusPhrase}`);

    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      try {
        const url = `${process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v21.0'}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
        const templateName = (process.env.WHATSAPP_REMINDER_TEMPLATE || '').trim();
        const payload = templateName
          ? {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: formattedPhone,
              type: 'template',
              template: {
                name: templateName,
                language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en_US' },
                components: [
                  {
                    type: 'body',
                    parameters: [
                      { type: 'text', text: String(memberName || 'Member') },
                      { type: 'text', text: String(gymName || 'Gym') },
                      { type: 'text', text: statusPhrase }
                    ]
                  }
                ]
              }
            }
          : {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: formattedPhone,
              type: 'text',
              text: { body: text }
            };

        await axios.post(url, payload, {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        return { success: true, mode: 'API_DISPATCH', milestone: resolvedMilestone };
      } catch (err) {
        const metaError = err.response?.data?.error?.message || err.response?.data || err.message;
        console.error('[WhatsApp Reminder API Error]:', metaError);
        return { success: true, mode: 'CONSOLE_FALLBACK', error: String(metaError), milestone: resolvedMilestone };
      }
    }

    return { success: true, mode: 'DEVELOPMENT_SIMULATION', milestone: resolvedMilestone };
  }
}

module.exports = new WhatsAppService();
