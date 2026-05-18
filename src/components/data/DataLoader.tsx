import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useMatchStore } from '../../store/useMatchStore';
import { useTeamStore } from '../../store/useTeamStore';
import { useTrainingStore } from '../../store/useTrainingStore';
import { useExerciseStore } from '../../store/useExerciseStore';
import { useDrillStore } from '../../store/useDrillStore';
import { getSubcollection } from '../../lib/firestore/teamData';
import { getUserSubcollection } from '../../lib/firestore/userData';
import { deserializeSession, deserializeDrill } from '../../lib/firestore/serialize';
import { runMigration, runSeed } from '../../lib/migration';
import type { Player, Match, OwnTeam, Exercise } from '../../types';

function clearAllStores() {
  usePlayerStore.getState().setAll([]);
  useMatchStore.getState().setAll([]);
  useTeamStore.getState().setAll([]);
  useTrainingStore.getState().setAll([]);
  useExerciseStore.getState().setAll([]);
  useDrillStore.getState().setAll([]);
}

export function DataLoader() {
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  const user = useAuthStore((s) => s.user);
  const teams = useAuthStore((s) => s.teams);

  useEffect(() => {
    if (!activeTeamId || !user) {
      clearAllStores();
      return;
    }

    const teamId = activeTeamId;
    const uid = user.uid;
    const sport = teams.find((t) => t.id === teamId)?.sport ?? 'football';

    async function loadData() {
      clearAllStores();

      const { pendingImport, setPendingImport } = useAppStore.getState();
      if (pendingImport === 'migrate') {
        await runMigration(teamId, uid, sport);
        setPendingImport(null);
      } else if (pendingImport === 'seed') {
        await runSeed(teamId, uid, sport);
        setPendingImport(null);
      }

      const [players, matches, ownTeams, rawSessions, exercises, rawDrills] =
        await Promise.all([
          getSubcollection<Player>(teamId, 'players'),
          getSubcollection<Match>(teamId, 'matches'),
          getSubcollection<OwnTeam>(teamId, 'ownTeams'),
          getSubcollection<Record<string, unknown>>(teamId, 'trainingSessions'),
          getUserSubcollection<Exercise>(uid, sport, 'exercises'),
          getUserSubcollection<Record<string, unknown>>(uid, sport, 'drills'),
        ]);

      usePlayerStore.getState().setAll(players);
      useMatchStore.getState().setAll(matches);
      useTeamStore.getState().setAll(ownTeams);
      useTrainingStore.getState().setAll(rawSessions.map(deserializeSession));
      useExerciseStore.getState().setAll(exercises);
      useDrillStore.getState().setAll(rawDrills.map(deserializeDrill));
    }

    loadData().catch(console.error);
  }, [activeTeamId, user?.uid, teams]);

  return null;
}
