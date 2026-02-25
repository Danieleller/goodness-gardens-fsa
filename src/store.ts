import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  organization_name: string;
  role: string;
}

// ── Module config store (singleton, fetched once) ──────────────────
interface ModuleStore {
  enabledModules: Set<string>;
  loaded: boolean;
  loading: boolean;
  setModules: (modules: string[]) => void;
  setLoading: (v: boolean) => void;
}

export const useModuleStore = create<ModuleStore>((set) => ({
  enabledModules: new Set<string>(),
  loaded: false,
  loading: false,
  setModules: (modules) => set({ enabledModules: new Set(modules), loaded: true, loading: false }),
  setLoading: (v) => set({ loading: v }),
}));

interface AuthStore {
  user: User | null;
  token: string | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  setAuth: (user: User, token: string) => void;
  setSession: (session: Session | null) => void;
  setAppUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      supabaseUser: null,
      session: null,
      setAuth: (user, token) => set({ user, token }),
      setSession: (session) => set({
        session,
        supabaseUser: session?.user ?? null,
        token: session?.access_token ?? null,
      }),
      setAppUser: (user) => set({ user }),
      logout: () => {
        supabase.auth.signOut();
        set({ user: null, token: null, supabaseUser: null, session: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
      }),
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
