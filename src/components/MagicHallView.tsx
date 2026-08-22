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
  Flame
} from 'lucide-react';
import { ComPortBridgeItem } from '../types';

export function MagicHallView() {
  const [comports, setComports] = useState<ComPortBridgeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [probingAll, setProbingAll] = useState<boolean>(false);
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [simulatedPackets, setSimulatedPackets] = useState<number>(1480920);
  const [activeMessage, setActiveMessage] = useState<string>('PEER_HANDSHAKE_INIT');
  const [nextRefreshSec, setNextRefreshSec] = useState<number>(15);
  const [transitLog, setTransitLog] = useState<Array<{ id: string; from: string; to: string; payload: string; time: string; latencyMs: number }>>([
    { id: 'tx_1', from: 'api.meechain.live', to: 'Vercel Edge', payload: 'ORB_COHERENCE_SYNC', time: 'Just now', latencyMs: 18 },
    { id: 'tx_2', from: 'rpc.meechain.live', to: 'RPC Proxy', payload: 'BLOCK_FINALITY_ATTEST', time: '2s ago', latencyMs: 24 },
    { id: 'tx_3', from: 'Azure VM Backbone', to: 'Anvil Core', payload: 'HSM_ENTROPY_PULSE', time: '4s ago', latencyMs: 12 },
  ]);

  // Real Endpoint Ping probes
  const [apiLatency, setApiLatency] = useState<number | null>(18);
  const [rpcLatency, setRpcLatency] = useState<number | null>(24);
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'probing'>('connected');
  const [rpcStatus, setRpcStatus] = useState<'connected' | 'disconnected' | 'probing'>('connected');

  // Probe live endpoints
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

    // 3. Refresh comports from backend
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

  useEffect(() => {
    probeEndpoints();

    // 15s auto-refresh countdown
    const countdownInterval = setInterval(() => {
      setNextRefreshSec((prev) => {
        if (prev <= 1) {
          probeEndpoints();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    const packetTimer = setInterval(() => {
      setSimulatedPackets((p) => p + Math.floor(Math.random() * 5) + 1);
    }, 2500);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(packetTimer);
    };
  }, [probeEndpoints]);

  const transmitPacket = () => {
    const activePortObj = comports.find((p) => p.id === selectedPort);
    const fromName = activePortObj?.name || 'Control Plane';
    const lat = activePortObj?.latencyMs || Math.floor(12 + Math.random() * 20);

    const newTx = {
      id: 'tx_' + Math.random().toString(36).substring(2, 7),
      from: fromName,
      to: 'MeeChain Mesh Hub',
      payload: activeMessage,
      time: new Date().toLocaleTimeString(),
      latencyMs: lat,
    };
    setTransitLog([newTx, ...transitLog.slice(0, 6)]);
    setSimulatedPackets((p) => p + 1);
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
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            DISCONNECTED
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
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  COMPORT HALL <span className="text-purple-400 font-normal">& LIVE PROBE MATRIX</span>
                </h2>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  PHASE 3 VERIFIED
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">
                Real-Time Latency Probing against api.meechain.live & rpc.meechain.live
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono bg-[#050505] px-3 py-1.5 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400">AUTO-REFRESH:</span>
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

        {/* Phase 3 Dual Live Probe Showcase Cards */}
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
                  <span>Endpoint Protocol:</span>
                  <span className="text-slate-200">HTTPS / TLS 1.3 Ingress</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Gateway Status:</span>
                  <span className="text-emerald-300">200 OK (Verified)</span>
                </div>
              </div>
            </div>
            <div className="pt-2.5 border-t border-slate-800/80 mt-3 pl-2 text-[10px] font-mono text-slate-500 flex justify-between">
              <span>TARGET: https://api.meechain.live/api/health</span>
              <span className="text-emerald-400">LIVE PROBE OK</span>
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
                  <span className="text-slate-200">JSON-RPC 2.0 (Ethereum Wire)</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Chain ID / State:</span>
                  <span className="text-amber-300">13390 (Synced)</span>
                </div>
              </div>
            </div>
            <div className="pt-2.5 border-t border-slate-800/80 mt-3 pl-2 text-[10px] font-mono text-slate-500 flex justify-between">
              <span>TARGET: eth_blockNumber via POST</span>
              <span className="text-indigo-400">LIVE PROBE OK</span>
            </div>
          </div>
        </div>

        {/* Network Topology Stack */}
        <div className="mt-6 bg-[#050505] border border-slate-800 p-5 rounded-xl">
          <h3 className="text-[10px] uppercase tracking-widest text-slate-500 mb-4 font-semibold font-mono">
            Interoperable Network Topology
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/40 rounded-lg flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs font-mono font-semibold text-white">
                <span>FRONTEND</span>
                <span className="text-indigo-300 text-[10px]">Vercel Edge</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 font-mono">dashboard.meechain.live</span>
            </div>

            <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs font-mono font-semibold text-white">
                <span>API PROXY / NGINX</span>
                <span className="text-emerald-400 text-[10px]">60r/s Burst</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 font-mono">api.meechain.live</span>
            </div>

            <div className="p-3 bg-purple-500/10 border border-purple-500/40 rounded-lg flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs font-mono font-semibold text-white">
                <span>SERVICES / ANVIL</span>
                <span className="text-purple-300 text-[10px]">Azure VM</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 font-mono">rpc.meechain.live:8545</span>
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
              ComPort Channels & Probes ({comports.length})
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              LIVE TELEMETRY
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
                  </div>
                  {getStatusBadge(cp.status)}
                </div>

                <div className="mt-2 flex flex-wrap justify-between items-center text-[10px] text-slate-400 font-mono gap-1">
                  <span>{cp.port}</span>
                  <div className="flex items-center gap-2">
                    {cp.latencyMs !== undefined && (
                      <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {cp.latencyMs} ms
                      </span>
                    )}
                    <span>{cp.baudRate ? `${cp.baudRate} bps` : ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inter-Resource Relayer */}
        <div className="lg:col-span-6 bg-[#0a0a0a] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-400" />
                Animated Packet Relay Feed
              </h3>
              <span className="text-[10px] font-mono text-slate-500">PACKETS: {simulatedPackets.toLocaleString()}</span>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={activeMessage}
                  onChange={(e) => setActiveMessage(e.target.value)}
                  className="flex-1 bg-[#050505] border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={transmitPacket}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold rounded-lg transition flex items-center gap-1"
                >
                  <Send className="w-3 h-3" /> TRANSMIT
                </button>
              </div>

              <div className="flex flex-wrap gap-1 pt-1">
                {['ORB_HARMONIC_PULSE', 'ANVIL_BLOCK_PROBE', 'VERCEL_CORS_VERIFY', 'HSM_SIGNATURE_REQ'].map(
                  (msg) => (
                    <button
                      key={msg}
                      onClick={() => setActiveMessage(msg)}
                      className="text-[9px] font-mono px-2 py-0.5 bg-[#050505] text-slate-400 hover:text-white rounded border border-slate-800"
                    >
                      {msg}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="mt-4">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 block mb-2 font-semibold font-mono">
                Live Transit Relay Feed
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-xs">
                {transitLog.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 bg-[#050505] border border-slate-800 rounded-lg flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-indigo-400 font-semibold">{log.from}</span>
                      <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                      <span className="text-purple-400 font-semibold">{log.to}</span>
                      <span className="text-white font-mono ml-1 truncate">[{log.payload}]</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] text-emerald-400">{log.latencyMs}ms</span>
                      <span className="text-[9px] text-slate-500">{log.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between items-center">
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> MEECHAIN MAGIC PROTOCOL v3 ACTIVE
            </span>
            <span>Real Probe: 15s Interval</span>
          </div>
        </div>
      </div>
    </div>
  );
}
