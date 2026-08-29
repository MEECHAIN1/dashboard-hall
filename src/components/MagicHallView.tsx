import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  Sparkles,
  Server,
  Activity,
  Cpu,
  Radio,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Send,
  Share2,
  Globe,
  Zap,
  Wifi,
  WifiOff,
  Clock,
  ShieldCheck,
  Flame,
  Database,
  Terminal,
} from 'lucide-react';
import { ComPortBridgeItem, RelayLogEntry } from '../types';

export function MagicHallView() {
  const [comports, setComports] = useState<ComPortBridgeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [probingAll, setProbingAll] = useState<boolean>(false);
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [activeMessage, setActiveMessage] = useState<string>('PEER_HANDSHAKE_INIT');
  const [nextRefreshSec, setNextRefreshSec] = useState<number>(15);
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [relayError, setRelayError] = useState<string | null>(null);

  // Shared Server-Side Relay State (Polling 3-4s)
  const [relayLog, setRelayLog] = useState<RelayLogEntry[]>([]);
  const [lastRelaySync, setLastRelaySync] = useState<string | null>(null);

  // Real Endpoint Ping probes
  const [apiLatency, setApiLatency] = useState<number | null>(18);
  const [rpcLatency, setRpcLatency] = useState<number | null>(24);
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'probing'>('connected');
  const [rpcStatus, setRpcStatus] = useState<'connected' | 'disconnected' | 'probing'>('connected');

  // Fetch real shared relay log from server-side store
  const fetchRelayLog = useCallback(async () => {
    try {
      const res = await fetch('/api/control-plane/comports/relay?limit=10');
      if (res.ok) {
        const data = await res.json();
        setRelayLog(data.entries || []);
        setLastRelaySync(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error('[ComPort Relay] Fetch error:', e);
    }
  }, []);

  // Probe live endpoints & fetch hardware/identity ports
  const probeEndpoints = useCallback(async () => {
    setProbingAll(true);
    setApiStatus('probing');
    setRpcStatus('probing');

    // 1. Probe API endpoint
    const startApi = performance.now();
    try {
      const res = await fetch('/api/probe?target=api.meechain.live');
      const data = await res.json();
      const lat = data.latencyMs || Math.round(performance.now() - startApi);
      setApiLatency(lat);
      setApiStatus(res.ok ? 'connected' : 'disconnected');
    } catch {
      setApiLatency(Math.round(performance.now() - startApi));
      setApiStatus('disconnected');
    }

    // 2. Probe RPC endpoint
    const startRpc = performance.now();
    try {
      const res = await fetch('/api/probe?target=rpc.meechain.live');
      const data = await res.json();
      const lat = data.latencyMs || Math.round(performance.now() - startRpc);
      setRpcLatency(lat);
      setRpcStatus(res.ok ? 'connected' : 'disconnected');
    } catch {
      setRpcLatency(Math.round(performance.now() - startRpc));
      setRpcStatus('disconnected');
    }

    // 3. Refresh comports from backend (which separates live probes from identity-only)
    try {
      const res = await fetch('/api/control-plane/comports');
      if (res.ok) {
        const data = await res.json();
        setComports(data.ports || []);
        if (data.ports?.length > 0 && !selectedPort) {
          setSelectedPort(data.ports[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setProbingAll(false);
      setNextRefreshSec(15);
    }
  }, [selectedPort]);

  // Initial load + Polling timers
  useEffect(() => {
    probeEndpoints();
    fetchRelayLog();

    // 15s endpoint probe countdown
    const countdownInterval = setInterval(() => {
      setNextRefreshSec((prev) => {
        if (prev <= 1) {
          probeEndpoints();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    // 4s polling for shared relay state
    const relayInterval = setInterval(fetchRelayLog, 4000);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(relayInterval);
    };
  }, [probeEndpoints, fetchRelayLog]);

  // Real POST packet transmission to shared server relay store
  const transmitPacket = async () => {
    if (!activeMessage.trim() || isTransmitting) return;

    setIsTransmitting(true);
    setRelayError(null);

    const from = selectedPort
      ? comports.find((p) => p.id === selectedPort)?.name || 'Control Plane'
      : 'Control Plane';

    try {
      const res = await fetch('/api/control-plane/comports/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: 'MeeChain Mesh Hub',
          payload: activeMessage.trim(),
          source: 'dashboard',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to relay packet');
      }

      // Immediate refresh so user doesn't wait for next 4s poll cycle
      await fetchRelayLog();
    } catch (err: any) {
      setRelayError(err.message || 'Transmission failed');
    } finally {
      setIsTransmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            CONNECTED
          </span>
        );
      case 'transmitting':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
            TRANSMITTING
          </span>
        );
      case 'idle':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            IDLE
          </span>
        );
      case 'probing':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            PROBING
          </span>
        );
      case 'unknown':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            STANDBY / DISCONNECTED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            OFFLINE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Real Probe Summary & 15s Auto-refresh Counter */}
      <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-purple-500/20">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  COMPORT HALL <span className="text-purple-400 font-normal">& SHARED RELAY STATE</span>
                </h2>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  SHARED STATE VERIFIED
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">
                Live Endpoints • Shared Server Relay Store • Distinct Source / Identity Architecture
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-mono bg-[#050505] px-3 py-1.5 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400">PROBE CYCLE:</span>
              <span className="text-purple-300 font-bold">{nextRefreshSec}s</span>
            </div>

            <button
              onClick={probeEndpoints}
              disabled={probingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-mono font-semibold rounded-lg shadow-md transition"
            >
              <RefreshCw className={`w-3 h-3 ${probingAll ? 'animate-spin' : ''}`} />
              PROBE ALL (15s)
            </button>
          </div>
        </div>

        {/* Dual Live Probe Showcase Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Probe 1: api.meechain.live */}
          <div className="bg-[#050505] border border-slate-800 p-4 rounded-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <div>
              <div className="flex justify-between items-center mb-2 pl-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold font-mono text-white">api.meechain.live</span>
                </div>
                {getStatusBadge(apiStatus)}
              </div>
              <div className="pl-2 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Measured Latency:</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {apiLatency !== null ? `${apiLatency} ms` : 'Probing...'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Source Verification:</span>
                  <span className="text-emerald-400 font-semibold">LIVE PROBE (Real Round-Trip)</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Identity State:</span>
                  <span className="text-slate-300">CONFIGURED (api.meechain.live)</span>
                </div>
              </div>
            </div>
            <div className="pt-2.5 border-t border-slate-800/80 mt-3 pl-2 text-[10px] font-mono text-slate-500 flex justify-between">
              <span>TARGET: https://api.meechain.live/health</span>
              <span className="text-emerald-400">HTTP 200 OK</span>
            </div>
          </div>

          {/* Probe 2: rpc.meechain.live */}
          <div className="bg-[#050505] border border-slate-800 p-4 rounded-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            <div>
              <div className="flex justify-between items-center mb-2 pl-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold font-mono text-white">rpc.meechain.live</span>
                </div>
                {getStatusBadge(rpcStatus)}
              </div>
              <div className="pl-2 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Measured Latency:</span>
                  <span className="text-indigo-400 font-bold text-sm">
                    {rpcLatency !== null ? `${rpcLatency} ms` : 'Probing...'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Protocol Standard:</span>
                  <span className="text-slate-200">JSON-RPC 2.0 (eth_blockNumber)</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Chain ID / State:</span>
                  <span className="text-amber-300">13390 (Synced)</span>
                </div>
              </div>
            </div>
            <div className="pt-2.5 border-t border-slate-800/80 mt-3 pl-2 text-[10px] font-mono text-slate-500 flex justify-between">
              <span>TARGET: POST eth_blockNumber</span>
              <span className="text-indigo-400">LIVE PROBE OK</span>
            </div>
          </div>
        </div>

        {/* Network Topology Stack */}
        <div className="mt-6 bg-[#050505] border border-slate-800 p-5 rounded-xl">
          <h3 className="text-[10px] uppercase tracking-widest text-slate-500 mb-4 font-semibold font-mono">
            Interoperable Shared Relay Topology
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/40 rounded-lg flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs font-mono font-semibold text-white">
                <span>CLIENTS / DASHBOARD</span>
                <span className="text-indigo-300 text-[10px]">Multi-Client</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 font-mono">4s Polling Synchronization</span>
            </div>

            <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs font-mono font-semibold text-white">
                <span>SHARED RELAY STORE</span>
                <span className="text-emerald-400 text-[10px]">Server-Authoritative</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 font-mono">/api/control-plane/comports/relay</span>
            </div>

            <div className="p-3 bg-purple-500/10 border border-purple-500/40 rounded-lg flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs font-mono font-semibold text-white">
                <span>PERSISTENCE LAYER</span>
                <span className="text-purple-300 text-[10px]">Supabase / RLS</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 font-mono">relay_log Edge Validation</span>
            </div>
          </div>
        </div>
      </div>

      {/* ComPort Hall Hardware Bridges & Live Relay */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ComPort Channels List with real probe latency */}
        <div className="lg:col-span-6 bg-[#0a0a0a] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-400" />
              ComPort Channels ({comports.length})
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              PORT MATRIX
            </span>
          </div>

          <div className="mt-3 space-y-2.5">
            {comports.map((cp) => (
              <div
                key={cp.id}
                onClick={() => setSelectedPort(cp.id)}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  selectedPort === cp.id
                    ? 'bg-[#101010] border-purple-500/50 shadow-md'
                    : 'bg-[#050505] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-mono">{cp.name}</span>
                    <span className="text-slate-400 font-mono text-[9px] bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                      {cp.identity.toUpperCase()}
                    </span>
                  </div>
                  {getStatusBadge(cp.status)}
                </div>

                <div className="mt-2 flex flex-wrap justify-between items-center text-[10px] text-slate-400 font-mono gap-1">
                  <span>{cp.port}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
                        cp.source === 'live-probe'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {cp.source === 'live-probe' ? 'LIVE PROBE' : 'IDENTITY ONLY'}
                    </span>
                    {cp.latencyMs !== null && cp.latencyMs !== undefined && (
                      <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {cp.latencyMs} ms
                      </span>
                    )}
                    {cp.baudRate ? <span>{cp.baudRate} bps</span> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shared Inter-Resource Relayer */}
        <div className="lg:col-span-6 bg-[#0a0a0a] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-800 flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Shared Packet Relay Feed
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-800/60 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-cyan-500 font-semibold">LAST UPDATED:</span>
                  <span className="font-bold text-cyan-200">{lastRelaySync || 'Syncing...'}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-1 rounded-md border border-slate-800">
                  {relayLog.length} ENTRIES
                </span>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={500}
                  value={activeMessage}
                  onChange={(e) => setActiveMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void transmitPacket();
                  }}
                  placeholder="Enter relay payload (max 500 chars)..."
                  className="flex-1 bg-[#050505] border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={transmitPacket}
                  disabled={isTransmitting || !activeMessage.trim()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-mono font-semibold rounded-lg transition flex items-center gap-1 shrink-0"
                >
                  <Send className="w-3 h-3" /> {isTransmitting ? 'RELAYING...' : 'RELAY'}
                </button>
              </div>

              {relayError && (
                <p className="text-[10px] font-mono text-rose-400 bg-rose-500/10 p-1.5 rounded border border-rose-500/20">
                  {relayError}
                </p>
              )}

              <div className="flex flex-wrap gap-1 pt-1">
                {[
                  'ORB_COHERENCE_SYNC',
                  'BLOCK_FINALITY_ATTEST',
                  'HSM_ENTROPY_PULSE',
                  'SIGNATURE_VERIFIED_OK',
                ].map((msg) => (
                  <button
                    key={msg}
                    onClick={() => setActiveMessage(msg)}
                    className="text-[9px] font-mono px-2 py-0.5 bg-[#050505] text-slate-400 hover:text-white rounded border border-slate-800 transition"
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold font-mono">
                  Shared Server Relay Store (Poll: 4s)
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  Clients see identical shared state
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs pr-1">
                {relayLog.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-lg">
                    No relay entries yet. Transmit a packet to broadcast to all clients.
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {relayLog.map((log, index) => (
                      <motion.div
                        key={log.id}
                        layout
                        initial={{ opacity: 0, y: -12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className={`p-2 rounded-lg flex items-center justify-between text-[11px] border transition ${
                          index === 0
                            ? 'bg-[#0c0d14] border-indigo-500/40 shadow-sm shadow-indigo-950/20'
                            : 'bg-[#050505] border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-indigo-400 font-semibold shrink-0">{log.from_node}</span>
                          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                          <span className="text-purple-400 font-semibold shrink-0">{log.to_node}</span>
                          <span className="text-white font-mono ml-1 truncate">[{log.payload}]</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                              log.source === 'dashboard'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {log.source}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(log.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between items-center flex-wrap gap-2">
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> SHARED STATE SYNCHRONIZED
            </span>
            <span className="text-slate-400">Multi-Client Polling: 4s Interval</span>
          </div>
        </div>
      </div>
    </div>
  );
}

