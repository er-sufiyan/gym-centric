import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Send, QrCode, Calendar, Clock, Download } from 'lucide-react';
import { buildWhatsAppUrl } from '../../utils/whatsapp';

export default function QrPassModal({ isOpen, onClose, member, gymProfile }) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  const qrCodeValue = member
    ? member.uniqueQrCode || `GYM-${String(gymProfile?.id || '').slice(-4)}-${member.rollNo}`
    : '';

  useEffect(() => {
    let active = true;
    if (!isOpen || !member || !qrCodeValue) {
      setQrDataUrl('');
      return;
    }

    QRCode.toDataURL(qrCodeValue, {
      width: 240,
      margin: 1,
      color: {
        dark: '#020617',
        light: '#ffffff'
      }
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [isOpen, member?.id, qrCodeValue]);

  if (!isOpen || !member) return null;

  const gymName = gymProfile?.gymName || 'GymCentric Gym';
  const passMessage = [
    `🎫 *${gymName} — Digital Membership Pass*`,
    ``,
    `👤 *Member:* ${member.name}`,
    `🆔 *Member ID:* #${member.rollNo}`,
    `🔑 *Pass Code:* ${qrCodeValue}`,
    `⏰ *Shift:* ${member.shift} (${member.shiftTime || ''})`,
    `📋 *Plan:* ${member.planName}`,
    `✅ *Valid Until:* ${member.expiryDate}`,
    ``,
    `Show your pass ID #${member.rollNo} or QR code at gym check-in.`
  ].join('\n');

  const waUrl = buildWhatsAppUrl(member.phone, passMessage);

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

          {/* Action Buttons */}
          <div className="space-y-2">
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-3.5 h-3.5" /> Send Pass to Member via WhatsApp
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-2.5 px-4 bg-slate-800 text-slate-400 font-bold rounded-xl text-xs cursor-not-allowed"
              >
                Invalid Member Phone Number
              </button>
            )}

            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`member-${member.rollNo}-qr-pass.png`}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" /> Download QR Image
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
