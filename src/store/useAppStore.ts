import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PendingImport = 'migrate' | 'seed' | null;

const DEFAULT_SEASON = '2026';

interface AppStore {
  activeTeamId: string | null;
  pendingImport: PendingImport;
  activeSeason: string;
  seasons: string[];
  setActiveTeamId: (id: string | null) => void;
  setPendingImport: (pending: PendingImport) => void;
  setActiveSeason: (season: string) => void;
  addSeason: (season: string) => void;
  renameSeason: (oldName: string, newName: string) => void;
  removeSeason: (season: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      activeTeamId: null,
      pendingImport: null,
      activeSeason: DEFAULT_SEASON,
      seasons: [DEFAULT_SEASON],
      setActiveTeamId: (activeTeamId) => set({ activeTeamId }),
      setPendingImport: (pendingImport) => set({ pendingImport }),
      setActiveSeason: (activeSeason) => set({ activeSeason }),
      addSeason: (season) =>
        set((s) =>
          s.seasons.includes(season)
            ? s
            : { seasons: [...s.seasons, season] }
        ),
      renameSeason: (oldName, newName) =>
        set((s) => ({
          seasons: s.seasons.map((x) => (x === oldName ? newName : x)),
          activeSeason: s.activeSeason === oldName ? newName : s.activeSeason,
        })),
      removeSeason: (season) =>
        set((s) => {
          if (s.seasons.length <= 1) return s;
          const remaining = s.seasons.filter((x) => x !== season);
          return {
            seasons: remaining,
            activeSeason: s.activeSeason === season ? remaining[remaining.length - 1] : s.activeSeason,
          };
        }),
    }),
    { name: 'app-state' }
  )
);
