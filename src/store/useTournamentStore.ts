import { create } from 'zustand';
import type { Tournament, TournamentMatch } from '../types';
import { useAppStore } from './useAppStore';
import { writeTeamDoc, removeTeamDoc } from '../lib/firestore/teamData';

interface TournamentStore {
  tournaments: Tournament[];
  setAll: (tournaments: Tournament[]) => void;
  addTournament: (t: Tournament) => void;
  updateTournament: (id: string, patch: Partial<Omit<Tournament, 'id' | 'createdAt'>>) => void;
  deleteTournament: (id: string) => void;
  addTournamentMatch: (tournamentId: string, match: TournamentMatch) => void;
  updateTournamentMatch: (tournamentId: string, matchId: string, patch: Partial<TournamentMatch>) => void;
  removeTournamentMatch: (tournamentId: string, matchId: string) => void;
}

function persist(t: Tournament) {
  const { activeTeamId } = useAppStore.getState();
  if (activeTeamId) {
    // JSON round-trip strips undefined values from nested objects/arrays
    const clean = JSON.parse(JSON.stringify(t));
    writeTeamDoc(activeTeamId, 'tournaments', clean);
  }
}

export const useTournamentStore = create<TournamentStore>()((set, get) => ({
  tournaments: [],
  setAll: (tournaments) => set({ tournaments }),
  addTournament: (t) => {
    const { activeSeason } = useAppStore.getState();
    const tagged = { ...t, season: activeSeason };
    persist(tagged);
    set((s) => ({ tournaments: [...s.tournaments, tagged] }));
  },
  updateTournament: (id, patch) => {
    set((s) => {
      const tournaments = s.tournaments.map((t) => t.id === id ? { ...t, ...patch } : t);
      const t = tournaments.find((x) => x.id === id);
      if (t) persist(t);
      return { tournaments };
    });
  },
  deleteTournament: (id) => {
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) removeTeamDoc(activeTeamId, 'tournaments', id);
    set((s) => ({ tournaments: s.tournaments.filter((t) => t.id !== id) }));
  },
  addTournamentMatch: (tournamentId, match) => {
    const t = get().tournaments.find((x) => x.id === tournamentId);
    if (!t) return;
    const updated = { ...t, matches: [...(t.matches ?? []), match] };
    persist(updated);
    set((s) => ({ tournaments: s.tournaments.map((x) => x.id === tournamentId ? updated : x) }));
  },
  updateTournamentMatch: (tournamentId, matchId, patch) => {
    const t = get().tournaments.find((x) => x.id === tournamentId);
    if (!t) return;
    const updated = { ...t, matches: (t.matches ?? []).map((m) => m.id === matchId ? { ...m, ...patch } : m) };
    persist(updated);
    set((s) => ({ tournaments: s.tournaments.map((x) => x.id === tournamentId ? updated : x) }));
  },
  removeTournamentMatch: (tournamentId, matchId) => {
    const t = get().tournaments.find((x) => x.id === tournamentId);
    if (!t) return;
    const updated = { ...t, matches: (t.matches ?? []).filter((m) => m.id !== matchId) };
    persist(updated);
    set((s) => ({ tournaments: s.tournaments.map((x) => x.id === tournamentId ? updated : x) }));
  },
}));
