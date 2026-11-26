import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Send, QrCode, Calendar, Clock, Download, Share2, CheckCircle2 } from 'lucide-react';
import { buildWhatsAppUrl } from '../../utils/whatsapp';

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function buildPassCardPng({ gymName, member, qrCodeValue, qrDataUrl }) {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 960;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#060b0e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Card surface
  drawRoundedRect(ctx, 36, 36, 648, 888, 36);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#1e293b';
  ctx.stroke();

  // Top emerald accent bar
  drawRoundedRect(ctx, 36, 36, 648, 12, 6);
  ctx.fillStyle = '#10b981';
  ctx.fill();

  // Gym Name
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(String(gymName || 'GYMCENTRIC').toUpperCase(), 360, 110);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 18px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('DIGITAL MEMBERSHIP PASS', 360, 144);

  // Divider
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 172);
  ctx.lineTo(640, 172);
  ctx.stroke();

  // Member Name, Roll No, Phone
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(String(member.name || 'Member'), 360, 232);

  // Roll No pill
  const rollText = `Roll No: #${member.rollNo}`;
  drawRoundedRect(ctx, 250, 252, 220, 40, 20);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
  ctx.fill();
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 20px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(rollText, 360, 279);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 22px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`Phone: ${member.phone || '-'}`, 360, 328);

  // White QR container
  drawRoundedRect(ctx, 185, 360, 350, 350, 28);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  if (qrDataUrl) {
    const qrImg = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = qrDataUrl;
    });
    ctx.drawImage(qrImg, 210, 385, 300, 300);
  }

  // Pass Code below QR
  ctx.fillStyle = '#64748b';
  ctx.font = '600 17px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(qrCodeValue, 360, 748);

  // Bottom details box
  drawRoundedRect(ctx, 72, 776, 576, 114, 22);
  ctx.fillStyle = '#060b0e';
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 16px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('SHIFT & PLAN', 102, 814);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`${member.shift} • ${member.planName}`, 102, 850);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 16px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('VALID UNTIL', 618, 814);
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 24px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(String(member.expiryDate || '-'), 618, 850);

  return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export default function QrPassModal({ isOpen, onClose, member, gymProfile }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [passCardUrl, setPassCardUrl] = useState('');
  const [passCardBlob, setPassCardBlob] = useState(null);
  const [actionHint, setActionHint] = useState('');

  const qrCodeValue = member
    ? member.uniqueQrCode || `GYM-${String(gymProfile?.id || '').slice(-4)}-${member.rollNo}`
    : '';

  const gymName = gymProfile?.gymName || 'GymCentric Gym';

  useEffect(() => {
    let active = true;
    let createdObjectUrl = '';

    if (!isOpen || !member || !qrCodeValue) {
      setQrDataUrl('');
      setPassCardUrl('');
      setPassCardBlob(null);
      setActionHint('');
      return;
    }

    QRCode.toDataURL(qrCodeValue, {
      width: 300,
      margin: 1,
      color: {
        dark: '#020617',
        light: '#ffffff'
      }
    })
      .then(async (url) => {
        if (!active) return;
        setQrDataUrl(url);
        const blob = await buildPassCardPng({ gymName, member, qrCodeValue, qrDataUrl: url });
        if (!active || !blob) return;
        createdObjectUrl = URL.createObjectURL(blob);
        setPassCardBlob(blob);
        setPassCardUrl(createdObjectUrl);
      })
      .catch(() => {
        if (active) {
          setQrDataUrl('');
          setPassCardUrl('');
          setPassCardBlob(null);
        }
      });

    return () => {
      active = false;
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [isOpen, member?.id, qrCodeValue, gymName]);

  if (!isOpen || !member) return null;

  // Clean ASCII/Markdown text (no surrogate emojis that turn into diamond ? on Windows WhatsApp)
  const passMessage = [
    `*${gymName} — Digital Membership Pass*`,
    ``,
    `• *Name:* ${member.name}`,
    `• *Roll No:* #${member.rollNo}`,
    `• *Phone:* ${member.phone}`,
    `• *Pass Code:* ${qrCodeValue}`,
    `• *Shift:* ${member.shift}${member.shiftTime ? ` (${member.shiftTime})` : ''}`,
    `• *Plan:* ${member.planName}`,
    `• *Valid Until:* ${member.expiryDate}`,
    ``,
    `Show your Roll No #${member.rollNo} or QR pass card at gym check-in.`
  ].join('\n');

  const waUrl = buildWhatsAppUrl(member.phone, passMessage);

  const canShareFile =
    typeof navigator !== 'undefined' &&
    typeof File !== 'undefined' &&
    Boolean(passCardBlob) &&
    Boolean(navigator.canShare) &&
    navigator.canShare({
      files: [new File([passCardBlob], `pass-${member.rollNo}.png`, { type: 'image/png' })]
    });

  const handleShareCardWithFile = async () => {
    if (!passCardBlob) return;
    try {
      const file = new File([passCardBlob], `${gymName.replace(/\s+/g, '-').toLowerCase()}-pass-${member.rollNo}.png`, {
        type: 'image/png'
      });
      await navigator.share({
        title: `${gymName} Pass #${member.rollNo}`,
        text: passMessage,
        files: [file]
      });
      onClose();
    } catch {
      // User cancelled share sheet
    }
  };

  const handleSendWhatsApp = async () => {
    if (passCardBlob && navigator?.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': passCardBlob })]);
        setActionHint('QR Pass image copied! Press Ctrl+V in WhatsApp chat to attach the card.');
      } catch {
        setActionHint('WhatsApp opened with full details. Use Download Pass Card to attach the QR image.');
      }
    }
    if (waUrl) {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Pass Top Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/50">
          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5" /> Digital Membership Pass
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Digital Pass Card Body */}
        <div className="p-6 text-center">
          {/* Gym Header */}
          <div className="pb-4 border-b border-slate-800/80">
            <h4 className="text-base font-extrabold text-white uppercase tracking-wider">{gymName}</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Verified Smart Pass • Powered by GymCentric</p>
          </div>

          {/* Member Photo & Name */}
          <div className="my-5 flex flex-col items-center">
            <div className="relative">
              <img
                src={
                  member.photoUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces'
                }
                alt={member.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-lg"
              />
              <span className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-md shadow">
                #{member.rollNo}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mt-3">{member.name}</h3>
            <p className="text-xs text-slate-400">{member.phone}</p>
          </div>

          {/* Real Scannable QR Code */}
          <div className="bg-white p-3 rounded-2xl inline-flex flex-col items-center shadow-inner mb-2">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR Pass for ${member.name}`} className="w-36 h-36" />
            ) : (
              <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-500">
                Generating QR...
              </div>
            )}
          </div>
          <p className="text-[10px] font-mono text-slate-400 mb-4 break-all">{qrCodeValue}</p>

          {/* Pass Details Pill */}
          <div className="grid grid-cols-2 gap-2 text-left bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs mb-4">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" /> Shift Slot
              </p>
              <p className="font-bold text-white mt-0.5">{member.shift}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-400" /> Valid Until
              </p>
              <p className="font-bold text-white mt-0.5">{member.expiryDate}</p>
            </div>
          </div>

          {actionHint && (
            <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium flex items-start gap-1.5 text-left">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{actionHint}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {canShareFile && (
              <button
                type="button"
                onClick={handleShareCardWithFile}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Share2 className="w-3.5 h-3.5" /> Share QR Card + Details to WhatsApp
              </button>
            )}

            {waUrl ? (
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 font-bold rounded-xl text-xs transition-colors ${
                  canShareFile
                    ? 'bg-slate-950 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                }`}
              >
                <Send className="w-3.5 h-3.5" /> Send Pass to Member via WhatsApp
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-2.5 px-4 bg-slate-800 text-slate-400 font-bold rounded-xl text-xs cursor-not-allowed"
              >
                Invalid Member Phone Number
              </button>
            )}

            {passCardUrl && (
              <a
                href={passCardUrl}
                download={`member-${member.rollNo}-qr-pass.png`}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" /> Download Pass Card (Name, Roll No, QR)
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
