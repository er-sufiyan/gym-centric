import React, { useState } from 'react';
import {
  Search,
  ArrowUpRight,
  Lock,
  Menu,
  X,
  Crown,
  Dumbbell,
  ChevronDown
} from 'lucide-react';

export default function SidebarLayout({
  brandInitial = 'GC',
  brandName = 'GymCentric',
  brandSubtitle = 'PLATFORM ADMIN',
  navItems = [],
  activeTab,
  onSelectTab,
  activeRole,
  setActiveRole,
  gyms = [],
  activeGym,
  onSelectGym,
  searchQuery,
  setSearchQuery,
  searchPlaceholder = 'Search...',
  userProfile = { initial: 'SA', name: 'Super Admin', role: 'Administrator' },
  dbConnected = false,
  onOpenLogin,
  children
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between px-4 py-5 select-none">
      <div>
        {/* Brand Block (Matching Reference Top-Left) */}
        <div className="flex items-center justify-between px-2 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-extrabold text-sm text-cyan-400">
              {brandInitial}
            </div>
            <div>
              <p className="text-sm font-extrabold text-white tracking-wide leading-tight">
                {brandName}
                <span className="text-cyan-400">.</span>
              </p>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase mt-0.5">
                {brandSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Navigation */}
        <div className="px-2 mb-2">
          <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Workspace</p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 border border-cyan-500/30 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </span>
                {item.count !== undefined && (
                  <span
                    className={`text-[11px] tabular-nums ${
                      isActive ? 'text-cyan-300 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Links & Profile (Matching Reference Bottom-Left) */}
      <div className="pt-4 border-t border-slate-800/70 space-y-4">
        <div className="space-y-1 px-2">
          <button
            type="button"
            onClick={() => {
              setActiveRole(activeRole === 'superadmin' ? 'gym' : 'superadmin');
              setSearchQuery('');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 py-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{activeRole === 'superadmin' ? 'Open Gym Owner Portal' : 'Open Super Admin Portal'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenLogin}
            className="w-full flex items-center gap-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>2FA Login / Switch</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 px-2 pt-3 border-t border-slate-800/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-xs font-bold text-cyan-300 flex-shrink-0">
              {userProfile.initial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{userProfile.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{userProfile.role}</p>
            </div>
          </div>
          <span
            title={dbConnected ? 'Connected to MongoDB API' : 'Offline Demo Data (Start backend for MongoDB)'}
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              dbConnected ? 'bg-emerald-400 pulse-badge' : 'bg-amber-400'
            }`}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#060b0e] text-slate-100 flex font-sans">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 sidebar-surface border-r sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] sidebar-surface border-r h-full z-10">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Right Column: Minimal Top Header + Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (Matching Reference Top Header) */}
        <header className="sticky top-0 z-30 bg-[#060b0e]/90 backdrop-blur-md border-b border-slate-800/70 px-4 lg:px-8 py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-[#0b1418] border border-slate-800 text-slate-300"
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Search Input */}
              <div className="relative w-full max-w-sm">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0b1418] border border-slate-800/90 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
                />
              </div>
            </div>

            {/* Right: Portal Switcher + Tenant Switcher (when in Gym Owner mode) */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center bg-[#0b1418] p-1 rounded-xl border border-slate-800/90 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveRole('superadmin');
                    setSearchQuery('');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    activeRole === 'superadmin'
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  Super Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRole('gym');
                    setSearchQuery('');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    activeRole === 'gym'
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Dumbbell className="w-3.5 h-3.5" />
                  Gym Owner
                </button>
              </div>

              {activeRole === 'gym' && activeGym && (
                <div className="relative bg-[#0b1418] border border-slate-800/90 rounded-xl px-3 py-1.5 flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeGym.status === 'ACTIVE' ? 'bg-cyan-400' : 'bg-rose-400'
                    }`}
                  ></span>
                  <select
                    aria-label="Switch Gym Owner Account"
                    value={activeGym.id}
                    onChange={(e) => onSelectGym(e.target.value)}
                    className="appearance-none bg-transparent text-xs font-semibold text-white pr-5 focus:outline-none cursor-pointer"
                  >
                    {gyms.map((g) => (
                      <option key={g.id} value={g.id} className="bg-[#0b1418] text-white">
                        {g.gymName} ({g.ownerName}) — {g.status}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                </div>
              )}

              <button
                type="button"
                onClick={onOpenLogin}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0b1418] border border-slate-800/90 text-xs font-semibold text-slate-400 hover:text-cyan-300 transition-colors"
                title="Preview 2FA Login"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>2FA</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
