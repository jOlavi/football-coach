import type { TeamFormat } from './index';

export interface MatchConfig {
  matchId: string;
  format: TeamFormat;
  periods: number;
  periodLength: number;
  location: 'home' | 'away';
  opponent: string;
}

export interface MatchPlayer {
  id: string;
  name: string;
  number: number;
  position: string;
  accumulatedSeconds: number;
  onField: boolean;
  isGoalkeeper: boolean;
}

export interface SubEntry {
  outId: string;
  inId: string;
  matchMinute: number;
  period: number;
}

export interface PeriodSnapshot {
  period: number;
  scores: { home: number; away: number };
  playerSeconds: Record<string, number>;
}

export interface MatchSessionState {
  config: MatchConfig;
  currentPeriod: number;
  scores: { home: number; away: number };
  players: MatchPlayer[];
  substitutions: SubEntry[];
  periodHistory: PeriodSnapshot[];
  matchSeconds: number;
}

export const FORMAT_SIZES: Record<TeamFormat, number> = {
  '5v5': 5,
  '7v7': 7,
  '8v8': 8,
  '11v11': 11,
};

export function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
