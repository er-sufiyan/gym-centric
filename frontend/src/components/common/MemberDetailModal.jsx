import React, { useMemo } from 'react';
import { X, Calendar, Clock, IndianRupee, QrCode, RefreshCw, Phone, Sun, Moon, Receipt, MessageCircle, Trash2 } from 'lucide-react';

function parsePaymentDate(dateStr) {
  if (!dateStr) return null;
  // Normalize '15-Nov-2026' or '15 Nov 2026'
  const normalized = String(dateStr).replace(/-/g, ' ');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function MemberDetailModal({
  isOpen,
  onClose,
  member,
  payments = [],
  onRenew,
  onOpenPass,
  onSendReceipt,
  onRemoveMember
}) {
  const { lastYearPayments, olderHiddenCount, lastYearTotal } = useMemo(() => {
    if (!member) {
      return { lastYearPayments: [], olderHiddenCount: 0, lastYearTotal: 0 };
    }

    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const memberPayments = payments.filter(
      (p) =>
        (p.memberId && p.memberId === member.id) ||
        (p.rollNo === member.rollNo && p.memberName === member.name)
    );

    const recent = [];
    let hidden = 0;

    memberPayments.forEach((p) => {
      const d = parsePaymentDate(p.date);
      if (!d || d >= oneYearAgo) {
        recent.push(p);
      } else {
        hidden += 1;
      }
    });

    recent.sort((a, b) => {
      const da = parsePaymentDate(a.date)?.getTime() || 0;
      const db = parsePaymentDate(b.date)?.getTime() || 0;
      return db - da;
    });

    const total = recent.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return { lastYearPayments: recent, olderHiddenCount: hidden, lastYearTotal: total };
  }, [member, payments]);

  if (!isOpen || !member) return null;

  const isMorning = member.shift === 'MORNING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b1418] border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#081014]">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-cyan-400">Member Profile</p>
            <h3 className="text-base font-bold text-white mt-0.5">Full Admission &amp; 1-Year Payment Details</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Identity Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#060b0e] border border-slate-800/90">
            <div className="flex items-center gap-3.5">
              <img
                src={member.photoUrl}
                alt={member.name}
                className="w-14 h-14 rounded-2xl object-cover border border-cyan-500/40"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-lg font-extrabold text-white">{member.name}</h4>
                  <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                    #{member.rollNo}
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" /> {member.phone}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
              {(member.isLeastInteract || (member.status === 'EXPIRED' && member.daysLeft <= -3)) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Least Interact
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  member.status === 'ACTIVE'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    member.status === 'ACTIVE' ? 'bg-cyan-400' : 'bg-rose-400'
                  }`}
                ></span>
                {member.status}
              </span>
            </div>
          </div>

          {/* Admission, Shift Timing & Current Plan Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#060b0e] border border-slate-800/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Admitted On
              </p>
              <p className="text-sm font-extrabold text-white mt-1.5">{member.admittedDate || 'Not Recorded'}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Gym joining date</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#060b0e] border border-slate-800/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                {isMorning ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-cyan-400" />
                )}
                Comes In (Shift)
              </p>
              <p className="text-sm font-extrabold text-white mt-1.5">{member.shift}</p>
              <p className="text-[11px] text-cyan-300/90 mt-0.5">
                {member.shiftTime || (isMorning ? '06:00 AM – 09:00 AM' : '05:30 PM – 08:30 PM')}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#060b0e] border border-slate-800/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Current Validity
              </p>
              <p className="text-sm font-extrabold text-white mt-1.5 truncate" title={member.planName}>
                {member.planName}
              </p>
              <p
                className={`text-[11px] mt-0.5 font-semibold ${
                  member.daysLeft <= 0
                    ? 'text-rose-400'
                    : member.daysLeft <= 3
                    ? 'text-amber-400'
                    : 'text-slate-400'
                }`}
              >
                {member.daysLeft > 0
                  ? `${member.expiryDate} (${member.daysLeft}d left)`
                  : `Expired (${member.expiryDate})`}
              </p>
            </div>
          </div>

          {/* 1-Year Payment History Only */}
          <div className="rounded-2xl bg-[#060b0e] border border-slate-800/90 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-cyan-400" />
                  Payment History (Last 1 Year Only)
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  1-year retention only • Deleted from both site &amp; database after 1 year
                  {olderHiddenCount > 0 ? ` (${olderHiddenCount} expired >1 yr hidden)` : ''}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 px-3 py-1 rounded-xl">
                <IndianRupee className="w-3.5 h-3.5" />
                <span>{lastYearTotal.toLocaleString()} (1Y Total)</span>
              </div>
            </div>

            <div className="divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
              {lastYearPayments.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No payments recorded in the last 1 year.
                </div>
              ) : (
                lastYearPayments.map((p) => (
                  <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-white">{p.planName || 'Membership Fee'}</p>
                      <p className="text-[11px] text-slate-500">{p.date}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                        {p.mode}
                      </span>
                      <span className="font-extrabold text-cyan-300">+₹{Number(p.amount).toLocaleString()}</span>
                      {onSendReceipt && (
                        <button
                          type="button"
                          onClick={() => onSendReceipt(p, member)}
                          className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                          title="Send Receipt via WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" /> Receipt
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-[#081014] flex flex-wrap items-center gap-2.5">
          {onOpenPass && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPass(member);
              }}
              className="flex-1 py-2.5 px-3 bg-[#060b0e] hover:bg-slate-900 border border-slate-700 text-cyan-300 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-4 h-4" /> Digital QR Pass
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onClose();
              onRenew(member);
            }}
            className="flex-1 py-2.5 px-3 bg-cyan-400 hover:bg-cyan-300 text-[#060b0e] font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" /> {member.status === 'EXPIRED' ? 'Renew Now' : 'Renew Membership'}
          </button>

          {onRemoveMember && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRemoveMember(member);
              }}
              className="py-2.5 px-3.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              title="Remove Member & All Data"
            >
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
