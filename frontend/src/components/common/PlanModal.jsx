import React, { useState } from 'react';
import { X, ShieldCheck, MessageCircle } from 'lucide-react';

export default function PlanModal({ isOpen, onClose, gym, onSave }) {
  if (!isOpen || !gym) return null;

  const [selectedPlan, setSelectedPlan] = useState(gym.saasPlan || 'PRO');
  const [selectedDuration, setSelectedDuration] = useState('1_YEAR');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [sendWhatsAppReceipt, setSendWhatsAppReceipt] = useState(true);

  const pricing = {
    BASE: {
      '1_MONTH': 2000,
      '3_MONTHS': 5000,
      '6_MONTHS': 10000,
      '1_YEAR': 18000
    },
    PRO: {
      '1_MONTH': 3000,
      '3_MONTHS': 8000,
      '6_MONTHS': 15000,
      '1_YEAR': 26000
    }
  };

  const durationLabels = {
    '1_MONTH': '1 Month Pass',
    '3_MONTHS': '3 Months Pass (11%-17% Off)',
    '6_MONTHS': '6 Months Pass (Popular)',
    '1_YEAR': '1 Year Pass (Best Value)'
  };

  const amount = pricing[selectedPlan][selectedDuration];

  const handleActivate = () => {
    onSave({
      gymId: gym.id,
      saasPlan: selectedPlan,
      duration: selectedDuration,
      amount,
      paymentMode,
      sendWhatsAppReceipt
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b1418] border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#081014]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Renew / Update Gym Subscription</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Gym info */}
          <div className="bg-[#060b0e] p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">{gym.gymName}</p>
              <p className="text-[11px] text-slate-400">
                Owner: {gym.ownerName} ({gym.phone})
              </p>
            </div>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                gym.status === 'ACTIVE' ? 'bg-cyan-500/15 text-cyan-300' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {gym.status}
            </span>
          </div>

          {/* Plan Choice */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Select SaaS Plan:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedPlan('BASE')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  selectedPlan === 'BASE'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                    : 'border-slate-800 bg-[#060b0e] text-slate-400'
                }`}
              >
                BASE PLAN
                <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Up to 200 Members • Billing</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan('PRO')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  selectedPlan === 'PRO'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                    : 'border-slate-800 bg-[#060b0e] text-slate-400'
                }`}
              >
                PRO PLAN
                <span className="block text-[10px] font-normal text-cyan-400/80 mt-0.5">Up to 500 Members • QR &amp; Marketing</span>
              </button>
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Select Validity Duration:
            </label>
            <div className="space-y-1.5">
              {Object.keys(pricing[selectedPlan]).map((dur) => (
                <label
                  key={dur}
                  onClick={() => setSelectedDuration(dur)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                    selectedDuration === dur
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-white'
                      : 'border-slate-800 bg-[#060b0e] text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-semibold">{durationLabels[dur]}</span>
                  <span className="font-extrabold text-cyan-300">
                    ₹{pricing[selectedPlan][dur].toLocaleString()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-300">Payment Mode:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('UPI')}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${
                  paymentMode === 'UPI'
                    ? 'bg-cyan-400 text-[#060b0e]'
                    : 'bg-[#060b0e] text-slate-400 border border-slate-800'
                }`}
              >
                UPI Transfer
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('CASH')}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${
                  paymentMode === 'CASH'
                    ? 'bg-cyan-400 text-[#060b0e]'
                    : 'bg-[#060b0e] text-slate-400 border border-slate-800'
                }`}
              >
                Cash
              </button>
            </div>
          </div>

          {/* WhatsApp Receipt Toggle */}
          <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#060b0e] border border-emerald-500/30 cursor-pointer">
            <span className="flex items-center gap-2 text-xs text-slate-200 font-semibold">
              <MessageCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Send WhatsApp Receipt to {gym.ownerName}</span>
            </span>
            <input
              type="checkbox"
              checked={sendWhatsAppReceipt}
              onChange={(e) => setSendWhatsAppReceipt(e.target.checked)}
              className="accent-emerald-400 w-4 h-4 rounded cursor-pointer"
            />
          </label>

          {/* Action Button */}
          <button
            onClick={handleActivate}
            className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-[#060b0e] font-extrabold rounded-xl text-xs transition-colors shadow-lg shadow-cyan-500/20"
          >
            Confirm &amp; Activate (Collect ₹{amount.toLocaleString()})
          </button>
        </div>
      </div>
    </div>
  );
}
