import React from 'react';

export default function Logo({ size = 'md', showSubtitle = true }) {
  const sizeMap = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${sizeMap[size] || sizeMap.md}`}>
      {/* Concentric Orbital Vector Icon */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto aspect-square flex-shrink-0 drop-shadow-md"
      >
        <rect width="100" height="100" rx="24" fill="#0F172A" />
        <rect width="98" height="98" x="1" y="1" rx="23" stroke="#1E293B" strokeWidth="2" />
        {/* Orbital G curve */}
        <path
          d="M 68 32 A 28 28 0 1 0 72 62 L 50 62"
          stroke="#10B981"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Core Centric Node */}
        <circle cx="50" cy="46" r="6" fill="#14B8A6" />
        <circle cx="50" cy="46" r="10" stroke="#10B981" strokeWidth="2" strokeOpacity="0.4" />
      </svg>

      {/* Brand Typography */}
      <div className="flex flex-col justify-center leading-none">
        <span className="font-extrabold tracking-tight text-xl text-white">
          Gym<span className="text-emerald-400">Centric</span>
        </span>
        {showSubtitle && (
          <span className="text-[9px] uppercase tracking-widest font-semibold text-emerald-400/80 mt-1">
            Smart Gym OS
          </span>
        )}
      </div>
    </div>
  );
}
