import { create } from 'zustand';
import type { Drill } from '../types';
import { useAuthStore } from './useAuthStore';
import { writeUserDoc, removeUserDoc, getActiveSport } from '../lib/firestore/userData';
import { serializeDrill } from '../lib/firestore/serialize';
import { uploadDrillImage } from '../lib/storage';

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
    if (user) {
      writeUserDoc(user.uid, sport, 'drills', serializeDrill(drill));
      if (drill.canvasDataUrl) {
        const uid = user.uid;
        uploadDrillImage(uid, drill.id, drill.canvasDataUrl)
          .then((imageUrl) => {
            writeUserDoc(uid, sport, 'drills', serializeDrill({ ...drill, imageUrl }));
            set((s) => ({
              drills: s.drills.map((d) => (d.id === drill.id ? { ...d, imageUrl } : d)),
            }));
          })
          .catch(console.error);
      }
    }
    set((s) => ({ drills: [...s.drills, drill] }));
  },
  updateDrill: (id, patch) => {
    const drill = get().drills.find((d) => d.id === id);
    if (!drill) return;
    const updated = { ...drill, ...patch };
    const { user } = useAuthStore.getState();
    const sport = getActiveSport();
    if (user) {
      writeUserDoc(user.uid, sport, 'drills', serializeDrill(updated));
      if (patch.canvasDataUrl) {
        const uid = user.uid;
        uploadDrillImage(uid, id, patch.canvasDataUrl)
          .then((imageUrl) => {
            writeUserDoc(uid, sport, 'drills', serializeDrill({ ...updated, imageUrl }));
            set((s) => ({
              drills: s.drills.map((d) => (d.id === id ? { ...d, imageUrl } : d)),
            }));
          })
          .catch(console.error);
      }
    }
    set((s) => ({ drills: s.drills.map((d) => (d.id === id ? updated : d)) }));
  },
  deleteDrill: (id) => {
    const { user } = useAuthStore.getState();
    const sport = getActiveSport();
    if (user) removeUserDoc(user.uid, sport, 'drills', id);
    set((s) => ({ drills: s.drills.filter((d) => d.id !== id) }));
  },
}));
