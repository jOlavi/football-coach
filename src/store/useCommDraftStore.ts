import { create } from 'zustand';
import { useAppStore } from './useAppStore';
import { writeTeamDoc, removeTeamDoc } from '../lib/firestore/teamData';

export interface CommDraft {
  id: string;
  text: string;
  updatedAt: string;
}

interface CommDraftStore {
  drafts: Record<string, string>;
  setAll: (items: CommDraft[]) => void;
  saveDraft: (key: string, text: string) => void;
  deleteDraft: (key: string) => void;
}

export const useCommDraftStore = create<CommDraftStore>()((set) => ({
  drafts: {},
  setAll: (items) =>
    set({ drafts: Object.fromEntries(items.map((d) => [d.id, d.text])) }),
  saveDraft: (key, text) => {
    const { activeTeamId } = useAppStore.getState();
    const item: CommDraft = { id: key, text, updatedAt: new Date().toISOString() };
    if (activeTeamId) writeTeamDoc(activeTeamId, 'commDrafts', item);
    set((s) => ({ drafts: { ...s.drafts, [key]: text } }));
  },
  deleteDraft: (key) => {
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) removeTeamDoc(activeTeamId, 'commDrafts', key);
    set((s) => {
      const { [key]: _, ...rest } = s.drafts;
      return { drafts: rest };
    });
  },
}));
