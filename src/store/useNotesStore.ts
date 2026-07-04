import { create } from 'zustand';
import type { Note } from '../types';
import { useAppStore } from './useAppStore';
import { writeTeamDoc, removeTeamDoc } from '../lib/firestore/teamData';

interface NotesStore {
  notes: Note[];
  setAll: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
}

export const useNotesStore = create<NotesStore>()((set, get) => ({
  notes: [],
  setAll: (notes) => set({ notes }),
  addNote: (note) => {
    const { activeTeamId, activeSeason } = useAppStore.getState();
    const tagged = { ...note, season: activeSeason };
    if (activeTeamId) writeTeamDoc(activeTeamId, 'notes', tagged);
    set((s) => ({ notes: [...s.notes, tagged] }));
  },
  updateNote: (id, updates) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const updated = { ...note, ...updates, updatedAt: new Date().toISOString() };
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) writeTeamDoc(activeTeamId, 'notes', updated);
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? updated : n)) }));
  },
  deleteNote: (id) => {
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) removeTeamDoc(activeTeamId, 'notes', id);
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
  },
}));
