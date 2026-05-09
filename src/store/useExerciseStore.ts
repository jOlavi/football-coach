import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Exercise } from '../types';

interface ExerciseStore {
  exercises: Exercise[];
  addExercise: (e: Exercise) => void;
  updateExercise: (id: string, patch: Partial<Exercise>) => void;
  deleteExercise: (id: string) => void;
}

export const useExerciseStore = create<ExerciseStore>()(
  persist(
    (set) => ({
      exercises: [],
      addExercise: (e) => set((s) => ({ exercises: [...s.exercises, e] })),
      updateExercise: (id, patch) =>
        set((s) => ({ exercises: s.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteExercise: (id) => set((s) => ({ exercises: s.exercises.filter((e) => e.id !== id) })),
    }),
    { name: 'football-exercises' }
  )
);
