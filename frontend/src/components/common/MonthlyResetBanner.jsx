import React from 'react';
import { AlertTriangle, CalendarClock } from 'lucide-react';
import { getCalendarMonthWindow } from '../../utils/billingCycle';

export default function MonthlyResetBanner({ monthLabel, variant = 'monthly' }) {
  const isYearly = variant === 'yearly';

  if (!isYearly) {
    const { daysUntilReset, lastDayOfMonth, monthEndLabel, nextMonthStartLabel } =
      getCalendarMonthWindow();

    // Only show the deletion reminder during the last 3 days of the calendar month
    if (daysUntilReset > 3) {
      return null;
    }

    const countdownTitle =
      daysUntilReset === 1
        ? 'Reminder: History will be deleted tonight (Last Day of Month)'
        : `Reminder: History will be deleted in ${daysUntilReset} days (1-Month Ledger)`;

    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-3.5 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <p className="font-bold text-amber-300">{countdownTitle}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Showing {monthLabel} ({lastDayOfMonth}-day month ending {monthEndLabel}). Starting{' '}
            {nextMonthStartLabel}, a new month section begins from the 1st and past-month ledger
            entries are deleted from both this site and the database.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-3.5 flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
        <CalendarClock className="w-4 h-4" />
      </div>
      <div className="text-xs">
        <p className="font-bold text-amber-300">1-Year Payment History Retention</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Showing transactions from the last 1 year only. Records older than 1 year are
          automatically deleted from both this site and the database.
        </p>
      </div>
    </div>
  );
}
