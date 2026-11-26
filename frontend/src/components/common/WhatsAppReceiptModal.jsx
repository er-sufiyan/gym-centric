import React, { useState } from 'react';
import { X, Send, CheckCircle2, Copy, Receipt, MessageCircle, Sparkles, ShieldCheck } from 'lucide-react';

function sanitizePhoneForWa(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export default function WhatsAppReceiptModal({ isOpen, onClose, receipt, onSent }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !receipt) return null;

  const isSaas = receipt.type === 'SAAS' || receipt.type === 'SAAS_WELCOME' || receipt.type === 'SAAS_ACTIVE_PLAN';
  const isWelcome = receipt.type === 'MEMBER_WELCOME' || receipt.type === 'SAAS_WELCOME';
  const isPlanSummary = receipt.type === 'SAAS_ACTIVE_PLAN';
  const receiptId = receipt.receiptNo || receipt.invoiceNo || `RCP-${Math.floor(1000 + Math.random() * 9000)}`;

  let messageLines = [];

  if (receipt.type === 'SAAS_ACTIVE_PLAN') {
    messageLines = [
      `📋 *GymCentric — Active SaaS Plan Details*`,
      ``,
      `🏋️ *Gym:* ${receipt.gymName} (${receipt.gymId})`,
      `👤 *Owner:* ${receipt.recipientName}`,
      `📞 *Phone:* ${receipt.recipientPhone}`,
      receipt.address ? `📍 *Address:* ${receipt.address}` : null,
      `🚀 *Active Plan:* ${receipt.planName}`,
      `📊 *Status:* ${receipt.status}`,
      receipt.validUntil ? `✅ *Valid Until:* ${receipt.validUntil} (${receipt.daysLeft > 0 ? `${receipt.daysLeft} days left` : 'Expired'})` : null,
      receipt.activeMembersCount !== undefined ? `👥 *Active Members:* ${receipt.activeMembersCount}` : null,
      ``,
      `Powered by GymCentric Smart Gym OS`
    ].filter((line) => line !== null);
  } else if (receipt.type === 'MEMBER_WELCOME') {
    messageLines = [
      `👋 *Welcome to ${receipt.gymName}, ${receipt.recipientName}!*`,
      `Your gym membership is now *ACTIVE*. Here are your details:`,
      ``,
      `🆔 *Member ID:* #${receipt.rollNo}`,
      `📋 *Plan:* ${receipt.planName}`,
      `⏰ *Shift:* ${receipt.shift}`,
      `📅 *Admitted On:* ${receipt.date}`,
      receipt.validUntil ? `✅ *Valid Until:* ${receipt.validUntil}` : null,
      `🧾 *Receipt:* #${receiptId} • ₹${Number(receipt.amount).toLocaleString()} (${receipt.mode})`,
      ``,
      `See you on the floor! Stay strong 💪`
    ].filter((line) => line !== null);
  } else if (receipt.type === 'SAAS_WELCOME') {
    messageLines = [
      `👋 *Welcome to GymCentric Smart Gym OS, ${receipt.recipientName}!*`,
      `Your gym workspace for *${receipt.gymName}* is now *ACTIVE*.`,
      ``,
      `🆔 *Gym ID:* ${receipt.gymId}`,
      `🏋️ *Gym Name:* ${receipt.gymName}`,
      receipt.address ? `📍 *Address:* ${receipt.address}` : null,
      `🚀 *SaaS Plan:* ${receipt.planName}`,
      receipt.validUntil ? `✅ *Valid Until:* ${receipt.validUntil}` : null,
      `🧾 *Invoice:* #${receiptId} • ₹${Number(receipt.amount).toLocaleString()} (${receipt.mode})`,
      ``,
      `You can now log in using your registered phone number via WhatsApp 2FA.`
    ].filter((line) => line !== null);
  } else if (receipt.type === 'SAAS') {
    messageLines = [
      `*GymCentric Platform — SaaS Payment Receipt*`,
      `Receipt No: #${receiptId}`,
      `Gym ID: ${receipt.gymId || '-'}`,
      `Gym: ${receipt.gymName}`,
      `Owner: ${receipt.recipientName}`,
      `Plan: ${receipt.planName}`,
      `Amount Paid: ₹${Number(receipt.amount).toLocaleString()} (${receipt.mode})`,
      `Date: ${receipt.date}`,
      receipt.validUntil ? `Valid Until: ${receipt.validUntil}` : null,
      `Thank you for partnering with GymCentric!`
    ].filter(Boolean);
  } else {
    messageLines = [
      `*${receipt.gymName} — Fee Payment Receipt*`,
      `Receipt No: #${receiptId}`,
      `Member ID: #${receipt.rollNo}`,
      `Member: ${receipt.recipientName}`,
      `Plan: ${receipt.planName}`,
      `Amount Paid: ₹${Number(receipt.amount).toLocaleString()} (${receipt.mode})`,
      `Date: ${receipt.date}`,
      receipt.validUntil ? `Valid Until: ${receipt.validUntil}` : null,
      `Thank you for training with ${receipt.gymName}!`
    ].filter(Boolean);
  }

  const formattedMessage = messageLines.join('\n');
  const waPhone = sanitizePhoneForWa(receipt.recipientPhone);
  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(formattedMessage)}`;

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(formattedMessage);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (onSent) {
      onSent(
        isPlanSummary
          ? `Active plan details sent via WhatsApp to ${receipt.recipientName} (${receipt.recipientPhone}).`
          : `${isWelcome ? 'WhatsApp welcome greeting' : 'WhatsApp receipt'} #${receiptId} sent to ${receipt.recipientName} (${receipt.recipientPhone}).`
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b1418] border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#081014]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              {isPlanSummary ? (
                <ShieldCheck className="w-4 h-4" />
              ) : isWelcome ? (
                <Sparkles className="w-4 h-4" />
              ) : (
                <MessageCircle className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400">
                {isPlanSummary
                  ? 'Active Plan Summary'
                  : isWelcome
                  ? 'WhatsApp Welcome Greeting'
                  : 'WhatsApp Receipt'}
              </p>
              <h3 className="text-sm font-bold text-white">
                {isPlanSummary
                  ? 'Send Active Plan Details on WhatsApp'
                  : receipt.type === 'SAAS_WELCOME'
                  ? 'Greet New Gym Owner on WhatsApp'
                  : receipt.type === 'MEMBER_WELCOME'
                  ? 'Greet New Member on WhatsApp'
                  : isSaas
                  ? 'Send SaaS Receipt to Gym Owner'
                  : 'Send Fee Receipt to Member'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Card */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-[#060b0e] border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="flex items-center gap-1.5 font-bold text-cyan-300">
                <Receipt className="w-3.5 h-3.5" /> {isPlanSummary ? receipt.gymName : `#${receiptId}`}
              </span>
              <span className="text-[11px] text-slate-400">{receipt.date || receipt.validUntil}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">{isSaas ? 'Gym Owner' : 'Member'}</span>
              <span className="font-bold text-white">
                {receipt.recipientName}
                {receipt.rollNo ? ` (#${receipt.rollNo})` : receipt.gymId ? ` (${receipt.gymId})` : ''}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">WhatsApp Number</span>
              <span className="font-semibold text-emerald-400">{receipt.recipientPhone || 'Not provided'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Plan</span>
              <span className="font-semibold text-slate-200">{receipt.planName}</span>
            </div>

            {receipt.shift && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Shift</span>
                <span className="font-semibold text-cyan-300">
                  {receipt.shift}
                </span>
              </div>
            )}

            {receipt.validUntil && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Valid Until</span>
                <span className="font-semibold text-cyan-300">{receipt.validUntil}</span>
              </div>
            )}

            {!isPlanSummary && receipt.amount !== undefined && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-slate-300 font-bold">Amount Paid ({receipt.mode})</span>
                <span className="text-base font-extrabold text-emerald-400">
                  ₹{Number(receipt.amount).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* WhatsApp Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                WhatsApp Message Preview
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-slate-300 bg-[#060b0e] border border-slate-800 rounded-xl p-3 max-h-44 overflow-y-auto">
              {formattedMessage}
            </pre>
          </div>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-[#060b0e] font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-3.5 h-3.5" />{' '}
              {isPlanSummary ? 'Send Active Plan' : isWelcome ? 'Send Greeting on WhatsApp' : 'Send via WhatsApp'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
