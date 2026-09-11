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
        background: '#0a0f1e',
        foreground: '#cbd5e1',   // slate-300 — easier on the eyes
        cursor: '#22d3ee',       // cyan-400
        cursorAccent: '#0a0f1e',
        selectionBackground: 'rgba(34, 211, 238, 0.2)',
        black:   '#0f172a',
        red:     '#f87171',      // red-400
        green:   '#34d399',      // emerald-400
        yellow:  '#fbbf24',      // amber-400
        blue:    '#60a5fa',      // blue-400
        magenta: '#c084fc',      // purple-400
        cyan:    '#22d3ee',      // cyan-400
        white:   '#e2e8f0',      // slate-200
        brightBlack:   '#475569',
        brightRed:     '#fca5a5',
        brightGreen:   '#6ee7b7',
        brightYellow:  '#fde68a',
        brightBlue:    '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan:    '#67e8f9',
        brightWhite:   '#f8fafc',
      },
      fontFamily: 'var(--font-jetbrains-mono), "Fira Code", "Cascadia Code", ui-monospace, monospace',
      fontSize: 14,
      lineHeight: 2.0,
      letterSpacing: 0.5,
      cursorBlink: true,
      cursorStyle: 'bar',
      cursorWidth: 2,
      disableStdin: true,
      scrollback: 1000,
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

  const triggerSelfHealing = () => {
    if (!termInstance.current) return;
    const term = termInstance.current;
    term.writeln('\x1b[35m[AI TRIGGER]\x1b[0m Connecting to AI Orchestrator SSE stream...');

    const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:8000';
    const eventSource = new EventSource(`${orchestratorUrl}/api/agent/trigger?source=ui_button`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'log') {
          term.writeln(payload.data);
          addLog(payload.data);
        } else if (payload.type === 'summary') {
          term.writeln('\x1b[32m[AI ORCHESTRATOR]\x1b[0m Self-healing cycle finished successfully.');
          eventSource.close();
        }
      } catch (e) {
        term.writeln(event.data);
      }
    };

    eventSource.onerror = (err) => {
      term.writeln('\x1b[31m[ERROR]\x1b[0m Could not connect to AI Orchestrator at http://localhost:8000. Ensure "make orchestrator" is running.');
      eventSource.close();
    };
  };

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
        <div className="flex items-center gap-4">
          <button
            onClick={triggerSelfHealing}
            className="px-2.5 py-1 text-[11px] font-mono font-medium text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 rounded shadow-sm hover:border-cyan-400 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>⚡ Trigger AI Self-Heal</span>
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-online animate-pulse' : 'bg-danger'}`}></div>
            <span className="text-[10px] uppercase font-mono text-slate-500">{isConnected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </div>
      <div ref={terminalRef} className="flex-1 w-full p-4 overflow-hidden" />
    </div>
  );
}
