import type { Player, TeamFormat, GeneratedTeam } from '../types';

const FORMATIONS: Record<TeamFormat, string[]> = {
  '5v5': ['1-2-1', '1-1-2', '2-1-1'],
  '7v7': ['1-3-2', '1-2-3', '2-3-1'],
  '8v8': ['1-3-3', '1-4-2', '2-3-2'],
  '11v11': ['4-3-3', '4-4-2', '3-5-2'],
};

export function generateBalancedTeams(
  players: Player[],
  format: TeamFormat,
  matchCounts: Record<string, number>
): GeneratedTeam[] {
  const sorted = [...players].sort((a, b) => {
    const skillDiff = b.skillLevel - a.skillLevel;
    if (skillDiff !== 0) return skillDiff;
    return (matchCounts[a.id] || 0) - (matchCounts[b.id] || 0);
  });

  const teamA: string[] = [];
  const teamB: string[] = [];

  sorted.forEach((player, i) => {
    if (i % 2 === 0) teamA.push(player.id);
    else teamB.push(player.id);
  });

  const formations = FORMATIONS[format];
  return [
    { name: 'Team A', players: teamA, formation: formations[0] },
    { name: 'Team B', players: teamB, formation: formations[0] },
  ];
}

export function generateNGroups(
  players: Player[],
  n: number,
  matchCounts: Record<string, number>,
  randomize = false
): string[][] {
  const sorted = [...players].sort((a, b) => {
    const skillDiff = b.skillLevel - a.skillLevel;
    if (skillDiff !== 0) return skillDiff;
    return (matchCounts[a.id] || 0) - (matchCounts[b.id] || 0);
  });

  if (randomize) {
    for (let i = sorted.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    }
  }

  const groups: string[][] = Array.from({ length: n }, () => []);
  sorted.forEach((player, i) => {
    groups[i % n].push(player.id);
  });
  return groups;
}

export function getMatchCountsForPlayers(
  playerIds: string[],
  matchLineups: string[][]
): Record<string, number> {
  const counts: Record<string, number> = {};
  playerIds.forEach((id) => (counts[id] = 0));
  matchLineups.forEach((lineup) => {
    lineup.forEach((id) => {
      if (counts[id] !== undefined) counts[id]++;
    });
  });
  return counts;
}
