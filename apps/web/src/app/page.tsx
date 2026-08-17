import { TelemetryGrid } from "@/components/telemetry-grid";
import { TerminalView } from "@/components/terminal-view";
import { HealthNodes } from "@/components/health-nodes";
import { Activity } from "lucide-react";

export default function Home() {
  return (
    <main className="flex-1 p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Activity className="text-primary animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">AetherNet NOC</h1>
            <p className="text-sm text-slate-400 font-mono">AUTONOMOUS TELEMETRY ENGINE</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-4 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-online animate-pulse"></div>
            <span>SYS.OP.NORMAL</span>
          </div>
          <span>|</span>
          <span>v1.0.0-alpha</span>
        </div>
      </header>

      {/* Main Grid */}
      <TelemetryGrid />

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[400px]">
        <div className="lg:col-span-3 h-full overflow-hidden">
          <TerminalView />
        </div>
        <div className="lg:col-span-1 h-full overflow-y-auto">
          <HealthNodes />
        </div>
      </div>
    </main>
  );
}
