import React from 'react';
import { X, Send, QrCode, Calendar, Clock, Award } from 'lucide-react';

export default function QrPassModal({ isOpen, onClose, member, gymProfile }) {
  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
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
            <h4 className="text-base font-extrabold text-white uppercase tracking-wider">
              {gymProfile?.gymName || 'Iron Temple Gym'}
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Verified Smart Pass • Powered by GymCentric</p>
          </div>

          {/* Member Photo & Name */}
          <div className="my-5 flex flex-col items-center">
            <div className="relative">
              <img
                src={member.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces'}
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

          {/* QR Code Container */}
          <div className="bg-white p-3.5 rounded-2xl inline-block shadow-inner mb-4">
            {/* SVG Vector QR Code Graphic */}
            <svg viewBox="0 0 100 100" className="w-32 h-32 fill-slate-950">
              <path d="M0,0 h30 v30 h-30 z M5,5 v20 h20 v-20 z M10,10 h10 v10 h-10 z" />
              <path d="M70,0 h30 v30 h-30 z M75,5 v20 h20 v-20 z M80,10 h10 v10 h-10 z" />
              <path d="M0,70 h30 v30 h-30 z M5,75 v20 h20 v-20 z M10,80 h10 v10 h-10 z" />
              <path d="M40,10 h10 v10 h-10 z M55,10 h5 v5 h-5 z M45,25 h15 v5 h-15 z" />
              <path d="M40,40 h20 v20 h-20 z M45,45 h10 v10 h-10 z" />
              <path d="M10,40 h15 v5 h-15 z M20,50 h10 v15 h-10 z M65,40 h10 v10 h-10 z M80,45 h15 v15 h-15 z" />
              <path d="M40,70 h15 v10 h-15 z M60,75 h10 v20 h-10 z M75,80 h20 v15 h-20 z" />
            </svg>
          </div>

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

          {/* Action Button: Send WhatsApp */}
          <button
            onClick={() => {
              alert(`Digital Pass sent to ${member.name} (${member.phone}) on WhatsApp!`);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Send className="w-3.5 h-3.5" /> Send Pass to Member via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
