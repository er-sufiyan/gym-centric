import React, { useState } from 'react';
import {
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building2,
  User,
  MapPin,
  Dumbbell,
  Phone
} from 'lucide-react';

const AUTH_API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/dashboard\/?$/, '/auth')
  : typeof window !== 'undefined' && (window.location.port === '3000' || window.location.port === '5173')
  ? 'http://localhost:5000/api/auth'
  : '/api/auth';

const extractLast10 = (raw = '') => String(raw || '').replace(/\D/g, '').slice(-10);

export default function LoginPage({ gyms = [], onLoginSuccess }) {
  const [mode, setMode] = useState('LOGIN'); // 'LOGIN' | 'REGISTER'
  const [step, setStep] = useState('IDENTIFIER'); // 'IDENTIFIER' | 'OTP'

  // Login State (supports Email or Mobile Number)
  const [identifier, setIdentifier] = useState('');
  const [verifiedIdentifier, setVerifiedIdentifier] = useState('');
  const [verifiedDestination, setVerifiedDestination] = useState('');
  const [verifiedGymName, setVerifiedGymName] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notRegisteredOffer, setNotRegisteredOffer] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');

  // Register State
  const [regGymName, setRegGymName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regPlan, setRegPlan] = useState('BASE');

  const switchToRegisterWithInput = () => {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) {
      setRegEmail(trimmed);
    } else if (trimmed) {
      setRegPhone(trimmed);
    }
    setMode('REGISTER');
    setErrorMessage('');
    setNotRegisteredOffer(false);
    setSuccessMessage('');
  };

  // 1. Existing Gym Owner: Enter Email or Mobile Number -> Send OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setNotRegisteredOffer(false);
    setSuccessMessage('');

    const trimmed = identifier.trim();
    const isEmail = trimmed.includes('@');
    const last10 = extractLast10(trimmed);

    if (!trimmed || (!isEmail && last10.length < 10)) {
      setErrorMessage('Please enter a valid registered Email address or 10-digit Mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${AUTH_API_BASE}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmed })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setVerifiedIdentifier(trimmed);
        setVerifiedDestination(data.sentTo || data.email || data.phone || trimmed);
        setVerifiedGymName(data.gymName || 'Your Gym');
        setDevOtpHint(data.devOtp || '');
        setSuccessMessage(data.message || `6-digit OTP sent to ${data.sentTo || trimmed}`);
        setStep('OTP');
      } else {
        setErrorMessage(data.message || 'Unable to send OTP.');
        if (data.notRegistered) {
          setNotRegisteredOffer(true);
        }
      }
    } catch {
      const matched = gyms.find((g) =>
        isEmail
          ? (g.email || '').toLowerCase() === trimmed.toLowerCase()
          : extractLast10(g.phone) === last10
      );
      if (!matched) {
        setErrorMessage('No gym found. Switch to Register New Gym to onboard.');
        setNotRegisteredOffer(true);
      } else {
        setVerifiedIdentifier(trimmed);
        setVerifiedDestination(matched.email || matched.phone);
        setVerifiedGymName(matched.gymName);
        setDevOtpHint('849201');
        setSuccessMessage(`Demo OTP sent to ${matched.email || matched.phone}`);
        setStep('OTP');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. New Gym Owner: Register (with Email + Phone) -> Send OTP Immediately
  const handleRegisterAndSendOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setNotRegisteredOffer(false);
    setSuccessMessage('');

    const last10 = extractLast10(regPhone);
    const cleanEmail = regEmail.trim().toLowerCase();
    if (!regGymName.trim() || !regOwnerName.trim() || !cleanEmail.includes('@') || last10.length < 10) {
      setErrorMessage('Please enter Gym Name, Owner Name, a valid Email, and a 10-digit Mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${AUTH_API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymName: regGymName.trim(),
          ownerName: regOwnerName.trim(),
          email: cleanEmail,
          phone: regPhone.trim(),
          city: regCity.trim() || 'India',
          saasPlan: regPlan
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setVerifiedIdentifier(data.email || data.phone || cleanEmail);
        setVerifiedDestination(data.sentTo || data.email || data.phone || cleanEmail);
        setVerifiedGymName(data.gymName || regGymName.trim());
        setDevOtpHint(data.devOtp || '');
        setSuccessMessage(data.message || 'Gym registered! Check your email for the 6-digit OTP.');
        setStep('OTP');
      } else {
        setErrorMessage(data.message || 'Registration failed.');
      }
    } catch {
      const formatted = `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
      setVerifiedIdentifier(cleanEmail || formatted);
      setVerifiedDestination(cleanEmail || formatted);
      setVerifiedGymName(regGymName.trim());
      setDevOtpHint('849201');
      setSuccessMessage('Offline Demo: Gym prepared! Enter 849201 to verify.');
      setStep('OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Verify 6-Digit OTP -> Open Scoped Gym Owner Dashboard
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const target = verifiedIdentifier || identifier.trim() || regEmail.trim() || regPhone.trim();

    try {
      const response = await fetch(`${AUTH_API_BASE}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: target, otp })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess(data.gym, data.token);
      } else {
        setErrorMessage(data.message || 'Invalid OTP code.');
      }
    } catch {
      const isEmail = target.includes('@');
      const last10 = extractLast10(target);
      const matched = gyms.find((g) =>
        isEmail ? (g.email || '').toLowerCase() === target.toLowerCase() : extractLast10(g.phone) === last10
      );
      if (otp === (devOtpHint || '849201')) {
        onLoginSuccess(
          matched || {
            id: `gym-${Date.now()}`,
            gymName: regGymName.trim() || 'My Fitness Gym',
            ownerName: regOwnerName.trim() || 'Gym Owner',
            email: regEmail.trim().toLowerCase(),
            phone: regPhone.trim() || target,
            city: regCity.trim() || 'India',
            saasPlan: regPlan,
            status: 'ACTIVE'
          },
          'demo-token'
        );
      } else {
        setErrorMessage('Invalid OTP code.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Resend OTP
  const handleResendOtp = async () => {
    setErrorMessage('');
    setIsLoading(true);
    const target = verifiedIdentifier || identifier.trim() || regEmail.trim() || regPhone.trim();

    try {
      const response = await fetch(`${AUTH_API_BASE}/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: target })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setDevOtpHint(data.devOtp || '');
        setSuccessMessage(data.message || `Fresh OTP sent to ${data.sentTo || target}`);
      } else {
        setErrorMessage(data.message || 'Could not resend OTP.');
      }
    } catch {
      setDevOtpHint('849201');
      setSuccessMessage(`Fresh demo OTP sent to ${target}`);
    } finally {
      setIsLoading(false);
    }
  };

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
                GYM OWNER PORTAL
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            Sign in with your registered Email or Mobile OTP to manage your gym
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#0b1418] rounded-3xl border border-slate-800/90 p-7 sm:p-8 shadow-2xl">
          {step === 'IDENTIFIER' && (
            <div className="flex bg-[#060b0e] p-1 rounded-2xl border border-slate-800/90 mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMessage('');
                  setNotRegisteredOffer(false);
                  setSuccessMessage('');
                }}
                className={`flex-1 py-2.5 rounded-xl transition-all ${
                  mode === 'LOGIN'
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gym Owner Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setErrorMessage('');
                  setNotRegisteredOffer(false);
                  setSuccessMessage('');
                }}
                className={`flex-1 py-2.5 rounded-xl transition-all ${
                  mode === 'REGISTER'
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Register New Gym
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              {notRegisteredOffer && (
                <button
                  type="button"
                  onClick={switchToRegisterWithInput}
                  className="text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1 pl-6"
                >
                  Register as a new gym <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-2.5 text-xs text-cyan-200">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {step === 'OTP' ? (
            /* STEP 2: 6-DIGIT OTP VERIFICATION */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center pb-1">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">Enter 6-Digit OTP</h2>
                <p className="text-xs text-slate-400 mt-1">
                  For <strong className="text-white">{verifiedGymName}</strong> ({verifiedDestination})
                </p>
              </div>

              {devOtpHint && (
                <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-center">
                  <p className="text-[11px] text-cyan-300 font-semibold">
                    OTP Preview (add Gmail SMTP env vars for live inbox delivery):
                  </p>
                  <p className="text-2xl font-black text-white tracking-[0.25em] mt-1">{devOtpHint}</p>
                </div>
              )}

              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-[#060b0e] border border-cyan-500/50 rounded-2xl py-3.5 text-center text-2xl font-black tracking-[0.5em] text-white focus:outline-none focus:border-cyan-400 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length < 6}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Verify & Manage My Gym</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setStep('IDENTIFIER');
                    setOtp('');
                    setDevOtpHint('');
                    setSuccessMessage('');
                    setErrorMessage('');
                  }}
                  className="hover:text-white transition-colors"
                >
                  ← Change Account
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          ) : mode === 'LOGIN' ? (
            /* STEP 1A: EXISTING GYM OWNER EMAIL OR MOBILE NUMBER */
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Registered Email or Mobile Number
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="owner@gmail.com or 9876543210"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  OTP is sent free to your registered email address.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {gyms.length > 0 && (
                <div className="pt-3 border-t border-slate-800/80">
                  <p className="text-[11px] text-slate-500 mb-2 font-medium">Demo gyms:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {gyms.slice(0, 3).map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setIdentifier(g.email || extractLast10(g.phone))}
                        className="px-2.5 py-1 rounded-lg bg-[#060b0e] border border-slate-800 hover:border-cyan-500/40 text-[11px] text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
                      >
                        <Dumbbell className="w-3 h-3 text-cyan-400" />
                        <span>{g.gymName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          ) : (
            /* STEP 1B: NEW GYM OWNER REGISTRATION */
            <form onSubmit={handleRegisterAndSendOtp} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Gym Name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Fitness Studio"
                    value={regGymName}
                    onChange={(e) => setRegGymName(e.target.value)}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Owner Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Verma"
                    value={regOwnerName}
                    onChange={(e) => setRegOwnerName(e.target.value)}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Email Address (For Free OTP Login)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="owner@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-[#060b0e] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full bg-[#060b0e] border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    City
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Indore"
                      value={regCity}
                      onChange={(e) => setRegCity(e.target.value)}
                      className="w-full bg-[#060b0e] border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Platform Plan
                </label>
                <select
                  value={regPlan}
                  onChange={(e) => setRegPlan(e.target.value)}
                  className="w-full bg-[#060b0e] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="BASE">Base Plan (Starter • 30 Days Active)</option>
                  <option value="PRO">Pro Plan (QR Pass & Marketing • 30 Days Active)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Register & Send Email OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-5 text-[11px] text-slate-500">
          Protected by GymCentric Free Email & OTP Verification
        </p>
      </div>
    </div>
  );
}
