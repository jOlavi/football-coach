import { create } from 'zustand';
import type { FirebaseUser, FirebaseTeam } from '../types';

interface AuthStore {
  user: FirebaseUser | null;
  teams: FirebaseTeam[];
  authLoading: boolean;
  setUser: (user: FirebaseUser | null) => void;
  setTeams: (teams: FirebaseTeam[]) => void;
  setAuthLoading: (loading: boolean) => void;
  addTeam: (team: FirebaseTeam) => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  teams: [],
  authLoading: true,
  setUser: (user) => set({ user }),
  setTeams: (teams) => set({ teams }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  addTeam: (team) => set((s) => ({ teams: [...s.teams, team] })),
}));
