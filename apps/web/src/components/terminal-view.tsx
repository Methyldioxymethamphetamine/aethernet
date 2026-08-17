"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useTelemetryStore } from "@/store/telemetry";

export function TerminalView() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const { setMetrics, addLog } = useTelemetryStore();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new Terminal({
      theme: {
        background: '#0f172a', // slate-900
        foreground: '#f8fafc', // slate-50
        cursor: '#22d3ee', // cyan-400
        selectionBackground: 'rgba(34, 211, 238, 0.3)',
      },
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      cursorBlink: true,
      disableStdin: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    termInstance.current = term;

    term.writeln('\x1b[36m[SYSTEM]\x1b[0m Initializing AetherNet Terminal...');
    term.writeln('\x1b[36m[SYSTEM]\x1b[0m Attempting WebSocket connection to backend...');

    // Resize observer
    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
    resizeObserver.observe(terminalRef.current);

    // WebSocket Connection
    let ws: WebSocket;
    const connectWS = () => {
      // Connect to the same host but using ws://
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        term.writeln('\x1b[32m[SUCCESS]\x1b[0m WebSocket connected to metrics stream.');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'metrics' && payload.data) {
            const data = payload.data;
            setMetrics({
              cpu: data.cpu?.usage_percent || 0,
              ram: data.ram?.used_percent || 0,
              gpu: data.gpu?.utilization || 0,
              vram: (data.gpu?.vram_used / data.gpu?.vram_total) * 100 || 0, // mock percentage
            });
            // We can also print summary to term, but it would be too spammy if 100ms
            // Only print errors or specific events
          } else if (payload.type === 'log') {
             term.writeln(payload.data);
             addLog(payload.data);
          }
        } catch (e) {
          console.error("Failed to parse WS message", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        term.writeln('\x1b[31m[ERROR]\x1b[0m WebSocket connection lost. Reconnecting in 3s...');
        setTimeout(connectWS, 3000);
      };
    };

    connectWS();

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      ws.close();
    };
  }, [setMetrics, addLog]);

  return (
    <div className="flex flex-col w-full h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <span className="ml-2 text-xs font-mono text-slate-400">root@aethernet:~/pipeline</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-online animate-pulse' : 'bg-danger'}`}></div>
          <span className="text-[10px] uppercase font-mono text-slate-500">{isConnected ? 'Live' : 'Offline'}</span>
        </div>
      </div>
      <div ref={terminalRef} className="flex-1 w-full p-4 overflow-hidden" />
    </div>
  );
}
