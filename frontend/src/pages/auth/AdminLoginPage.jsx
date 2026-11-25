import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, Eye, EyeOff, AlertCircle, RefreshCw, ShieldCheck, Clock } from 'lucide-react';
import { apiAdminLogin } from '../../services/api';

function formatCountdown(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function AdminLoginPage({ onAdminLoginSuccess, onGoOwnerPortal }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockSeconds, setLockSeconds] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockSeconds((prev) => {
        if (prev <= 1) {
          setErrorMessage('');
          setAttemptsRemaining(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockSeconds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockSeconds > 0) return;
    setErrorMessage('');

    if (password.length < 10) {
      setErrorMessage('Super Admin password must be at least 10 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiAdminLogin(password);
      if (data.success && data.token) {
        setAttemptsRemaining(null);
        setLockSeconds(0);
        onAdminLoginSuccess(data.token);
      } else {
        setErrorMessage(data.message || 'Authentication failed.');
      }
    } catch (err) {
      if (err.locked && err.retryAfterSeconds > 0) {
        setLockSeconds(err.retryAfterSeconds);
        setAttemptsRemaining(0);
      } else if (err.attemptsRemaining !== undefined) {
        setAttemptsRemaining(err.attemptsRemaining);
      }
      setErrorMessage(err.message || 'Incorrect Super Admin password.');
    } finally {
      setIsLoading(false);
    }
  };

  const isLocked = lockSeconds > 0;

  return (
    <div className="min-h-screen bg-[#060b0e] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-7">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-extrabold text-base text-cyan-400">
              GC
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-wide leading-tight">
                GymCentric<span className="text-cyan-400">.</span>
              </h1>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400 uppercase mt-0.5">
                SUPER ADMIN CONTROL
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            Enter your 10+ character Super Admin password to unlock
          </p>
        </div>

        {/* Password Card */}
        <div className="bg-[#0b1418] rounded-3xl border border-slate-800/90 p-7 sm:p-8 shadow-2xl space-y-5">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Protected Admin Access</h2>
              <p className="text-[11px] text-slate-400">Hashed Auth • 5 attempts/min • 15-min lockout</p>
            </div>
          </div>

          {isLocked ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-rose-300">
                <Clock className="w-4 h-4 text-rose-400" />
                <span>Too Many Failed Attempts — Temporarily Locked</span>
              </div>
              <p className="text-3xl font-black text-white tracking-widest tabular-nums">
                {formatCountdown(lockSeconds)}
              </p>
              <p className="text-[11px] text-rose-200/80">
                Please wait 15 minutes before retrying Super Admin login.
              </p>
            </div>
          ) : (
            errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1 text-xs text-rose-300">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <p className="text-[11px] text-amber-300 font-semibold pl-6">
                    {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining in this 1-minute window.
                  </p>
                )}
              </div>
            )
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Super Admin Password
                </label>
                <span className="text-[10px] text-slate-500 font-semibold">Min 10 chars</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={10}
                  disabled={isLocked}
                  autoFocus
                  placeholder="Enter 10+ character password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#060b0e] border border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 disabled:opacity-50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isLocked}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : isLocked ? (
                <span>Locked ({formatCountdown(lockSeconds)})</span>
              ) : (
                <>
                  <span>Unlock Super Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {onGoOwnerPortal && (
            <div className="pt-3 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={onGoOwnerPortal}
                className="text-xs text-slate-400 hover:text-cyan-300 transition-colors"
              >
                ← Go to Gym Owner OTP Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
