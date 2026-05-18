import { create } from 'zustand';
import type { Exercise } from '../types';
import { useAuthStore } from './useAuthStore';
import { writeUserDoc, removeUserDoc, getActiveSport } from '../lib/firestore/userData';

interface ExerciseStore {
  exercises: Exercise[];
  setAll: (exercises: Exercise[]) => void;
  addExercise: (e: Exercise) => void;
  updateExercise: (id: string, patch: Partial<Exercise>) => void;
  deleteExercise: (id: string) => void;
}

export const useExerciseStore = create<ExerciseStore>()((set, get) => ({
  exercises: [],
  setAll: (exercises) => set({ exercises }),
  addExercise: (e) => {
    const { user } = useAuthStore.getState();
    const sport = getActiveSport();
    if (user) writeUserDoc(user.uid, sport, 'exercises', e);
    set((s) => ({ exercises: [...s.exercises, e] }));
  },
  updateExercise: (id, patch) => {
    const exercise = get().exercises.find((e) => e.id === id);
    if (!exercise) return;
    const updated = { ...exercise, ...patch };
    const { user } = useAuthStore.getState();
    const sport = getActiveSport();
    if (user) writeUserDoc(user.uid, sport, 'exercises', updated);
    set((s) => ({ exercises: s.exercises.map((e) => (e.id === id ? updated : e)) }));
  },
  deleteExercise: (id) => {
    const { user } = useAuthStore.getState();
    const sport = getActiveSport();
    if (user) removeUserDoc(user.uid, sport, 'exercises', id);
    set((s) => ({ exercises: s.exercises.filter((e) => e.id !== id) }));
  },
}));
