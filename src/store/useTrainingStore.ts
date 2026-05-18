import { create } from 'zustand';
import type { TrainingSession } from '../types';
import { useAppStore } from './useAppStore';
import { writeTeamDoc, removeTeamDoc } from '../lib/firestore/teamData';

interface TrainingStore {
  sessions: TrainingSession[];
  setAll: (sessions: TrainingSession[]) => void;
  addSession: (session: TrainingSession) => void;
  updateSession: (id: string, updates: Partial<TrainingSession>) => void;
  deleteSession: (id: string) => void;
  getSession: (id: string) => TrainingSession | undefined;
}

export const useTrainingStore = create<TrainingStore>()((set, get) => ({
  sessions: [],
  setAll: (sessions) => set({ sessions }),
  addSession: (session) => {
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) writeTeamDoc(activeTeamId, 'trainingSessions', session);
    set((s) => ({ sessions: [...s.sessions, session] }));
  },
  updateSession: (id, updates) => {
    const session = get().sessions.find((t) => t.id === id);
    if (!session) return;
    const updated = { ...session, ...updates };
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) writeTeamDoc(activeTeamId, 'trainingSessions', updated);
    set((s) => ({ sessions: s.sessions.map((t) => (t.id === id ? updated : t)) }));
  },
  deleteSession: (id) => {
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) removeTeamDoc(activeTeamId, 'trainingSessions', id);
    set((s) => ({ sessions: s.sessions.filter((t) => t.id !== id) }));
  },
  getSession: (id) => get().sessions.find((t) => t.id === id),
}));
