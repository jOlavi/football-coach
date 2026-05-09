import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppSettings {
  // Joukkueen tiedot
  teamName: string;
  season: string;
  coachName: string;

  // Pelaajan kenttien näkyvyys
  showParentInfo: boolean;
  showDateOfBirth: boolean;
  showPosition: boolean;
  // Otteluasetukset
  minLineupSize: number;
  defaultTeamFormat: '5v5' | '7v7' | '8v8' | '11v11';
  theme: 'light' | 'dark';
}

const DEFAULTS: AppSettings = {
  teamName: 'Joukkueeni',
  season: '2026',
  coachName: '',
  showParentInfo: true,
  showDateOfBirth: true,
  showPosition: true,
  minLineupSize: 5,
  defaultTeamFormat: '5v5',
  theme: 'light',
};

interface SettingsStore {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULTS,
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetSettings: () => set({ settings: DEFAULTS }),
    }),
    { name: 'football-settings' }
  )
);
