import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrainingSession } from '../types';

interface TrainingStore {
  sessions: TrainingSession[];
  addSession: (session: TrainingSession) => void;
  updateSession: (id: string, updates: Partial<TrainingSession>) => void;
  deleteSession: (id: string) => void;
  getSession: (id: string) => TrainingSession | undefined;
}

export const useTrainingStore = create<TrainingStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      addSession: (session) => set((s) => ({ sessions: [...s.sessions, session] })),
      updateSession: (id, updates) =>
        set((s) => ({
          sessions: s.sessions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      deleteSession: (id) =>
        set((s) => ({ sessions: s.sessions.filter((t) => t.id !== id) })),
      getSession: (id) => get().sessions.find((t) => t.id === id),
    }),
    { name: 'football-training' }
  )
);
