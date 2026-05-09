import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Drill } from '../types';

interface DrillStore {
  drills: Drill[];
  addDrill: (drill: Drill) => void;
  updateDrill: (id: string, patch: Partial<Omit<Drill, 'id' | 'createdAt'>>) => void;
  deleteDrill: (id: string) => void;
}

export const useDrillStore = create<DrillStore>()(
  persist(
    (set) => ({
      drills: [],
      addDrill: (drill) => set((s) => ({ drills: [...s.drills, drill] })),
      updateDrill: (id, patch) =>
        set((s) => ({ drills: s.drills.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      deleteDrill: (id) => set((s) => ({ drills: s.drills.filter((d) => d.id !== id) })),
    }),
    { name: 'drill-store' }
  )
);
