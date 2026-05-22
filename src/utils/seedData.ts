import type { Player, Match, OwnTeam } from "../types";

// If seedData.local.ts exists (gitignored), it overrides these example defaults.
// Create src/utils/seedData.local.ts with your own SEED_PLAYERS / SEED_TEAMS / SEED_MATCHES.
const localMods = import.meta.glob('./seedData.local.ts', { eager: true });
const local = localMods['./seedData.local.ts'] as any;

const examplePlayers: Player[] = [
  { id: "example-p1", name: "Pelaaja 1", number: 1, position: "midfielder", skillLevel: 1, dateOfBirth: "", parentName: "", parentContact: "", active: true, createdAt: new Date().toISOString() },
  { id: "example-p2", name: "Pelaaja 2", number: 2, position: "midfielder", skillLevel: 2, dateOfBirth: "", parentName: "", parentContact: "", active: true, createdAt: new Date().toISOString() },
  { id: "example-p3", name: "Pelaaja 3", number: 3, position: "midfielder", skillLevel: 3, dateOfBirth: "", parentName: "", parentContact: "", active: true, createdAt: new Date().toISOString() },
];

const exampleTeams: OwnTeam[] = [
  { id: "example-t1", name: "Joukkue A", color: "#1d4ed8", createdAt: new Date().toISOString() },
];

const exampleMatches: Match[] = [];

export const SEED_PLAYERS: Player[] = local?.SEED_PLAYERS ?? examplePlayers;
export const SEED_TEAMS: OwnTeam[] = local?.SEED_TEAMS ?? exampleTeams;
export const SEED_MATCHES: Match[] = local?.SEED_MATCHES ?? exampleMatches;
