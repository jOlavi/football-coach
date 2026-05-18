import { create } from 'zustand';
import type { Match, MatchResult } from '../types';
import { useAppStore } from './useAppStore';
import { writeTeamDoc, removeTeamDoc } from '../lib/firestore/teamData';

interface MatchStore {
  matches: Match[];
  setAll: (matches: Match[]) => void;
  addMatch: (match: Match) => void;
  updateMatch: (id: string, updates: Partial<Match>) => void;
  deleteMatch: (id: string) => void;
  setResult: (id: string, result: MatchResult) => void;
  getMatch: (id: string) => Match | undefined;
}

export const useMatchStore = create<MatchStore>()((set, get) => ({
  matches: [],
  setAll: (matches) => set({ matches }),
  addMatch: (match) => {
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) writeTeamDoc(activeTeamId, 'matches', match);
    set((s) => ({ matches: [...s.matches, match] }));
  },
  updateMatch: (id, updates) => {
    const match = get().matches.find((m) => m.id === id);
    if (!match) return;
    const updated = { ...match, ...updates };
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) writeTeamDoc(activeTeamId, 'matches', updated);
    set((s) => ({ matches: s.matches.map((m) => (m.id === id ? updated : m)) }));
  },
  deleteMatch: (id) => {
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) removeTeamDoc(activeTeamId, 'matches', id);
    set((s) => ({ matches: s.matches.filter((m) => m.id !== id) }));
  },
  setResult: (id, result) => {
    const match = get().matches.find((m) => m.id === id);
    if (!match) return;
    const updated = { ...match, result };
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) writeTeamDoc(activeTeamId, 'matches', updated);
    set((s) => ({ matches: s.matches.map((m) => (m.id === id ? updated : m)) }));
  },
  getMatch: (id) => get().matches.find((m) => m.id === id),
}));
