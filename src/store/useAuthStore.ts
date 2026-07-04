import { create } from 'zustand';
import type { FirebaseUser, FirebaseTeam } from '../types';

interface AuthStore {
  user: FirebaseUser | null;
  teams: FirebaseTeam[];
  authLoading: boolean;
  accessDenied: boolean;
  setUser: (user: FirebaseUser | null) => void;
  setTeams: (teams: FirebaseTeam[]) => void;
  setAuthLoading: (loading: boolean) => void;
  setAccessDenied: (denied: boolean) => void;
  addTeam: (team: FirebaseTeam) => void;
  removeTeam: (id: string) => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  teams: [],
  authLoading: true,
  accessDenied: false,
  setUser: (user) => set({ user }),
  setTeams: (teams) => set({ teams }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setAccessDenied: (accessDenied) => set({ accessDenied }),
  addTeam: (team) => set((s) => ({ teams: [...s.teams, team] })),
  removeTeam: (id) => set((s) => ({ teams: s.teams.filter((t) => t.id !== id) })),
}));
