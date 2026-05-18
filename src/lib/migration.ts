import type { Player, Match, FirebaseTeam, TrainingSession, Exercise, Drill } from '../types';

export interface LocalStorageSnapshot {
  players: Player[];
  matches: Match[];
  ownTeams: FirebaseTeam[];
  sessions: TrainingSession[];
  exercises: Exercise[];
  drills: Drill[];
}

function readStore<T>(key: string, field: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed?.state?.[field] ?? [];
  } catch {
    return [];
  }
}

export function readLocalStorageSnapshot(): LocalStorageSnapshot {
  return {
    players: readStore<Player>('football-players', 'players'),
    matches: readStore<Match>('football-matches', 'matches'),
    ownTeams: readStore<FirebaseTeam>('football-teams', 'teams'),
    sessions: readStore<TrainingSession>('football-training', 'sessions'),
    exercises: readStore<Exercise>('football-exercises', 'exercises'),
    drills: readStore<Drill>('drill-store', 'drills'),
  };
}

export function hasLocalStorageData(): boolean {
  const snap = readLocalStorageSnapshot();
  return snap.players.length > 0 || snap.matches.length > 0;
}
