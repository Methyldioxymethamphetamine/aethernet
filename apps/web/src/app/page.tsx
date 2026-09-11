"use client";

import { useState } from "react";
import { TelemetryGrid } from "@/components/telemetry-grid";
import { TerminalView } from "@/components/terminal-view";
import { HealthNodes } from "@/components/health-nodes";
import { AIChat } from "@/components/ai-chat";
import { Activity, Terminal, Bot } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"terminal" | "chat">("terminal");

  return (
    <main className="flex-1 p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <Activity className="text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">AetherNet NOC</h1>
            <p className="text-sm text-slate-400 font-mono">AUTONOMOUS TELEMETRY ENGINE</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Tab Switcher */}
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab("terminal")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "terminal"
                  ? "bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Terminal size={14} />
              <span>Terminal Stream</span>
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "chat"
                  ? "bg-purple-950 text-purple-300 font-bold border border-purple-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Bot size={14} />
              <span>AI Ops Assistant</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-4 text-xs font-mono text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>SYS.OP.NORMAL</span>
            </div>
            <span>|</span>
            <span>v1.0.0-release</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <TelemetryGrid />

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[460px]">
        <div className="lg:col-span-3 h-full overflow-hidden">
          {activeTab === "terminal" ? <TerminalView /> : <AIChat />}
        </div>
        <div className="lg:col-span-1 h-full overflow-y-auto">
          <HealthNodes />
        </div>
      </div>
    </main>
  );
}
