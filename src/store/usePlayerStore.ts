import { create } from 'zustand';
import type { Player } from '../types';
import { useAppStore } from './useAppStore';
import { writeTeamDoc, removeTeamDoc } from '../lib/firestore/teamData';

interface PlayerStore {
  players: Player[];
  setAll: (players: Player[]) => void;
  addPlayer: (player: Player) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
  getPlayer: (id: string) => Player | undefined;
}

export const usePlayerStore = create<PlayerStore>()((set, get) => ({
  players: [],
  setAll: (players) => set({ players }),
  addPlayer: (player) => {
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) writeTeamDoc(activeTeamId, 'players', player);
    set((s) => ({ players: [...s.players, player] }));
  },
  updatePlayer: (id, updates) => {
    const player = get().players.find((p) => p.id === id);
    if (!player) return;
    const updated = { ...player, ...updates };
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) writeTeamDoc(activeTeamId, 'players', updated);
    set((s) => ({ players: s.players.map((p) => (p.id === id ? updated : p)) }));
  },
  deletePlayer: (id) => {
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) removeTeamDoc(activeTeamId, 'players', id);
    set((s) => ({ players: s.players.filter((p) => p.id !== id) }));
  },
  getPlayer: (id) => get().players.find((p) => p.id === id),
}));
