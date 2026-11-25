import React from 'react';

export default function StatCard({ title, value, subtext, icon: Icon, color = 'cyan' }) {
  const colorMap = {
    cyan: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'hover:border-cyan-500/40'
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'hover:border-emerald-500/40'
    },
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'hover:border-amber-500/40'
    },
    rose: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'hover:border-rose-500/40'
    },
    blue: {
      bg: 'bg-sky-500/10',
      text: 'text-sky-400',
      border: 'hover:border-sky-500/40'
    }
  };

  const current = colorMap[color] || colorMap.cyan;

  return (
    <div className={`glass-card p-5 rounded-2xl transition-all ${current.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-3xl font-extrabold text-white tracking-tight tabular-nums leading-none">
            {value}
          </h3>
          <p className="text-xs font-medium text-slate-300 mt-2.5">{title}</p>
          {subtext && <p className="text-[11px] text-slate-500 mt-1">{subtext}</p>}
        </div>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl ${current.bg} ${current.text} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
