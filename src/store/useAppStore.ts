import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PendingImport = 'migrate' | 'seed' | null;

interface AppStore {
  activeTeamId: string | null;
  pendingImport: PendingImport;
  setActiveTeamId: (id: string | null) => void;
  setPendingImport: (pending: PendingImport) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      activeTeamId: null,
      pendingImport: null,
      setActiveTeamId: (activeTeamId) => set({ activeTeamId }),
      setPendingImport: (pendingImport) => set({ pendingImport }),
    }),
    { name: 'app-state' }
  )
);
