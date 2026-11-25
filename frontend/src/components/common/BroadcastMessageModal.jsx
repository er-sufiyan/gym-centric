import React, { useState, useEffect } from 'react';
import { X, Send, Users, MessageCircle, ExternalLink } from 'lucide-react';

function sanitizePhoneForWa(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length === 10 ? `91${digits}` : digits;
}

export default function BroadcastMessageModal({
  isOpen,
  onClose,
  title = 'Send WhatsApp Message',
  subtitle = 'Select target group and customize your message.',
  groups = [],
  onDispatch
}) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || 'ALL');
  const [message, setMessage] = useState(groups[0]?.defaultMessage || '');
  const [hasEdited, setHasEdited] = useState(false);

  useEffect(() => {
    if (isOpen && groups.length > 0) {
      setSelectedGroupId(groups[0].id);
      setMessage(groups[0].defaultMessage || '');
      setHasEdited(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const recipients = activeGroup?.recipients || [];

  const handleSelectGroup = (grp) => {
    setSelectedGroupId(grp.id);
    if (!hasEdited) {
      setMessage(grp.defaultMessage || '');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || recipients.length === 0) return;

    if (recipients.length === 1) {
      const phone = sanitizePhoneForWa(recipients[0].phone);
      if (phone) {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      }
    }

    if (onDispatch) {
      onDispatch(activeGroup, message);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b1418] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#081014]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400">
                WhatsApp Broadcast
              </p>
              <h3 className="text-sm font-bold text-white">{title}</h3>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-400">{subtitle}</p>

          {/* Target Audience Selector: All, Active, Expired, Remaining */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Select Target Group
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {groups.map((grp) => {
                const isSelected = grp.id === activeGroup?.id;
                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => handleSelectGroup(grp)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-white'
                        : 'bg-[#060b0e] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{grp.label}</span>
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                          isSelected ? 'bg-cyan-400 text-[#060b0e]' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {grp.recipients.length}
                      </span>
                    </div>
                    {grp.hint && <p className="text-[10px] text-slate-500 mt-1 truncate">{grp.hint}</p>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                WhatsApp Message
              </label>
              <button
                type="button"
                onClick={() => {
                  setMessage(activeGroup?.defaultMessage || '');
                  setHasEdited(false);
                }}
                className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Use {activeGroup?.label} Template
              </button>
            </div>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setHasEdited(true);
              }}
              placeholder="Write your WhatsApp message..."
              className="w-full bg-[#060b0e] border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Recipients Preview with Individual WhatsApp Send */}
          <div className="rounded-2xl bg-[#060b0e] border border-slate-800/90 overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Recipients ({recipients.length})
              </span>
              <span className="text-slate-500">Click any person to open WhatsApp directly</span>
            </div>
            <div className="max-h-36 overflow-y-auto divide-y divide-slate-800/50">
              {recipients.length === 0 ? (
                <div className="py-5 text-center text-xs text-slate-500">
                  No recipients in "{activeGroup?.label}".
                </div>
              ) : (
                recipients.map((r) => {
                  const waPhone = sanitizePhoneForWa(r.phone);
                  return (
                    <div key={r.id} className="px-3.5 py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">
                          {r.name}
                          {r.meta ? <span className="text-[10px] text-slate-400 ml-1.5">({r.meta})</span> : null}
                        </p>
                        <p className="text-[10px] text-slate-500">{r.phone}</p>
                      </div>
                      {waPhone && (
                        <a
                          href={`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[10px] font-bold flex items-center gap-1 flex-shrink-0"
                        >
                          WhatsApp <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recipients.length === 0 || !message.trim()}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#060b0e] font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-3.5 h-3.5" /> Send to {activeGroup?.label} ({recipients.length})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
