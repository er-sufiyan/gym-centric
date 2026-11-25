import React, { useMemo } from 'react';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShieldCheck,
  Users,
  MessageCircle,
  RefreshCw,
  Power,
  Receipt,
  Trash2
} from 'lucide-react';
import { getOneYearHistory } from '../../utils/billingCycle';
import MonthlyResetBanner from './MonthlyResetBanner';

export default function GymOwnerDetailModal({
  isOpen,
  onClose,
  gym,
  members = [],
  saasPayments = [],
  onSendActivePlan,
  onSendInvoiceReceipt,
  onRenewPlan,
  onToggleStatus,
  onDeleteGym
}) {
  const yearlyHistory = useMemo(() => {
    if (!gym) return getOneYearHistory([]);
    const matching = saasPayments.filter((p) => p.gymId === gym.id || p.gymName === gym.gymName);
    return getOneYearHistory(matching);
  }, [gym, saasPayments]);

  if (!isOpen || !gym) return null;

  const activeMemberCount = members.filter((m) => m.status === 'ACTIVE').length;
  const gymPayments = yearlyHistory.items;
  const totalPaid = yearlyHistory.totalAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b1418] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#081014]">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-cyan-400">
              Gym Tenant &amp; Owner Profile
            </p>
            <h3 className="text-base font-bold text-white mt-0.5">
              Full Details, Address &amp; Active SaaS Plan
            </h3>
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
          {/* Gym & Owner Identity Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#060b0e] border border-slate-800/90">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center font-extrabold text-sm text-cyan-300 flex-shrink-0">
                {gym.logoInitial}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-lg font-extrabold text-white">{gym.gymName}</h4>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                    ID: {gym.id}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-semibold mt-0.5">Owner: {gym.ownerName}</p>
                <div className="flex items-center gap-3 flex-wrap mt-1 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-cyan-400" /> {gym.phone}
                  </span>
                  {gym.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-cyan-400" /> {gym.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <span
              className={`self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                gym.status === 'ACTIVE'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  gym.status === 'ACTIVE' ? 'bg-cyan-400' : 'bg-rose-400'
                }`}
              ></span>
              {gym.status}
            </span>
          </div>

          {/* Full Address Box */}
          <div className="p-4 rounded-2xl bg-[#060b0e] border border-slate-800/80 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Full Gym Address ({gym.city || 'India'})
              </p>
              <p className="text-xs font-semibold text-white mt-1 leading-relaxed">
                {gym.address || `${gym.city || 'India'} (Full address not added)`}
              </p>
            </div>
          </div>

          {/* Active Plan, Validity, Members Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#060b0e] border border-slate-800/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Active SaaS Plan
              </p>
              <p className="text-sm font-extrabold text-cyan-300 mt-1.5">{gym.saasPlan} PLAN</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {gym.saasPlan === 'PRO' ? 'QR Scanner + Marketing' : 'Core Gym Register'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#060b0e] border border-slate-800/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Plan Validity
              </p>
              <p className="text-sm font-extrabold text-white mt-1.5">{gym.validUntil}</p>
              <p
                className={`text-[11px] font-semibold mt-0.5 ${
                  gym.daysLeft <= 0 ? 'text-rose-400' : gym.daysLeft <= 7 ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                {gym.daysLeft > 0 ? `${gym.daysLeft} days remaining` : 'Expired'} • Joined {gym.joinedDate || 'Recently'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#060b0e] border border-slate-800/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" /> Members
              </p>
              <p className="text-sm font-extrabold text-white mt-1.5">
                {activeMemberCount} Active <span className="text-xs font-normal text-slate-400">/ {members.length} Total</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                1-Year Paid: ₹{totalPaid.toLocaleString()}
              </p>
            </div>
          </div>

          <MonthlyResetBanner variant="yearly" />

          {/* SaaS Plan Payment History (1 Year Only) */}
          <div className="rounded-2xl bg-[#060b0e] border border-slate-800/90 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-cyan-400" /> Payment History (Last 1 Year Only)
              </p>
              <span className="text-[11px] text-slate-400">{gymPayments.length} Invoices</span>
            </div>
            <div className="divide-y divide-slate-800/60 max-h-44 overflow-y-auto">
              {gymPayments.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No SaaS payments in the last 1 year.
                </div>
              ) : (
                gymPayments.map((p) => (
                  <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-white">
                        #{p.invoiceNo || 'INV'} • {p.notes}
                      </p>
                      <p className="text-[11px] text-slate-500">{p.date}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                        {p.mode}
                      </span>
                      <span className="font-extrabold text-cyan-300">+₹{Number(p.amount).toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => onSendInvoiceReceipt(p, gym)}
                        className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[10px] font-bold flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" /> Receipt
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-[#081014] flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onSendActivePlan(gym, activeMemberCount);
            }}
            className="flex-1 min-w-[180px] py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-[#060b0e] font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" /> Send Active Plan Detail
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onRenewPlan(gym);
            }}
            className="py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-[#060b0e] font-extrabold rounded-xl text-xs transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Renew Plan
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleStatus(gym.id);
              onClose();
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1.5 ${
              gym.status === 'ACTIVE'
                ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300'
            }`}
          >
            <Power className="w-3.5 h-3.5" /> {gym.status === 'ACTIVE' ? 'Block' : 'Allow'}
          </button>

          {gym.status === 'BLOCKED' && onDeleteGym && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDeleteGym(gym);
              }}
              className="py-2.5 px-4 rounded-xl text-xs font-extrabold bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Gym
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
