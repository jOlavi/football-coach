import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Match, MatchResult } from '../types';

interface MatchStore {
  matches: Match[];
  addMatch: (match: Match) => void;
  updateMatch: (id: string, updates: Partial<Match>) => void;
  deleteMatch: (id: string) => void;
  setResult: (id: string, result: MatchResult) => void;
  getMatch: (id: string) => Match | undefined;
}

export const useMatchStore = create<MatchStore>()(
  persist(
    (set, get) => ({
      matches: [],
      addMatch: (match) => set((s) => ({ matches: [...s.matches, match] })),
      updateMatch: (id, updates) =>
        set((s) => ({
          matches: s.matches.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),
      deleteMatch: (id) =>
        set((s) => ({ matches: s.matches.filter((m) => m.id !== id) })),
      setResult: (id, result) =>
        set((s) => ({
          matches: s.matches.map((m) => (m.id === id ? { ...m, result } : m)),
        })),
      getMatch: (id) => get().matches.find((m) => m.id === id),
    }),
    { name: 'football-matches' }
  )
);
