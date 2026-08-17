"use client";

import { useTelemetryStore } from "@/store/telemetry";
import { Database, Server, Cpu, Box } from "lucide-react";

export function HealthNodes() {
  const { health } = useTelemetryStore();

  const services = [
    { name: "Kafka KRaft", icon: Box, status: health.kafka },
    { name: "Postgres", icon: Database, status: health.postgres },
    { name: "Redis Cache", icon: Server, status: health.redis },
    { name: "Go Daemon", icon: Cpu, status: health.daemon },
  ];

  return (
    <div className="flex flex-col gap-3 bg-slate-900/50 p-4 border border-slate-800 rounded-xl backdrop-blur-sm">
      <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2">Service Health</h3>
      
      {services.map((svc) => (
        <div key={svc.name} className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${svc.status ? 'bg-online/10 text-online' : 'bg-danger/10 text-danger'} transition-colors`}>
              <svc.icon size={16} strokeWidth={2.5} />
            </div>
            <span className="text-sm font-medium text-slate-200">{svc.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-xs font-mono ${svc.status ? 'text-online' : 'text-danger'}`}>
              {svc.status ? 'ONLINE' : 'DOWN'}
            </div>
            {svc.status && (
              <div className="w-2 h-2 rounded-full bg-online animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
