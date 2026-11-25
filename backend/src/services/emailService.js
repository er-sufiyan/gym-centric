const nodemailer = require('nodemailer');

class EmailService {
  createTransporter() {
    const user = (process.env.SMTP_USER || '').trim();
    const pass = (process.env.SMTP_PASS || '').trim();
    if (!user || !pass) return null;

    const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });
  }

  /**
   * Send 6-Digit OTP to Registered Gym Owner Email
   */
  async sendOtpEmail(toEmail, otp, gymName = 'GymCentric', ownerName = 'Gym Owner') {
    const cleanEmail = String(toEmail || '').trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, mode: 'NO_EMAIL' };
    }

    const transporter = this.createTransporter();
    if (!transporter) {
      console.log(`[EMAIL SERVICE - SIMULATION] OTP ${otp} for ${cleanEmail} (${gymName})`);
      return { success: true, mode: 'DEVELOPMENT_SIMULATION' };
    }

    const fromAddress = (process.env.SMTP_FROM || process.env.SMTP_USER).trim();

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#060b0e; color:#e2e8f0; padding:32px 20px;">
        <div style="max-width:480px; margin:0 auto; background:#0b1418; border:1px solid #1e293b; border-radius:20px; padding:28px;">
          <div style="font-size:18px; font-weight:800; color:#ffffff; margin-bottom:4px;">
            GymCentric<span style="color:#22d3ee;">.</span>
          </div>
          <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#94a3b8; margin-bottom:20px;">
            Gym Owner Login Verification
          </div>
          <p style="font-size:14px; color:#cbd5e1; line-height:1.5; margin:0 0 16px;">
            Hi <strong>${ownerName}</strong>, use this 6-digit OTP to sign in and manage <strong>${gymName}</strong>:
          </p>
          <div style="background:#060b0e; border:1px solid rgba(34,211,238,0.4); border-radius:14px; padding:18px; text-align:center; margin:20px 0;">
            <span style="font-size:32px; font-weight:900; letter-spacing:8px; color:#22d3ee;">${otp}</span>
          </div>
          <p style="font-size:12px; color:#94a3b8; margin:0;">
            This code expires in <strong>5 minutes</strong>. Do not share it with anyone.
          </p>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: `"GymCentric" <${fromAddress}>`,
        to: cleanEmail,
        subject: `GymCentric OTP: ${otp} (Valid for 5 minutes)`,
        text: `Hi ${ownerName}, your 6-digit GymCentric OTP for ${gymName} is ${otp}. Valid for 5 minutes.`,
        html
      });
      return { success: true, mode: 'EMAIL_DISPATCH' };
    } catch (err) {
      console.error('[Email OTP Error]:', err.message);
      return { success: true, mode: 'CONSOLE_FALLBACK', error: err.message };
    }
  }
}

module.exports = new EmailService();
