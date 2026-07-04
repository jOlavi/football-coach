import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useMatchStore } from '../../store/useMatchStore';
import { useTeamStore } from '../../store/useTeamStore';
import { useTournamentStore } from '../../store/useTournamentStore';
import { useTrainingStore } from '../../store/useTrainingStore';
import { useExerciseStore } from '../../store/useExerciseStore';
import { useDrillStore } from '../../store/useDrillStore';
import { useCommDraftStore } from '../../store/useCommDraftStore';
import type { CommDraft } from '../../store/useCommDraftStore';
import { useNotesStore } from '../../store/useNotesStore';
import { getSubcollection } from '../../lib/firestore/teamData';
import { getUserSubcollection } from '../../lib/firestore/userData';
import { deserializeSession, deserializeDrill } from '../../lib/firestore/serialize';
import { runMigration, runSeed } from '../../lib/migration';
import type { Player, Match, OwnTeam, Exercise, Tournament, Note } from '../../types';

function clearAllStores() {
  usePlayerStore.getState().setAll([]);
  useMatchStore.getState().setAll([]);
  useTeamStore.getState().setAll([]);
  useTournamentStore.getState().setAll([]);
  useTrainingStore.getState().setAll([]);
  useExerciseStore.getState().setAll([]);
  useDrillStore.getState().setAll([]);
  useCommDraftStore.getState().setAll([]);
  useNotesStore.getState().setAll([]);
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

      const [players, matches, ownTeams, tournaments, rawSessions, exercises, rawDrills, commDrafts, notes] =
        await Promise.all([
          getSubcollection<Player>(teamId, 'players'),
          getSubcollection<Match>(teamId, 'matches'),
          getSubcollection<OwnTeam>(teamId, 'ownTeams'),
          getSubcollection<Tournament>(teamId, 'tournaments'),
          getSubcollection<Record<string, unknown>>(teamId, 'trainingSessions'),
          getUserSubcollection<Exercise>(uid, sport, 'exercises'),
          getUserSubcollection<Record<string, unknown>>(uid, sport, 'drills'),
          getSubcollection<CommDraft>(teamId, 'commDrafts'),
          getSubcollection<Note>(teamId, 'notes'),
        ]);

      const drills = rawDrills.map(deserializeDrill);
      const drillMap = new Map(drills.map((d) => [d.id, d]));
      const sessions = rawSessions.map(deserializeSession).map((s) => ({
        ...s,
        exercises: s.exercises.map((ex) => {
          if (!ex.drillId) return ex;
          const drill = drillMap.get(ex.drillId);
          return drill ? { ...ex, canvasDataUrl: drill.canvasDataUrl } : ex;
        }),
      }));

      usePlayerStore.getState().setAll(players);
      useMatchStore.getState().setAll(matches);
      useTeamStore.getState().setAll(ownTeams);
      useTournamentStore.getState().setAll(tournaments);
      useTrainingStore.getState().setAll(sessions);
      useExerciseStore.getState().setAll(exercises);
      useDrillStore.getState().setAll(drills);
      useCommDraftStore.getState().setAll(commDrafts);
      useNotesStore.getState().setAll(notes);
    }

    loadData().catch((err) => {
      console.error('Data load failed:', err);
    });
  }, [activeTeamId, user?.uid, teams]);

  return null;
}
