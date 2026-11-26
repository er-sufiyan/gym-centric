import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, X, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Search } from 'lucide-react';

function getCurrentShiftSlot() {
  const hour = new Date().getHours();
  return hour < 14 ? 'MORNING' : 'EVENING';
}

export default function InAppQrScanner({ isOpen, onClose, members = [], onCheckIn }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const lastScanRef = useRef({ code: '', at: 0 });

  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualQuery, setManualQuery] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const verifyAndRecordScan = useCallback(
    async ({ qrCode = '', member: matchedMember = null }) => {
      if (!matchedMember) {
        setScanResult(null);
        setScanError(
          qrCode
            ? `Unrecognized QR code ("${qrCode.slice(0, 32)}"). No matching member in this gym.`
            : 'No matching member found for that Roll No. / Pass.'
        );
        return;
      }

      setScanError('');
      setIsCheckingIn(true);
      try {
        if (onCheckIn) {
          const updated = await onCheckIn(matchedMember, qrCode);
          setScanResult(updated?.member || matchedMember);
        } else {
          setScanResult(matchedMember);
        }
      } catch (err) {
        setScanResult(matchedMember);
        setScanError(err?.message || 'Check-in update failed');
      } finally {
        setIsCheckingIn(false);
      }
    },
    [onCheckIn]
  );

  const handleDecodedCode = useCallback(
    (rawValue) => {
      const code = String(rawValue || '').trim();
      if (!code) return;

      const now = Date.now();
      if (lastScanRef.current.code === code && now - lastScanRef.current.at < 2500) {
        return;
      }
      lastScanRef.current = { code, at: now };

      const normalized = code.replace(/^#/, '').toLowerCase();
      const matched = members.find((m) => {
        const qr = String(m.uniqueQrCode || '').trim().toLowerCase();
        const roll = String(m.rollNo || '').trim().toLowerCase();
        const id = String(m.id || '').trim().toLowerCase();
        return (qr && qr === code.toLowerCase()) || roll === normalized || id === normalized;
      });

      verifyAndRecordScan({ qrCode: code, member: matched || null });
    },
    [members, verifyAndRecordScan]
  );

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError('');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera API is not supported in this browser. Use Roll No. lookup below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      let lastFrameCheck = 0;
      const tick = (timestamp) => {
        if (!streamRef.current || !videoRef.current) return;
        const video = videoRef.current;

        if (video.readyState === video.HAVE_ENOUGH_DATA && timestamp - lastFrameCheck >= 120) {
          lastFrameCheck = timestamp;
          const canvas = canvasRef.current;
          if (canvas && video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const decoded = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'dontInvert'
            });
            if (decoded?.data) {
              handleDecodedCode(decoded.data);
            }
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access or use Roll No. lookup below.'
          : 'Could not open camera on this device. Use Roll No. lookup below.'
      );
      stopCamera();
    }
  }, [handleDecodedCode, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      setScanResult(null);
      setScanError('');
      setManualQuery('');
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  const handleManualLookup = (e) => {
    e.preventDefault();
    const q = manualQuery.trim();
    if (!q) return;
    handleDecodedCode(q);
  };

  const currentShift = getCurrentShiftSlot();
  const isExpiredResult = scanResult && (scanResult.status === 'EXPIRED' || Number(scanResult.daysLeft ?? 0) <= 0);
  const isShiftMismatch = scanResult && !isExpiredResult && scanResult.shift !== currentShift;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">In-App Mobile QR Scanner</h3>
              <p className="text-[11px] text-emerald-400 font-medium">
                {cameraActive ? 'Live Camera Active • Point at QR Pass' : 'Pro Plan Exclusive • Zero Hardware'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setScanResult(null);
              setScanError('');
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
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`absolute inset-0 w-full h-full object-cover ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder crosshairs */}
            <div className="absolute inset-4 pointer-events-none z-10">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400"></div>
            </div>

            {!cameraActive && (
              <div className="relative z-10 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  {cameraError || 'Starting phone camera...'}
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Camera
                </button>
              </div>
            )}
          </div>

          {/* Manual Roll No / QR Code Fallback */}
          <form onSubmit={handleManualLookup} className="mt-4 pt-4 border-t border-slate-800 space-y-2">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Or Verify by Roll No. / Pass Code:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  placeholder="Enter Roll No (e.g. 106)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={isCheckingIn}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition-colors disabled:opacity-60"
              >
                {isCheckingIn ? 'Checking...' : 'Check In'}
              </button>
            </div>
          </form>

          {/* Quick Member Test Chips */}
          {members.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Quick Member Check-In:
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {members.slice(0, 8).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => verifyAndRecordScan({ qrCode: m.uniqueQrCode || m.rollNo, member: m })}
                    className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-emerald-500 rounded-lg text-xs font-medium text-slate-200 flex-shrink-0"
                  >
                    #{m.rollNo} {m.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {scanError && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              {scanError}
            </div>
          )}

          {/* Instant Result Pop-up */}
          {scanResult && (
            <div
              className={`mt-4 p-4 rounded-xl border ${
                isExpiredResult
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                  : isShiftMismatch
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              }`}
            >
              <div className="flex items-start gap-3">
                {isExpiredResult ? (
                  <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                ) : isShiftMismatch ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                )}

                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-white text-sm">
                      {scanResult.name} <span className="text-slate-400 font-normal">#{scanResult.rollNo}</span>
                    </p>
                    <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-slate-950/60 uppercase">
                      {isExpiredResult ? 'EXPIRED' : 'ACTIVE'}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-300">
                    Shift: <strong>{scanResult.shift}</strong> | Plan: <strong>{scanResult.planName}</strong>
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Valid Until: {scanResult.expiryDate} • Total Check-ins: {scanResult.totalCheckIns || 1}
                  </p>
                  <p className="mt-1.5 font-semibold">
                    {isExpiredResult
                      ? 'ACCESS DENIED: Membership expired! Collect fee before entry.'
                      : isShiftMismatch
                      ? `SHIFT WARNING: ${scanResult.shift} member scanned during ${currentShift} slot.`
                      : 'ACCESS GRANTED: Verified active member & check-in recorded.'}
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
