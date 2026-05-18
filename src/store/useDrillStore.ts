import { create } from 'zustand';
import type { Drill } from '../types';
import { useAuthStore } from './useAuthStore';
import { writeUserDoc, removeUserDoc, getActiveSport } from '../lib/firestore/userData';

interface DrillStore {
  drills: Drill[];
  setAll: (drills: Drill[]) => void;
  addDrill: (drill: Drill) => void;
  updateDrill: (id: string, patch: Partial<Omit<Drill, 'id' | 'createdAt'>>) => void;
  deleteDrill: (id: string) => void;
}

export const useDrillStore = create<DrillStore>()((set, get) => ({
  drills: [],
  setAll: (drills) => set({ drills }),
  addDrill: (drill) => {
    const { user } = useAuthStore.getState();
    const sport = getActiveSport();
    if (user) writeUserDoc(user.uid, sport, 'drills', drill);
    set((s) => ({ drills: [...s.drills, drill] }));
  },
  updateDrill: (id, patch) => {
    const drill = get().drills.find((d) => d.id === id);
    if (!drill) return;
    const updated = { ...drill, ...patch };
    const { user } = useAuthStore.getState();
    const sport = getActiveSport();
    if (user) writeUserDoc(user.uid, sport, 'drills', updated);
    set((s) => ({ drills: s.drills.map((d) => (d.id === id ? updated : d)) }));
  },
  deleteDrill: (id) => {
    const { user } = useAuthStore.getState();
    const sport = getActiveSport();
    if (user) removeUserDoc(user.uid, sport, 'drills', id);
    set((s) => ({ drills: s.drills.filter((d) => d.id !== id) }));
  },
}));
