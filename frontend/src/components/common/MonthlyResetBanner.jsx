import React from 'react';
import { AlertTriangle, CalendarClock } from 'lucide-react';

export default function MonthlyResetBanner({ monthLabel, variant = 'monthly' }) {
  const isYearly = variant === 'yearly';

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-3.5 flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
        {isYearly ? <CalendarClock className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      </div>
      <div className="text-xs">
        <p className="font-bold text-amber-300">
          {isYearly
            ? '1-Year Payment History Retention'
            : 'Reminder: History will be deleted in 2 days (1-Month Ledger)'}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {isYearly
            ? 'Showing transactions from the last 1 year only. Records older than 1 year are automatically deleted from both this site and the database.'
            : `Showing 1-month history only (${monthLabel}). At the beginning of each new month, a new section starts and past-month ledger entries are deleted from both this site and the database.`}
        </p>
      </div>
    </div>
  );
}
