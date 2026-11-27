const PDFDocument = require('pdfkit');

/**
 * Generate a professional gym fee receipt as a PDF buffer.
 *
 * @param {Object} data - Receipt payload
 * @param {string} data.receiptNo     - e.g. "RCP-4821"
 * @param {string} data.gymName       - Name of the gym
 * @param {string} data.memberName    - Full name of the member
 * @param {string} data.rollNo        - Roll / ID number
 * @param {string} data.phone         - Member phone
 * @param {string} data.planName      - Plan name
 * @param {number} data.amount        - Amount paid
 * @param {string} data.mode          - CASH or UPI
 * @param {string} data.date          - Formatted date string
 * @param {string} [data.shift]       - MORNING / EVENING
 * @param {string} [data.validUntil]  - Expiry date
 * @param {string} [data.type]        - MEMBER | SAAS | MEMBER_WELCOME etc.
 * @param {string} [data.ownerName]   - Gym owner name (for SaaS receipts)
 * @param {string} [data.gymId]       - Gym ID (for SaaS receipts)
 * @returns {Promise<Buffer>} PDF file as a Node.js Buffer
 */
function generateReceiptPdf(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A5',
        margin: 30,
        info: {
          Title: `Receipt ${data.receiptNo}`,
          Author: data.gymName || 'GymCentric',
          Subject: 'Fee Payment Receipt'
        }
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const isSaas = data.type === 'SAAS' || data.type === 'SAAS_WELCOME';
      const pageWidth = doc.page.width - 60; // minus margins

      // ── Header band ───────────────────────────────────────────
      doc.rect(30, 30, pageWidth, 56).fill('#0b1418');

      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('#22d3ee')
        .text(data.gymName || 'GymCentric', 44, 42, { width: pageWidth - 28 });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#94a3b8')
        .text(
          isSaas ? 'SAAS PLATFORM INVOICE' : 'FEE PAYMENT RECEIPT',
          44,
          66,
          { width: pageWidth - 28 }
        );

      // ── Receipt number & date ─────────────────────────────────
      const yMeta = 100;
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#ffffff')
        .text(`Receipt: #${data.receiptNo}`, 30, yMeta);

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#94a3b8')
        .text(`Date: ${data.date || 'N/A'}`, 30, yMeta + 16);

      // ── Divider ───────────────────────────────────────────────
      doc
        .moveTo(30, yMeta + 36)
        .lineTo(30 + pageWidth, yMeta + 36)
        .strokeColor('#1e293b')
        .lineWidth(1)
        .stroke();

      // ── Detail rows ───────────────────────────────────────────
      let y = yMeta + 50;
      const labelX = 30;
      const valueX = 170;
      const lineHeight = 20;

      const addRow = (label, value) => {
        if (!value && value !== 0) return;
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#94a3b8')
          .text(label, labelX, y, { width: 130 });
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor('#e2e8f0')
          .text(String(value), valueX, y, { width: pageWidth - 140 });
        y += lineHeight;
      };

      if (isSaas) {
        addRow('Gym ID', data.gymId || '-');
        addRow('Gym Name', data.gymName);
        addRow('Owner', data.ownerName || data.memberName);
        addRow('Phone', data.phone);
        addRow('SaaS Plan', data.planName);
      } else {
        addRow('Member Name', data.memberName);
        addRow('Member ID', `#${data.rollNo}`);
        addRow('Phone', data.phone);
        addRow('Plan', data.planName);
        if (data.shift) addRow('Shift', data.shift);
      }

      if (data.validUntil) addRow('Valid Until', data.validUntil);

      // ── Amount box ────────────────────────────────────────────
      y += 8;
      doc.rect(30, y, pageWidth, 36).fill('#060b0e');
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#94a3b8')
        .text('Amount Paid', 44, y + 10);
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#22d3ee')
        .text(
          `₹${Number(data.amount).toLocaleString('en-IN')}  (${data.mode || 'CASH'})`,
          valueX,
          y + 8,
          { width: pageWidth - 140 }
        );

      // ── Footer ────────────────────────────────────────────────
      y += 54;
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#64748b')
        .text(
          'This is a computer-generated receipt. No signature required.',
          30,
          y,
          { width: pageWidth, align: 'center' }
        );

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#475569')
        .text('Powered by GymCentric Smart Gym OS', 30, y + 14, {
          width: pageWidth,
          align: 'center'
        });

      // ── Security / audit note ─────────────────────────────────
      y += 36;
      doc
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor('#475569')
        .text(
          `Generated: ${new Date().toISOString()} | Receipt ID: ${data.receiptNo}`,
          30,
          y,
          { width: pageWidth, align: 'center' }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateReceiptPdf };
