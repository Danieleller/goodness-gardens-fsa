import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  organization_name: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

interface PreHarvestLog {
  id: number;
  log_type: string;
  [key: string]: any;
}

interface UIStore {
  preHarvestLogs: PreHarvestLog[];
  setPreHarvestLogs: (logs: PreHarvestLog[]) => void;
  addPreHarvestLog: (log: PreHarvestLog) => void;
  removePreHarvestLog: (id: number) => void;
  updatePreHarvestLog: (log: PreHarvestLog) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  preHarvestLogs: [],
  setPreHarvestLogs: (logs) => set({ preHarvestLogs: logs }),
  addPreHarvestLog: (log) =>
    set((state) => ({
      preHarvestLogs: [log, ...state.preHarvestLogs],
    })),
  removePreHarvestLog: (id) =>
    set((state) => ({
      preHarvestLogs: state.preHarvestLogs.filter((log) => log.id !== id),
    })),
  updatePreHarvestLog: (log) =>
    set((state) => ({
      preHarvestLogs: state.preHarvestLogs.map((l) => (l.id === log.id ? log : l)),
    })),
}));
