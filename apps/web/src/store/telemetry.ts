import { create } from 'zustand';

export interface SystemMetrics {
  cpu: number;
  ram: number;
  gpu: number;
  vram: number;
}

export interface ServiceHealth {
  kafka: boolean;
  postgres: boolean;
  redis: boolean;
  daemon: boolean;
}

interface TelemetryState {
  metrics: SystemMetrics;
  health: ServiceHealth;
  logs: string[];
  setMetrics: (metrics: SystemMetrics) => void;
  setHealth: (service: keyof ServiceHealth, status: boolean) => void;
  addLog: (log: string) => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  metrics: {
    cpu: 0,
    ram: 0,
    gpu: 0,
    vram: 0,
  },
  health: {
    kafka: true,
    postgres: true,
    redis: true,
    daemon: true, // Optimistically true until WS says otherwise
  },
  logs: [],
  setMetrics: (metrics) => set({ metrics }),
  setHealth: (service, status) =>
    set((state) => ({
      health: { ...state.health, [service]: status },
    })),
  addLog: (log) =>
    set((state) => ({
      // Keep only last 100 logs in state (xterm will handle rendering history)
      logs: [...state.logs, log].slice(-100),
    })),
}));
