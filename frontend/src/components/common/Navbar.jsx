import React from 'react';
import { Search, Dumbbell, Crown, Lock, ChevronDown } from 'lucide-react';
import Logo from './Logo';

export default function Navbar({
  activeRole,
  setActiveRole,
  searchQuery,
  setSearchQuery,
  gyms = [],
  activeGym,
  onSelectGym,
  onOpenLogin
}) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Left: Brand & Portal Switcher */}
        <div className="flex items-center justify-between w-full lg:w-auto gap-4">
          <Logo size="md" />

          {/* Role Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => {
                setActiveRole('superadmin');
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeRole === 'superadmin'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              Super Admin
            </button>
            <button
              onClick={() => {
                setActiveRole('gym');
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeRole === 'gym'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              Gym Owner
            </button>
          </div>
        </div>

        {/* Center: Contextual Search Bar */}
        <div className="w-full lg:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeRole === 'superadmin'
                ? 'Search active gyms, owners, or members...'
                : 'Search Roll No, Phone, or Member...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Right: Identity, Tenant Switcher (for Gym Owner), & Auth Test */}
        <div className="flex items-center justify-between w-full lg:w-auto gap-2.5">
          {activeRole === 'gym' && activeGym ? (
            <div className="flex items-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800 flex-1 lg:flex-initial">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                  activeGym.status === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {activeGym.logoInitial}
              </div>

              <div className="relative flex-1">
                <select
                  aria-label="Switch Gym Owner Account"
                  value={activeGym.id}
                  onChange={(e) => onSelectGym(e.target.value)}
                  className="appearance-none bg-transparent text-xs font-bold text-white pr-5 focus:outline-none cursor-pointer w-full"
                >
                  {gyms.map((g) => (
                    <option key={g.id} value={g.id} className="bg-slate-900 text-white">
                      {g.gymName} ({g.ownerName}) — {g.status}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      activeGym.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  ></span>
                  <span
                    className={`text-[10px] font-semibold ${
                      activeGym.status === 'ACTIVE' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {activeGym.saasPlan} PLAN • {activeGym.status}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-badge"></span>
              Super Admin Mode
            </div>
          )}

          <button
            onClick={onOpenLogin}
            className="text-xs font-bold text-slate-400 hover:text-emerald-400 border border-slate-800 hover:border-slate-700 bg-slate-950 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 flex-shrink-0"
            title="Preview WhatsApp 2FA Login"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2FA Login</span>
          </button>
        </div>
      </div>
    </header>
  );
}
