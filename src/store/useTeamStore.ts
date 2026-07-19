import { create } from 'zustand';
import type { OwnTeam } from '../types';
import { useAppStore } from './useAppStore';
import { writeTeamDoc, removeTeamDoc } from '../lib/firestore/teamData';

interface TeamStore {
  teams: OwnTeam[];
  setAll: (teams: OwnTeam[]) => void;
  addTeam: (team: OwnTeam) => void;
  updateTeam: (id: string, patch: Partial<Pick<OwnTeam, 'name' | 'color' | 'format' | 'minLineupSize' | 'level'>>) => void;
  deleteTeam: (id: string) => void;
}

export const useTeamStore = create<TeamStore>()((set) => ({
  teams: [],
  setAll: (teams) => set({ teams }),
  addTeam: (team) => {
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) writeTeamDoc(activeTeamId, 'ownTeams', team);
    set((s) => ({ teams: [...s.teams, team] }));
  },
  updateTeam: (id, patch) => {
    set((s) => {
      const updated = s.teams.map((t) => t.id === id ? { ...t, ...patch } : t);
      const { activeTeamId } = useAppStore.getState();
      const team = updated.find((t) => t.id === id);
      if (activeTeamId && team) writeTeamDoc(activeTeamId, 'ownTeams', team);
      return { teams: updated };
    });
  },
  deleteTeam: (id) => {
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) removeTeamDoc(activeTeamId, 'ownTeams', id);
    set((s) => ({ teams: s.teams.filter((t) => t.id !== id) }));
  },
}));
