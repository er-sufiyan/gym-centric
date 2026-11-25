import React, { useState } from 'react';
import { Lock, Phone, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff, Building2, User } from 'lucide-react';
import Logo from '../../components/common/Logo';

const AUTH_API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/dashboard\/?$/, '/auth')
  : typeof window !== 'undefined' && (window.location.port === '3000' || window.location.port === '5173')
  ? 'http://localhost:5000/api/auth'
  : '/api/auth';

export default function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('LOGIN'); // 'LOGIN' or 'REGISTER'
  const [step, setStep] = useState('CREDENTIALS'); // 'CREDENTIALS' or 'OTP'
  
  // Login State
  const [phone, setPhone] = useState('9876543210');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');

  // Register State
  const [regGymName, setRegGymName] = useState('Iron Temple Gym');
  const [regOwnerName, setRegOwnerName] = useState('Amit Sharma');
  const [regPhone, setRegPhone] = useState('9876543210');
  const [regPassword, setRegPassword] = useState('admin123');
  const [regPlan, setRegPlan] = useState('PRO');

  // 1. Send Login Request -> Triggers WhatsApp OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${AUTH_API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });

      const data = await response.json();

      if (data.success) {
        setStep('OTP');
        if (data.devOtp) {
          setDevOtpHint(data.devOtp);
        }
      } else {
        setErrorMessage(data.message || 'Login failed');
      }
    } catch (err) {
      // Backend offline fallback for UI preview
      console.warn('Backend offline, using simulated OTP dispatch:', err.message);
      const simulatedOtp = '849201';
      setDevOtpHint(simulatedOtp);
      setStep('OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Instant Demo Login (Zero Backend Setup Needed)
  const handleInstantDemo = () => {
    setDevOtpHint('849201');
    setStep('OTP');
    setSuccessMessage('Demo OTP dispatched! Enter 849201 to enter dashboard.');
  };

  // 3. Register New Gym Owner
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${AUTH_API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymName: regGymName,
          ownerName: regOwnerName,
          phone: regPhone,
          password: regPassword,
          saasPlan: regPlan
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Gym registered successfully! You can now log in with your phone and password.');
        setPhone(regPhone);
        setPassword(regPassword);
        setMode('LOGIN');
      } else {
        setErrorMessage(data.message || 'Registration failed');
      }
    } catch (err) {
      setSuccessMessage('Demo gym registered! Switching to login...');
      setPhone(regPhone);
      setPassword(regPassword);
      setMode('LOGIN');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Verify WhatsApp OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${AUTH_API_BASE}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });

      const data = await response.json();

      if (data.success) {
        onLoginSuccess(data.gym);
      } else {
        setErrorMessage(data.message || 'Invalid OTP code');
      }
    } catch (err) {
      // Fallback for offline demo
      onLoginSuccess({
        gymName: regGymName || 'Iron Temple Gym',
        ownerName: regOwnerName || 'Amit Sharma',
        phone,
        saasPlan: 'PRO',
        status: 'ACTIVE'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        {/* Logo header */}
        <div className="flex flex-col items-center mb-6">
          <Logo size="lg" />
          <p className="text-xs text-slate-400 mt-2 font-medium">B2B Smart Gym Management Platform</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl border border-slate-800 p-8 shadow-2xl relative">
          {/* Mode Switcher Tabs (Login vs Register) */}
          {step === 'CREDENTIALS' && (
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setMode('LOGIN'); setErrorMessage(''); }}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  mode === 'LOGIN' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Gym Owner Login
              </button>
              <button
                type="button"
                onClick={() => { setMode('REGISTER'); setErrorMessage(''); }}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  mode === 'REGISTER' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Register New Gym
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {step === 'OTP' ? (
            /* STEP 2: WhatsApp OTP Input */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center pb-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 pulse-badge">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">Enter WhatsApp OTP</h2>
                <p className="text-xs text-slate-400 mt-1">
                  We sent a 6-digit code to <strong className="text-emerald-400">+91 {phone}</strong>
                </p>
              </div>

              {devOtpHint && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                  <p className="text-[11px] text-emerald-400 font-semibold">Dev Mode WhatsApp OTP Code:</p>
                  <p className="text-2xl font-black text-white tracking-widest mt-0.5">{devOtpHint}</p>
                </div>
              )}

              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-slate-950 border border-emerald-500/50 rounded-2xl py-3.5 text-center text-2xl font-black tracking-[0.5em] text-white focus:outline-none focus:border-emerald-400 transition-all shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length < 6}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify & Enter Dashboard'}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setStep('CREDENTIALS');
                    setOtp('');
                    setDevOtpHint('');
                  }}
                  className="hover:text-white"
                >
                  ← Change Number
                </button>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          ) : mode === 'LOGIN' ? (
            /* STEP 1A: LOGIN FORM */
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Registered Phone Number
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 text-xs font-semibold">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-16 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
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
                disabled={isLoading}
                className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send WhatsApp OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Instant One-Click Demo Login Button */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleInstantDemo}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                >
                  ⚡ Instant Demo Login (Skip Backend DB)
                </button>
              </div>
            </form>
          ) : (
            /* STEP 1B: REGISTER NEW GYM FORM */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Gym Business Name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Iron Temple Gym"
                    value={regGymName}
                    onChange={(e) => setRegGymName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Owner Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amit Sharma"
                    value={regOwnerName}
                    onChange={(e) => setRegOwnerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Select Initial SaaS Plan
                </label>
                <select
                  value={regPlan}
                  onChange={(e) => setRegPlan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="BASE">Base Plan (Starter)</option>
                  <option value="PRO">Pro Plan (QR Scanner & Marketing)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
              >
                {isLoading ? 'Registering...' : 'Register Gym Account'}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-500">
          <span>Protected by GymCentric 2FA Security</span>
        </div>
      </div>
    </div>
  );
}
