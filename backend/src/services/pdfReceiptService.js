const PDFDocument = require('pdfkit');

/**
 * Generate a professional, high-contrast gym fee receipt as a PDF buffer.
 *
 * @param {Object} data - Receipt payload
 * @param {string} data.receiptNo     - e.g. "RCP-4821"
 * @param {string} data.gymName       - Name of the gym
 * @param {string} data.memberName    - Full name of the member
 * @param {string} data.rollNo        - Roll / ID number
 * @param {string} data.phone         - Member phone
 * @param {string} data.planName      - Plan name
 * @param {number} [data.amount]      - Amount paid
 * @param {string} [data.mode]        - CASH or UPI
 * @param {string} [data.date]        - Formatted date string
 * @param {string} [data.shift]       - MORNING / EVENING
 * @param {string} [data.validUntil]  - Expiry date
 * @param {string} [data.type]        - MEMBER | SAAS | MEMBER_WELCOME | STATUS_CHANGE_ACTIVE | STATUS_CHANGE_EXPIRED
 * @param {string} [data.ownerName]   - Gym owner name (for SaaS receipts)
 * @param {string} [data.gymId]       - Gym ID (for SaaS receipts)
 * @returns {Promise<Buffer>} PDF file as a Node.js Buffer
 */
function generateReceiptPdf(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A5',
        margin: 28,
        info: {
          Title: `Receipt ${data.receiptNo || ''}`.trim(),
          Author: data.gymName || 'GymCentric',
          Subject: 'Official Gym Billing Receipt'
        }
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const isSaas = data.type === 'SAAS' || data.type === 'SAAS_WELCOME';
      const isStatusChange =
        data.type === 'STATUS_CHANGE_ACTIVE' || data.type === 'STATUS_CHANGE_EXPIRED';
      const receiptLabel = data.receiptNo || `NTF-${Date.now().toString().slice(-4)}`;
      const displayDate =
        data.date ||
        new Date()
          .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          .replace(/ /g, '-');

      const left = 28;
      const pageWidth = doc.page.width - left * 2;

      // ── Outer subtle border ───────────────────────────────────
      doc
        .roundedRect(18, 18, doc.page.width - 36, doc.page.height - 36, 10)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      // ── Header Banner ─────────────────────────────────────────
      doc.roundedRect(left, 28, pageWidth, 66, 8).fill('#0f172a');
      doc.rect(left, 28, 5, 66).fill('#06b6d4');

      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('#ffffff')
        .text(data.gymName || 'GymCentric', left + 16, 40, { width: pageWidth - 130 });

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#22d3ee')
        .text(
          isSaas
            ? 'SAAS PLATFORM INVOICE'
            : isStatusChange
            ? 'MEMBERSHIP STATUS NOTICE'
            : 'OFFICIAL FEE PAYMENT RECEIPT',
          left + 16,
          66,
          { width: pageWidth - 130 }
        );

      // Right-aligned status pill inside header
      const pillText = isStatusChange
        ? data.type === 'STATUS_CHANGE_ACTIVE'
          ? 'ACTIVE'
          : 'EXPIRED'
        : 'PAID';
      const pillBg =
        isStatusChange && data.type === 'STATUS_CHANGE_EXPIRED' ? '#e11d48' : '#10b981';

      doc.roundedRect(left + pageWidth - 78, 44, 64, 22, 11).fill(pillBg);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#ffffff')
        .text(pillText, left + pageWidth - 78, 51, { width: 64, align: 'center' });

      // ── Receipt Meta Bar (high contrast dark text on light tint) ─
      const metaY = 106;
      doc
        .roundedRect(left, metaY, pageWidth, 42, 6)
        .fillAndStroke('#f8fafc', '#cbd5e1');

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#64748b')
        .text(isStatusChange ? 'NOTICE NO.' : 'RECEIPT NO.', left + 12, metaY + 8);
      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor('#0f172a')
        .text(`#${receiptLabel}`, left + 12, metaY + 20);

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#64748b')
        .text('DATE', left + pageWidth / 2 - 20, metaY + 8);
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#0f172a')
        .text(displayDate, left + pageWidth / 2 - 20, metaY + 20);

      if (!isStatusChange && data.mode) {
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#64748b')
          .text('PAYMENT MODE', left + pageWidth - 96, metaY + 8, {
            width: 84,
            align: 'right'
          });
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#0284c7')
          .text(String(data.mode).toUpperCase(), left + pageWidth - 96, metaY + 20, {
            width: 84,
            align: 'right'
          });
      }

      // ── Section Title ─────────────────────────────────────────
      let y = 164;
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#0284c7')
        .text(isSaas ? 'GYM & PLAN DETAILS' : 'MEMBER & PLAN DETAILS', left, y);

      y += 14;

      const rows = [];
      if (isSaas) {
        if (data.gymId) rows.push(['Gym ID', data.gymId]);
        if (data.gymName) rows.push(['Gym Name', data.gymName]);
        if (data.ownerName || data.memberName) rows.push(['Owner Name', data.ownerName || data.memberName]);
        if (data.phone) rows.push(['Phone', data.phone]);
        if (data.planName) rows.push(['SaaS Plan', data.planName]);
      } else {
        if (data.memberName) rows.push(['Member Name', data.memberName]);
        if (data.rollNo) rows.push(['Member ID', `#${data.rollNo}`]);
        if (data.phone) rows.push(['Phone Number', data.phone]);
        if (data.planName) rows.push(['Membership Plan', data.planName]);
        if (data.shift) rows.push(['Training Shift', data.shift]);
      }
      if (data.validUntil) rows.push(['Valid Until', data.validUntil]);

      const rowHeight = 26;
      const tableHeight = rows.length * rowHeight;

      doc
        .roundedRect(left, y, pageWidth, tableHeight, 6)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      rows.forEach(([label, value], idx) => {
        const rowY = y + idx * rowHeight;
        if (idx % 2 === 0) {
          doc.rect(left + 1, rowY + 1, pageWidth - 2, rowHeight - 1).fill('#f8fafc');
        }
        if (idx > 0) {
          doc
            .moveTo(left, rowY)
            .lineTo(left + pageWidth, rowY)
            .strokeColor('#e2e8f0')
            .lineWidth(0.75)
            .stroke();
        }

        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor('#475569')
          .text(label, left + 12, rowY + 8, { width: 140 });

        doc
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .fillColor('#0f172a')
          .text(String(value), left + 150, rowY + 8, {
            width: pageWidth - 162,
            align: 'right'
          });
      });

      y += tableHeight + 16;

      // ── Amount Paid / Status Summary Card ─────────────────────
      doc.roundedRect(left, y, pageWidth, 48, 8).fill('#0f172a');

      if (isStatusChange || data.amount === undefined || data.amount === null) {
        const isReactivated = data.type === 'STATUS_CHANGE_ACTIVE';
        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor('#94a3b8')
          .text('Membership Status', left + 16, y + 18);

        doc
          .font('Helvetica-Bold')
          .fontSize(13)
          .fillColor(isReactivated ? '#34d399' : '#fb7185')
          .text(
            isReactivated ? 'ACTIVE (REACTIVATED)' : 'EXPIRED (DEACTIVATED)',
            left + 140,
            y + 16,
            { width: pageWidth - 156, align: 'right' }
          );
      } else {
        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor('#cbd5e1')
          .text('Total Amount Paid', left + 16, y + 18);

        doc
          .font('Helvetica-Bold')
          .fontSize(15)
          .fillColor('#22d3ee')
          .text(
            `Rs. ${Number(data.amount).toLocaleString('en-IN')}`,
            left + 140,
            y + 15,
            { width: pageWidth - 156, align: 'right' }
          );
      }

      // ── Footer & Audit Trail ──────────────────────────────────
      const footerY = doc.page.height - 86;
      doc
        .moveTo(left, footerY)
        .lineTo(left + pageWidth, footerY)
        .strokeColor('#e2e8f0')
        .lineWidth(0.75)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#334155')
        .text('Thank you for training with ' + (data.gymName || 'GymCentric') + '!', left, footerY + 10, {
          width: pageWidth,
          align: 'center'
        });

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#64748b')
        .text(
          'This is a computer-generated official receipt. No signature required.',
          left,
          footerY + 23,
          { width: pageWidth, align: 'center' }
        );

      doc
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor('#94a3b8')
        .text(
          `Powered by GymCentric Smart Gym OS  |  Audit ID: ${receiptLabel}  |  ${new Date().toISOString()}`,
          left,
          footerY + 37,
          { width: pageWidth, align: 'center' }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateReceiptPdf };
