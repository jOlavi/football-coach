import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SEED_PLAYERS, SEED_TEAMS, SEED_MATCHES } from '../utils/seedData';
import type { Player, Match, OwnTeam, TrainingSession, Exercise, Drill } from '../types';

export interface LocalStorageSnapshot {
  players: Player[];
  matches: Match[];
  ownTeams: OwnTeam[];
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
    ownTeams: readStore<OwnTeam>('football-teams', 'teams'),
    sessions: readStore<TrainingSession>('football-training', 'sessions'),
    exercises: readStore<Exercise>('football-exercises', 'exercises'),
    drills: readStore<Drill>('drill-store', 'drills'),
  };
}

export function hasLocalStorageData(): boolean {
  const snap = readLocalStorageSnapshot();
  return snap.players.length > 0 || snap.matches.length > 0;
}

export async function runMigration(
  teamId: string,
  userId: string,
  sport: string
): Promise<void> {
  const snap = readLocalStorageSnapshot();
  const writes: Promise<void>[] = [];

  snap.players.forEach((p) =>
    writes.push(setDoc(doc(db, 'teams', teamId, 'players', p.id), p))
  );
  snap.matches.forEach((m) =>
    writes.push(setDoc(doc(db, 'teams', teamId, 'matches', m.id), m))
  );
  snap.ownTeams.forEach((t) =>
    writes.push(setDoc(doc(db, 'teams', teamId, 'ownTeams', t.id), t))
  );
  snap.sessions.forEach((s) =>
    writes.push(setDoc(doc(db, 'teams', teamId, 'trainingSessions', s.id), s))
  );
  snap.exercises.forEach((e) =>
    writes.push(setDoc(doc(db, 'users', userId, 'sports', sport, 'exercises', e.id), e))
  );
  snap.drills.forEach((d) =>
    writes.push(setDoc(doc(db, 'users', userId, 'sports', sport, 'drills', d.id), d))
  );

  await Promise.all(writes);
}

export async function runSeed(
  teamId: string,
  _userId: string,
  _sport: string
): Promise<void> {
  const writes: Promise<void>[] = [];

  SEED_PLAYERS.forEach((p) =>
    writes.push(setDoc(doc(db, 'teams', teamId, 'players', p.id), p))
  );
  SEED_TEAMS.forEach((t) =>
    writes.push(setDoc(doc(db, 'teams', teamId, 'ownTeams', t.id), t))
  );
  SEED_MATCHES.forEach((m) =>
    writes.push(setDoc(doc(db, 'teams', teamId, 'matches', m.id), m))
  );

  await Promise.all(writes);
}
