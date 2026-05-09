import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player } from '../types';

interface PlayerStore {
  players: Player[];
  addPlayer: (player: Player) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
  getPlayer: (id: string) => Player | undefined;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      players: [],
      addPlayer: (player) => set((s) => ({ players: [...s.players, player] })),
      updatePlayer: (id, updates) =>
        set((s) => ({
          players: s.players.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      deletePlayer: (id) =>
        set((s) => ({ players: s.players.filter((p) => p.id !== id) })),
      getPlayer: (id) => get().players.find((p) => p.id === id),
    }),
    { name: 'football-players' }
  )
);
