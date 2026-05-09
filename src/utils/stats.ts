import type { Match, Player } from '../types';

export function getPlayerMatchCount(playerId: string, matches: Match[]): number {
  return matches.filter((m) => m.lineup.includes(playerId) && m.result).length;
}

export function getPlayerGoals(playerId: string, matches: Match[]): number {
  return matches.reduce((total, m) => {
    const scorer = m.result?.scorers.find((s) => s.playerId === playerId);
    return total + (scorer?.count ?? 0);
  }, 0);
}

export function getPlayerParticipation(playerId: string, matches: Match[]): number {
  const played = matches.filter((m) => m.result).length;
  if (!played) return 0;
  const appeared = matches.filter((m) => m.result && m.lineup.includes(playerId)).length;
  return Math.round((appeared / played) * 100);
}

export function getTeamRecord(matches: Match[]) {
  const played = matches.filter((m) => m.result);
  const wins = played.filter((m) => m.result!.goalsFor > m.result!.goalsAgainst).length;
  const draws = played.filter((m) => m.result!.goalsFor === m.result!.goalsAgainst).length;
  const losses = played.filter((m) => m.result!.goalsFor < m.result!.goalsAgainst).length;
  const goalsFor = played.reduce((sum, m) => sum + m.result!.goalsFor, 0);
  const goalsAgainst = played.reduce((sum, m) => sum + m.result!.goalsAgainst, 0);
  return { played: played.length, wins, draws, losses, goalsFor, goalsAgainst };
}

export function getTopScorers(players: Player[], matches: Match[], limit = 5) {
  return players
    .map((p) => ({ player: p, goals: getPlayerGoals(p.id, matches) }))
    .filter((x) => x.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, limit);
}
