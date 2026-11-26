import React, { useState, useMemo } from 'react';
import { X, MessageCircle, CheckCircle2, Clock, AlertTriangle, ExternalLink } from 'lucide-react';

const FILTERS = [
  { id: 'ALL', label: 'All Due' },
  { id: '1D', label: '1 Day Left' },
  { id: '2D', label: '2 Days Left' },
  { id: '3D', label: '3 Days Left' },
  { id: 'EXPIRED', label: 'Expired' }
];

export default function ExpiryRemindersModal({
  isOpen,
  onClose,
  reminders = [],
  onMarkSent
}) {
  const [filter, setFilter] = useState('ALL');

  const counts = useMemo(() => {
    return reminders.reduce(
      (acc, r) => {
        acc[r.milestone] = (acc[r.milestone] || 0) + 1;
        return acc;
      },
      { '1D': 0, '2D': 0, '3D': 0, EXPIRED: 0 }
    );
  }, [reminders]);

  const visibleReminders = useMemo(() => {
    if (filter === 'ALL') return reminders;
    return reminders.filter((r) => r.milestone === filter);
  }, [reminders, filter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b1418] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#081014]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-emerald-400">
                Auto-Written WhatsApp Reminders
              </p>
              <h3 className="text-sm font-bold text-white">
                Expiring (3d / 2d / 1d) &amp; Expired Members
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-[#060b0e]/60 flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => {
            const count = f.id === 'ALL' ? reminders.length : counts[f.id] || 0;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                  filter === f.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-[#0b1418] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {f.label} ({count})
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {visibleReminders.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">
              No members are due for this reminder right now.
            </div>
          ) : (
            visibleReminders.map(({ member, milestone, badge, message, waUrl, alreadySent }) => {
              const badgeStyle =
                milestone === 'EXPIRED'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : milestone === '1D'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';

              return (
                <div
                  key={member.id}
                  className="p-4 rounded-2xl bg-[#060b0e] border border-slate-800/90 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-white text-sm">{member.name}</span>
                      <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                        #{member.rollNo}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyle}`}
                      >
                        {milestone === 'EXPIRED' ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {badge}
                      </span>
                      {alreadySent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Sent ({milestone})
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {member.phone} • Exp: {member.expiryDate}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 bg-[#0b1418] border border-slate-800/80 rounded-xl p-3 leading-relaxed">
                    {message}
                  </p>

                  <div className="flex items-center justify-end">
                    {waUrl ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onMarkSent?.(member, milestone)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors ${
                          alreadySent
                            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-[#060b0e]'
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {alreadySent ? 'Resend on WhatsApp' : 'Send on WhatsApp'}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-rose-400">Invalid phone number</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
