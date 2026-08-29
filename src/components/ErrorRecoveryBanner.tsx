import React from 'react';
import { AlertTriangle, WifiOff, RefreshCw, CheckCircle2, Volume2 } from 'lucide-react';

interface ErrorRecoveryBannerProps {
  chaosMode: boolean;
  toggleChaosMode: () => void;
  onRetry: () => void;
  lastConnected: Date | null;
  onSpeakAlert?: () => void;
}

export function ErrorRecoveryBanner({
  chaosMode,
  toggleChaosMode,
  onRetry,
  lastConnected,
  onSpeakAlert,
}: ErrorRecoveryBannerProps) {
  if (!chaosMode) return null;

  return (
    <div className="bg-[#0a0a0a] border border-rose-600/50 rounded-xl p-4 text-white shadow-xl mb-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pl-2">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-rose-600/20 text-rose-400 rounded-lg shrink-0">
            <WifiOff className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-mono font-bold text-rose-200 uppercase tracking-wider flex items-center gap-2">
                SIMULATED 503 FAULT INJECTION ACTIVE
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                <Volume2 className="w-2.5 h-2.5" /> Speech Alert Dispatched
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Backend status is Offline (503 Service Unavailable). Audible accessibility notification dispatched.
            </p>
            {lastConnected && (
              <p className="text-[10px] text-slate-500 mt-1 font-mono">
                LAST VALID CONNECTION: {lastConnected.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSpeakAlert && (
            <button
              onClick={onSpeakAlert}
              className="px-2.5 py-1.5 bg-[#050505] hover:bg-slate-900 text-cyan-300 text-xs font-mono rounded border border-cyan-900/50 flex items-center gap-1.5 transition"
              title="Repeat audio announcement"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>REPLAY ALERT</span>
            </button>
          )}
          <button
            onClick={onRetry}
            className="px-3 py-1.5 bg-[#050505] hover:bg-slate-900 text-slate-200 text-xs font-mono rounded border border-slate-800 transition"
          >
            RE-PROBE
          </button>
          <button
            onClick={toggleChaosMode}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold rounded shadow-md transition"
          >
            RESTORE SYSTEM
          </button>
        </div>
      </div>
    </div>
  );
}

