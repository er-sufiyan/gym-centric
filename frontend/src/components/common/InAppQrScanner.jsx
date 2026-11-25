import React, { useState } from 'react';
import { Camera, X, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

export default function InAppQrScanner({ isOpen, onClose, members = [] }) {
  const [scanResult, setScanResult] = useState(null);

  if (!isOpen) return null;

  const simulateScan = (member) => {
    setScanResult(member);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">In-App Mobile QR Scanner</h3>
              <p className="text-[11px] text-emerald-400 font-medium">Pro Plan Exclusive • Zero Hardware</p>
            </div>
          </div>
          <button
            onClick={() => {
              setScanResult(null);
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport / Camera Box */}
        <div className="p-5">
          <div className="relative aspect-square max-w-[280px] mx-auto rounded-2xl bg-slate-950 border-2 border-dashed border-emerald-500/50 flex flex-col items-center justify-center overflow-hidden">
            {/* Viewfinder crosshairs */}
            <div className="absolute inset-4 pointer-events-none">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400"></div>
            </div>

            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center pulse-badge mb-2">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-300 font-medium">Phone Camera Viewfinder</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Align member's digital QR code inside frame</p>
          </div>

          {/* Quick Member Simulation Trigger */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Simulate Scan Test:
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => simulateScan(m)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-emerald-500 rounded-lg text-xs font-medium text-slate-200 flex-shrink-0"
                >
                  #{m.rollNo} {m.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Instant Result Pop-up */}
          {scanResult && (
            <div
              className={`mt-4 p-4 rounded-xl border ${
                scanResult.status === 'EXPIRED'
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                  : scanResult.shift === 'EVENING'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              }`}
            >
              <div className="flex items-start gap-3">
                {scanResult.status === 'EXPIRED' ? (
                  <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                ) : scanResult.shift === 'EVENING' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                )}

                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-white text-sm">
                      {scanResult.name} <span className="text-slate-400 font-normal">#{scanResult.rollNo}</span>
                    </p>
                    <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-slate-950/60 uppercase">
                      {scanResult.status}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-300">
                    Shift: <strong>{scanResult.shift}</strong> | Plan: <strong>{scanResult.planName}</strong>
                  </p>
                  <p className="mt-1 font-semibold">
                    {scanResult.status === 'EXPIRED'
                      ? '🔴 ACCESS DENIED: Membership expired! Collect fee before entry.'
                      : scanResult.shift === 'EVENING'
                      ? '🟡 SHIFT WARNING: Evening member arrived during Morning slot!'
                      : '🟢 ACCESS GRANTED: Verified active member.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
