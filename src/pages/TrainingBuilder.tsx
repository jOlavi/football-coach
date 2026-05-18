import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, X, RefreshCw, Trash2, BookOpen, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import type { Exercise, ExerciseCategory, GroupSet } from '../types';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMatchStore } from '../store/useMatchStore';
import { useTrainingStore } from '../store/useTrainingStore';
import { useExerciseStore } from '../store/useExerciseStore';
import { useDrillStore } from '../store/useDrillStore';
import { generateNGroups, getMatchCountsForPlayers } from '../utils/teamGenerator';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

const BUILT_IN: Exercise[] = [
  { id: 'b-warmup1', name: 'Hölkkä & venyttely', category: 'warmup', duration: 10, tags: ['koordinaatio'], description: 'Kevyt hölkkä kentän ympäri ja dynaaminen venyttely.', goals: 'Kehon lämmittely ja loukkaantumisten ehkäisy.' },
  { id: 'b-warmup2', name: 'Rondo 4v1', category: 'warmup', duration: 10, tags: ['4v4', 'syöttäminen', 'yhteistyö'], description: 'Pieni syöttöympyrä hallinnan ja liikkeen herättelyyn.', goals: 'Pallonhallinta ja liike pallotta.', playerCount: 5 },
  { id: 'b-tech1', name: 'Syöttöharjoitus pareittain', category: 'technical', duration: 15, tags: ['2v2', 'syöttäminen'], description: 'Lyhyet syöttöyhdistelmät pareittain. Painopiste ensimmäisessä kosketuksessa ja tarkkuudessa.', goals: 'Parantaa syöttötarkkuutta ja vastaanottotekniikkaa.', playerCount: 2 },
  { id: 'b-tech2', name: 'Laukausharjoitus', category: 'technical', duration: 15, tags: ['laukaus', 'maalivahti'], description: 'Laukauksia eri kulmista. Sisällytetään volleyt ja syöttö–laukaus-yhdistelmät.', goals: 'Kehittää laukaustekniikkaa ja tarkkuutta.' },
  { id: 'b-tact1', name: '1v1 puolustus', category: 'tactical', duration: 15, tags: ['1v1', 'puolustaminen'], description: 'Yksilöpuolustusharjoitus, painopiste asemoinnissa ja jalkatyössä.', goals: 'Hidastaa pallollista ja pakottaa suunta.' },
  { id: 'b-tact2', name: '2v1 hyökkäys', category: 'tactical', duration: 15, tags: ['2v2', 'hyökkääminen'], description: 'Kaksi hyökkääjää vastaan yksi puolustaja. Ylivoiman hyödyntäminen.', goals: 'Luoda maalipaikka ylivoimatilanteessa.' },
  { id: 'b-tact3', name: 'Prässimuoto', category: 'tactical', duration: 20, tags: ['puolustaminen', 'yhteistyö'], description: 'Koordinoitu puolustava prässi 7v7-asetelmassa. Laukaisijat ja varjostukset.', goals: 'Tehokas joukkueprässi ja pallonriisto.' },
  { id: 'b-tact4', name: 'Vakiotilanteet', category: 'tactical', duration: 15, tags: ['hyökkääminen', 'puolustaminen'], description: 'Kulmapotkulut ja vapaapotkut — hyökkäys- ja puolustusasetelmat.', goals: 'Tehokkuus vakiotilanteissa molempiin suuntiin.' },
  { id: 'b-phys1', name: 'Juoksuintervallit', category: 'physical', duration: 10, tags: ['nopeus', 'kondis'], description: '10x20m spurtit 30s levolla. Painopiste kiihdytyksessä ja maksimivauhdissa.', goals: 'Kehittää kiihdytyskykyä ja nopeuskestävyyttä.' },
  { id: 'b-game1', name: 'Pienpeli 5v5', category: 'game', duration: 20, tags: ['5v5', 'yhteistyö'], description: '5v5 tai 7v7. Sovelletaan harjoituksen teemaa vapaassa pelitilanteessa.', goals: 'Opitun soveltaminen pelissä.' },
  { id: 'b-game2', name: 'Koko kentän harjoitusottelu', category: 'game', duration: 30, tags: ['yhteistyö'], description: 'Täysimittainen ottelu normaalisäännöillä.', goals: 'Joukkuepeli ja kokonaiskuva.' },
];

const CAT_LABELS: Record<ExerciseCategory, string> = {
  warmup: 'Lämmittely', technical: 'Tekninen', tactical: 'Taktinen', physical: 'Fyysinen', game: 'Peli',
};
const CAT_COLORS: Record<ExerciseCategory, 'yellow' | 'blue' | 'purple' | 'red' | 'green'> = {
  warmup: 'yellow', technical: 'blue', tactical: 'purple', physical: 'red', game: 'green',
};
const CATEGORIES: Array<{ value: ExerciseCategory | 'all'; label: string }> = [
  { value: 'all', label: 'Kaikki' },
  { value: 'warmup', label: 'Lämmittely' },
  { value: 'technical', label: 'Tekninen' },
  { value: 'tactical', label: 'Taktinen' },
  { value: 'physical', label: 'Fyysinen' },
  { value: 'game', label: 'Peli' },
];
const GROUP_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#06b6d4', '#8b5cf6'];
const PLAYER_COLOR_OPTIONS = [
  { value: 'red',    dot: '#ef4444', bg: 'bg-red-100 dark:bg-red-900/30',       label: 'Punainen' },
  { value: 'yellow', dot: '#eab308', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Keltainen' },
  { value: 'green',  dot: '#22c55e', bg: 'bg-green-100 dark:bg-green-900/30',   label: 'Vihreä' },
  { value: 'blue',   dot: '#3b82f6', bg: 'bg-blue-100 dark:bg-blue-900/30',     label: 'Sininen' },
] as const;
const DURATION_PRESETS = [45, 60, 75, 90, 105, 120];

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

interface GroupSetDraft {
  id: string;
  label: string;
  groupCount: number;
  availablePlayerIds: string[];
  playerIds: string[][];
  groupNames: string[];
  movedPlayerIds: Set<string>;
  playerColors: Record<string, string>;
}

function shortName(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

export function TrainingBuilder() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const allPlayers = usePlayerStore((s) => s.players);
  const addPlayer = usePlayerStore((s) => s.addPlayer);
  const players = useMemo(() => allPlayers.filter((p) => p.active), [allPlayers]);
  const matches = useMatchStore((s) => s.matches);
  const { exercises: custom } = useExerciseStore();
  const drills = useDrillStore((s) => s.drills);
  const { addSession, updateSession, getSession } = useTrainingStore();

  const allExercises = useMemo(() => [...BUILT_IN, ...custom], [custom]);

  const matchCounts = useMemo(
    () => getMatchCountsForPlayers(players.map((p) => p.id), matches.map((m) => m.lineup)),
    [players, matches]
  );

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [sessionDuration, setSessionDuration] = useState(90);
  const [customDuration, setCustomDuration] = useState(false);
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [groupSets, setGroupSets] = useState<GroupSetDraft[]>([]);
  const [builderCat, setBuilderCat] = useState<ExerciseCategory | 'all'>('all');
  const [movingPlayer, setMovingPlayer] = useState<{ setId: string; playerId: string; fromGroup: number } | null>(null);
  const [playerSelectOpen, setPlayerSelectOpen] = useState(false);
  const [pendingPlayerIds, setPendingPlayerIds] = useState<Set<string>>(new Set());
  const [pendingUncertainIds, setPendingUncertainIds] = useState<Set<string>>(new Set());
  const [sessionUncertainIds, setSessionUncertainIds] = useState<Set<string>>(new Set());
  const [newPlayerName, setNewPlayerName] = useState('');
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [sessionPlayerIds, setSessionPlayerIds] = useState<string[]>([]);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;
    const s = getSession(editId);
    if (!s) return;
    setTitle(s.title);
    setDate(s.date);
    setStartTime(s.startTime ?? '');
    setSessionDuration(s.duration);
    setNotes(s.notes);
    const drillMap = new Map(useDrillStore.getState().drills.map((d) => [d.id, d]));
    setExercises(
      s.exercises.map((ex) => {
        if (!ex.drillId) return ex;
        const drill = drillMap.get(ex.drillId);
        return drill ? { ...ex, canvasDataUrl: drill.canvasDataUrl } : ex;
      })
    );
    if ((s.uncertainPlayerIds ?? []).length > 0) {
      setSessionUncertainIds(new Set(s.uncertainPlayerIds));
    }
    if ((s.groupSets ?? []).length > 0) {
      const allIds = Array.from(new Set((s.groupSets ?? []).flatMap((gs) => gs.playerIds.flat())));
      setSessionPlayerIds(allIds);
      setGroupSets(
        (s.groupSets ?? []).map((gs) => ({
          id: gs.id,
          label: gs.label,
          groupCount: gs.playerIds.length,
          availablePlayerIds: allIds,
          playerIds: gs.playerIds,
          groupNames: gs.groupNames,
          movedPlayerIds: new Set<string>(),
          playerColors: gs.playerColors ?? {},
        }))
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const endTime = startTime ? addMinutes(startTime, sessionDuration) : '';

  const builderPool = useMemo(
    () => allExercises.filter((e) => builderCat === 'all' || e.category === builderCat),
    [allExercises, builderCat]
  );

  function addExercise(e: Exercise) {
    setExercises((prev) => [...prev, { ...e, id: crypto.randomUUID() }]);
  }

  function removeExercise(id: string) {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  function moveExercise(id: string, direction: -1 | 1) {
    setExercises((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx < 0) return prev;
      const next = idx + direction;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }

  function updateExerciseDuration(id: string, duration: number) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, duration: Math.max(1, duration) } : e)));
  }

  function makeDefaultGroupNames(n: number): string[] {
    return Array.from({ length: n }, (_, i) => `Ryhmä ${i + 1}`);
  }

  function openPlayerSelect() {
    const preselect = sessionPlayerIds.length > 0
      ? new Set(sessionPlayerIds)
      : new Set(players.map((p) => p.id));
    setPendingPlayerIds(preselect);
    setPendingUncertainIds(new Set(sessionUncertainIds));
    setNewPlayerName('');
    setPlayerSelectOpen(true);
  }

  function addQuickPlayer() {
    const name = newPlayerName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    addPlayer({
      id,
      name,
      number: 0,
      position: 'midfielder',
      skillLevel: 1,
      dateOfBirth: '',
      parentName: '',
      parentContact: '',
      active: true,
      createdAt: new Date().toISOString(),
    });
    setPendingPlayerIds((prev) => new Set([...prev, id]));
    setNewPlayerName('');
  }

  function confirmPlayerSelect() {
    const selectedIds = Array.from(pendingPlayerIds);

    if (sessionPlayerIds.length === 0) {
      // First setup — create first group set
      const n = 2;
      setSessionPlayerIds(selectedIds);
      setGroupSets((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          label: `Ryhmäjako ${prev.length + 1}`,
          groupCount: n,
          availablePlayerIds: selectedIds,
          playerIds: Array.from({ length: n }, () => []),
          groupNames: makeDefaultGroupNames(n),
          movedPlayerIds: new Set(),
          playerColors: {},
        },
      ]);
    } else {
      // Edit — update all group sets
      const removed = new Set(sessionPlayerIds.filter((id) => !pendingPlayerIds.has(id)));
      setSessionPlayerIds(selectedIds);
      setGroupSets((prev) =>
        prev.map((s) => {
          const playerIds = s.playerIds.map((g) => g.filter((id) => !removed.has(id)));
          // New players land in the pool automatically (in availablePlayerIds but not playerIds)
          return { ...s, availablePlayerIds: selectedIds, playerIds };
        })
      );
    }
    // Only keep uncertain flags for players that remain selected
    setSessionUncertainIds(new Set([...pendingUncertainIds].filter((id) => pendingPlayerIds.has(id))));
    setPlayerSelectOpen(false);
  }

  function addGroupSetFromLast() {
    const n = 2;
    setGroupSets((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: `Ryhmäjako ${prev.length + 1}`,
        groupCount: n,
        availablePlayerIds: sessionPlayerIds.length > 0 ? sessionPlayerIds : players.map((p) => p.id),
        playerIds: Array.from({ length: n }, () => []),
        groupNames: makeDefaultGroupNames(n),
        movedPlayerIds: new Set(),
        playerColors: {},
      },
    ]);
  }

  function generateGroups(id: string) {
    setGroupSets((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const available = players.filter((p) => s.availablePlayerIds.includes(p.id));
        return {
          ...s,
          playerIds: generateNGroups(available, s.groupCount, matchCounts, true),
          movedPlayerIds: new Set(),
        };
      })
    );
  }

  function removeGroupSet(id: string) {
    setGroupSets((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length === 0) setSessionPlayerIds([]);
      return next;
    });
    if (movingPlayer?.setId === id) setMovingPlayer(null);
  }

  function assignPlayerToGroup(setId: string, playerId: string, toGroupIdx: number) {
    setGroupSets((prev) =>
      prev.map((s) => {
        if (s.id !== setId) return s;
        const playerIds = s.playerIds.map((g) => g.filter((id) => id !== playerId));
        playerIds[toGroupIdx] = [...playerIds[toGroupIdx], playerId];
        const movedPlayerIds = new Set(s.movedPlayerIds);
        movedPlayerIds.add(playerId);
        return { ...s, playerIds, movedPlayerIds };
      })
    );
    setMovingPlayer(null);
  }

  function unassignPlayer(setId: string, playerId: string) {
    setGroupSets((prev) =>
      prev.map((s) => {
        if (s.id !== setId) return s;
        const playerIds = s.playerIds.map((g) => g.filter((id) => id !== playerId));
        const movedPlayerIds = new Set(s.movedPlayerIds);
        movedPlayerIds.delete(playerId);
        return { ...s, playerIds, movedPlayerIds };
      })
    );
    setMovingPlayer(null);
  }

  function changeGroupCount(setId: string, delta: number) {
    setGroupSets((prev) =>
      prev.map((s) => {
        if (s.id !== setId) return s;
        const newCount = Math.max(2, s.groupCount + delta);
        let playerIds = s.playerIds.map((g) => [...g]);
        while (playerIds.length < newCount) playerIds.push([]);
        if (playerIds.length > newCount) {
          const overflow = playerIds.slice(newCount).flat();
          playerIds = playerIds.slice(0, newCount);
          if (overflow.length) playerIds[newCount - 1] = [...playerIds[newCount - 1], ...overflow];
        }
        const newNames = [...s.groupNames];
        while (newNames.length < newCount) newNames.push(`Ryhmä ${newNames.length + 1}`);
        return { ...s, groupCount: newCount, playerIds, groupNames: newNames.slice(0, newCount) };
      })
    );
  }

  function setPlayerColor(setId: string, playerId: string, color: string | null) {
    setGroupSets((prev) =>
      prev.map((s) => {
        if (s.id !== setId) return s;
        const playerColors = { ...s.playerColors };
        if (color) playerColors[playerId] = color;
        else delete playerColors[playerId];
        return { ...s, playerColors };
      })
    );
    setColorPickerFor(null);
  }

  function updateSetLabel(setId: string, label: string) {
    setGroupSets((prev) => prev.map((s) => (s.id === setId ? { ...s, label } : s)));
  }

  function updateGroupName(setId: string, groupIdx: number, name: string) {
    setGroupSets((prev) =>
      prev.map((s) => {
        if (s.id !== setId) return s;
        const groupNames = [...s.groupNames];
        groupNames[groupIdx] = name;
        return { ...s, groupNames };
      })
    );
  }

  function handleSave() {
    if (!title.trim() || !date) return;
    const savedGroupSets: GroupSet[] = groupSets.map(({ id, label, playerIds, groupNames, playerColors }) => ({
      id,
      label,
      playerIds,
      groupNames,
      playerColors: Object.keys(playerColors).length > 0 ? playerColors : undefined,
    }));
    const payload = {
      title: title.trim(),
      date,
      startTime: startTime || undefined,
      notes,
      exercises,
      duration: sessionDuration,
      groupSets: savedGroupSets,
      uncertainPlayerIds: sessionUncertainIds.size > 0 ? Array.from(sessionUncertainIds) : undefined,
    };
    if (editId) {
      updateSession(editId, payload);
    } else {
      addSession({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...payload });
    }
    navigate('/training');
  }

  const canSave = title.trim().length > 0 && date.length > 0;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
          {editId ? 'Muokkaa harjoitussuunnitelmaa' : 'Uusi harjoitussuunnitelma'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/training')}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Peruuta
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-1.5 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editId ? 'Tallenna muutokset' : 'Tallenna'}
          </button>
        </div>
      </div>

      {/* Info row — full width */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Otsikko</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="esim. Tiistain harjoitus"
                className="border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Päivämäärä</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Alkaa</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-24"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Kesto</label>
              {customDuration ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(Math.max(1, +e.target.value))}
                    className="border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-16"
                  />
                  <span className="text-xs text-gray-500 dark:text-slate-400">min</span>
                  <button onClick={() => setCustomDuration(false)} className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 underline ml-1">lista</button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <select
                    value={DURATION_PRESETS.includes(sessionDuration) ? sessionDuration : ''}
                    onChange={(e) => setSessionDuration(+e.target.value)}
                    className="border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {DURATION_PRESETS.map((d) => (
                      <option key={d} value={d}>{d} min</option>
                    ))}
                  </select>
                  <button onClick={() => setCustomDuration(true)} className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 underline">muu</button>
                </div>
              )}
            </div>
            {endTime && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Loppuu</label>
                <div className="border border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-950 text-gray-500 dark:text-slate-400 rounded-lg px-2.5 py-1.5 text-sm w-24 select-none">
                  {endTime}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Muistiinpanot</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lyhyt muistio..."
                className="border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
      </div>

      {/* Two-column layout: Exercises + Groups */}
      <div className="flex gap-6 items-start">

        {/* LEFT: Exercises */}
        <div className="flex-1 min-w-0">

          {/* Exercise picker + selected */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <BookOpen size={13} /> Harjoitteet
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setBuilderCat(c.value)}
                  className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                    builderCat === c.value
                      ? 'bg-gray-800 dark:bg-slate-600 text-white border-gray-800 dark:border-slate-600'
                      : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 mb-4">
              {builderPool.map((e) => (
                <button
                  key={e.id}
                  onClick={() => addExercise(e)}
                  className="flex items-start gap-2 p-2.5 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm text-gray-900 dark:text-slate-100">{e.name}</span>
                      <Badge label={CAT_LABELS[e.category]} color={CAT_COLORS[e.category]} />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      {e.duration} min{(e.tags ?? []).length > 0 ? ` · ${(e.tags ?? []).slice(0, 2).join(', ')}` : ''}
                    </p>
                  </div>
                  <Plus size={14} className="text-brand-500 mt-0.5 shrink-0" />
                </button>
              ))}
            </div>
            {drills.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Omat harjoitteet
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {drills.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => addExercise({
                        id: d.id,
                        name: d.name,
                        // canvas drills are always tactical
                        category: 'tactical',
                        duration: d.duration,
                        description: d.description,
                        goals: d.goals || undefined,
                        drillId: d.id,
                        canvasDataUrl: d.canvasDataUrl,
                      })}
                      className="flex items-start gap-2 p-2.5 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <img
                        src={d.canvasDataUrl}
                        alt={d.name}
                        className="w-16 h-10 object-cover rounded shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm text-gray-900 dark:text-slate-100 block truncate">{d.name}</span>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{d.duration} min</p>
                      </div>
                      <Plus size={14} className="text-brand-500 mt-0.5 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {exercises.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Suunnitelma</p>
                  <span className="text-xs text-brand-600 font-medium">{exercises.reduce((s, e) => s + e.duration, 0)} min yhteensä</span>
                </div>
                <div className="space-y-1.5">
                  {exercises.map((e, i) => (
                    <div
                      key={e.id}
                      draggable
                      onDragStart={(ev) => ev.dataTransfer.setData('text/plain', e.id)}
                      onDragOver={(ev) => { ev.preventDefault(); setDragOverId(e.id); }}
                      onDragLeave={() => setDragOverId(null)}
                      onDrop={(ev) => {
                        ev.preventDefault();
                        setDragOverId(null);
                        const fromId = ev.dataTransfer.getData('text/plain');
                        if (fromId === e.id) return;
                        setExercises((prev) => {
                          const arr = [...prev];
                          const fromIdx = arr.findIndex((x) => x.id === fromId);
                          const toIdx = arr.findIndex((x) => x.id === e.id);
                          if (fromIdx < 0 || toIdx < 0) return prev;
                          const [item] = arr.splice(fromIdx, 1);
                          arr.splice(toIdx, 0, item);
                          return arr;
                        });
                      }}
                      onDragEnd={() => setDragOverId(null)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                        dragOverId === e.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-600'
                          : 'bg-gray-50 dark:bg-slate-900'
                      }`}
                    >
                      <GripVertical size={13} className="text-gray-300 dark:text-slate-600 cursor-grab shrink-0" />
                      <div className="flex flex-col shrink-0">
                        <button
                          onClick={() => moveExercise(e.id, -1)}
                          disabled={i === 0}
                          className="text-gray-300 dark:text-slate-600 hover:text-gray-600 dark:hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed leading-none"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          onClick={() => moveExercise(e.id, 1)}
                          disabled={i === exercises.length - 1}
                          className="text-gray-300 dark:text-slate-600 hover:text-gray-600 dark:hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed leading-none"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                      <span className="text-gray-300 dark:text-slate-600 font-bold text-xs w-4 shrink-0">{i + 1}.</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{e.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={e.duration}
                          onChange={(ev) => updateExerciseDuration(e.id, +ev.target.value)}
                          className="w-12 text-center border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <span className="text-xs text-gray-400 dark:text-slate-500">min</span>
                      </div>
                      <button onClick={() => removeExercise(e.id)} className="text-gray-400 hover:text-red-500 shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>{/* end LEFT */}

        {/* RIGHT: Groups panel */}
        <div className="w-[520px] shrink-0">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Ryhmät &amp; Joukkueet</p>
              <div className="flex items-center gap-2">
                {groupSets.length > 0 && (
                  <button
                    onClick={addGroupSetFromLast}
                    className="flex items-center gap-1.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-600 rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Plus size={12} /> Uusi ryhmäjako
                  </button>
                )}
                <button
                  onClick={openPlayerSelect}
                  className="flex items-center gap-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
                >
                  <Plus size={12} /> {sessionPlayerIds.length === 0 ? 'Aseta pelaajat' : 'Muokkaa pelaajia'}
                </button>
              </div>
            </div>

            {groupSets.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-6">
                Lisää ryhmäjako esim. harjoitusryhmiä tai loppupelin joukkueita varten.
              </p>
            )}

            <div className="space-y-4">
              {groupSets.map((gs) => {
                const assignedIds = new Set(gs.playerIds.flat());
                const availablePlayers = players.filter((p) => gs.availablePlayerIds.includes(p.id));
                const poolPlayers = availablePlayers
                  .filter((p) => !assignedIds.has(p.id))
                  .sort((a, b) => {
                    // Newly added players (not in previous session) appear at top
                    const aNew = !sessionPlayerIds.includes(a.id) ? -1 : 0;
                    const bNew = !sessionPlayerIds.includes(b.id) ? -1 : 0;
                    return aNew - bNew;
                  });
                const isSelecting = movingPlayer?.setId === gs.id;
                const selectedId = isSelecting ? movingPlayer!.playerId : null;

                return (
                  <div key={gs.id} className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 border border-gray-100 dark:border-slate-700">

                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        value={gs.label}
                        onChange={(e) => updateSetLabel(gs.id, e.target.value)}
                        className="flex-1 bg-transparent border-b border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 font-semibold text-sm focus:outline-none focus:border-brand-500 pb-0.5"
                      />
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-2 py-0.5">
                        <button onClick={() => changeGroupCount(gs.id, -1)} className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 text-base leading-none">−</button>
                        <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 w-4 text-center">{gs.groupCount}</span>
                        <button onClick={() => changeGroupCount(gs.id, 1)} className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 text-base leading-none">＋</button>
                      </div>
                      <button
                        onClick={() => generateGroups(gs.id)}
                        className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-md px-2 py-0.5 transition-colors"
                        title="Arvo ryhmät satunnaisesti"
                      >
                        <RefreshCw size={11} /> Arvo
                      </button>
                      <button onClick={() => removeGroupSet(gs.id)} className="text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Unassigned player pool */}
                    {poolPlayers.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-400 dark:text-slate-500 mb-1.5">
                          {isSelecting ? 'Valittu — klikkaa ryhmää sijoittaaksesi' : 'Sijoittamattomat — klikkaa valitaksesi'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {poolPlayers.map((p) => {
                            const isSelected = selectedId === p.id;
                            return (
                              <button
                                key={p.id}
                                onClick={() => setMovingPlayer(isSelected ? null : { setId: gs.id, playerId: p.id, fromGroup: -1 })}
                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500'
                                }`}
                              >
                                {shortName(p.name)}{sessionUncertainIds.has(p.id) && <span className="ml-0.5 text-amber-500 font-bold">?</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Group cards */}
                    <div className={`grid gap-2 ${gs.groupCount <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {gs.playerIds.map((groupPlayerIds, gi) => {
                        const color = GROUP_COLORS[gi % GROUP_COLORS.length];
                        const groupName = gs.groupNames[gi] ?? `Ryhmä ${gi + 1}`;
                        const isTarget = isSelecting && movingPlayer!.fromGroup !== gi;
                        return (
                          <div
                            key={gi}
                            onClick={() => { if (isTarget) assignPlayerToGroup(gs.id, selectedId!, gi); }}
                            className={`bg-white dark:bg-slate-800 rounded-lg p-2 border-t-2 transition-all ${
                              isTarget ? 'ring-2 ring-indigo-300 dark:ring-indigo-600 cursor-pointer' : ''
                            }`}
                            style={{ borderTopColor: color }}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <input
                                value={groupName}
                                onChange={(e) => updateGroupName(gs.id, gi, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-transparent border-none text-xs font-semibold focus:outline-none min-w-0 flex-1"
                                style={{ color }}
                              />
                              <span className="text-xs font-semibold ml-1 shrink-0" style={{ color }}>
                                {groupPlayerIds.length}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              {groupPlayerIds.map((pid) => {
                                const player = availablePlayers.find((p) => p.id === pid);
                                if (!player) return null;
                                const isSelected = selectedId === pid;
                                const wasMoved = gs.movedPlayerIds.has(pid);
                                const playerColor = gs.playerColors[pid] ?? null;
                                const colorOpt = PLAYER_COLOR_OPTIONS.find((c) => c.value === playerColor);
                                const pickerKey = `${gs.id}-${pid}`;
                                const pickerOpen = colorPickerFor === pickerKey;
                                return (
                                  <div key={pid}>
                                    <div
                                      className={`flex items-center gap-1 w-full text-xs rounded px-1 py-0.5 transition-colors ${
                                        isSelected
                                          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium'
                                          : colorOpt
                                          ? `${colorOpt.bg} text-gray-700 dark:text-slate-200`
                                          : 'text-gray-600 dark:text-slate-400'
                                      }`}
                                    >
                                      {wasMoved && !isSelected && !colorOpt && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0" />
                                      )}
                                      <button
                                        className="flex-1 text-left truncate"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isSelected) { setMovingPlayer(null); return; }
                                          if (isSelecting) { assignPlayerToGroup(gs.id, selectedId!, gi); return; }
                                          setMovingPlayer({ setId: gs.id, playerId: pid, fromGroup: gi });
                                        }}
                                      >
                                        {shortName(player.name)}{sessionUncertainIds.has(pid) && !isSelected && <span className="ml-0.5 text-amber-500 font-bold">?</span>}
                                        {isSelected && <span className="ml-1 text-indigo-400">✕</span>}
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setColorPickerFor(pickerOpen ? null : pickerKey);
                                          setMovingPlayer(null);
                                        }}
                                        className="shrink-0 w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-slate-600 hover:scale-110 transition-transform"
                                        style={{ background: colorOpt ? colorOpt.dot : '#d1d5db' }}
                                        title="Väri"
                                      />
                                    </div>
                                    {pickerOpen && (
                                      <div className="flex items-center gap-1.5 pl-1 pt-1 pb-0.5" onClick={(e) => e.stopPropagation()}>
                                        {PLAYER_COLOR_OPTIONS.map((c) => (
                                          <button
                                            key={c.value}
                                            onClick={() => setPlayerColor(gs.id, pid, playerColor === c.value ? null : c.value)}
                                            title={c.label}
                                            className={`w-4 h-4 rounded-full border-2 hover:scale-110 transition-transform ${
                                              playerColor === c.value ? 'border-gray-700 dark:border-white' : 'border-transparent'
                                            }`}
                                            style={{ background: c.dot }}
                                          />
                                        ))}
                                        {playerColor && (
                                          <button
                                            onClick={() => setPlayerColor(gs.id, pid, null)}
                                            className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 ml-0.5"
                                            title="Poista väri"
                                          >✕</button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {groupPlayerIds.length === 0 && !isTarget && (
                                <p className="text-xs text-gray-300 dark:text-slate-600 italic">Tyhjä</p>
                              )}
                              {isTarget && (
                                <p className="text-xs text-center py-1 font-medium text-indigo-400 dark:text-indigo-500">+ lisää tähän</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Cancel / unassign controls */}
                    {isSelecting && (
                      <div className="flex items-center gap-3 mt-2">
                        <button onClick={() => setMovingPlayer(null)} className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
                          Peruuta
                        </button>
                        {movingPlayer!.fromGroup >= 0 && (
                          <button onClick={() => unassignPlayer(gs.id, selectedId!)} className="text-xs text-red-400 hover:text-red-600">
                            Poista ryhmistä
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Player selection modal */}
      {playerSelectOpen && (
        <Modal title={sessionPlayerIds.length === 0 ? 'Valitse tämän päivän pelaajat' : 'Muokkaa pelaajia'} onClose={() => setPlayerSelectOpen(false)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {pendingPlayerIds.size} / {players.length} valittu
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingPlayerIds(new Set(players.map((p) => p.id)))}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Valitse kaikki
                </button>
                <button
                  onClick={() => setPendingPlayerIds(new Set())}
                  className="text-xs text-gray-400 dark:text-slate-500 hover:underline"
                >
                  Tyhjennä
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-1">
              {players.map((p) => {
                const selected = pendingPlayerIds.has(p.id);
                const uncertain = pendingUncertainIds.has(p.id);
                return (
                  <div key={p.id} className={`flex items-center rounded-lg border text-sm transition-colors ${
                    selected
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600'
                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                  }`}>
                    <button
                      onClick={() => {
                        const next = new Set(pendingPlayerIds);
                        if (selected) {
                          next.delete(p.id);
                          const nextU = new Set(pendingUncertainIds);
                          nextU.delete(p.id);
                          setPendingUncertainIds(nextU);
                        } else {
                          next.add(p.id);
                        }
                        setPendingPlayerIds(next);
                      }}
                      className={`flex items-center gap-2 flex-1 px-3 py-2 text-left ${
                        selected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-slate-400'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-slate-600'
                      }`}>
                        {selected && <span className="text-white text-xs leading-none">✓</span>}
                      </span>
                      {p.name}
                    </button>
                    {selected && (
                      <button
                        onClick={() => {
                          const next = new Set(pendingUncertainIds);
                          if (uncertain) next.delete(p.id); else next.add(p.id);
                          setPendingUncertainIds(next);
                        }}
                        title="Merkitse epävarma"
                        className={`px-2 py-2 text-sm font-bold shrink-0 transition-colors ${
                          uncertain
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-300 dark:text-slate-600 hover:text-amber-500'
                        }`}
                      >
                        ?
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-slate-700">
              <input
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addQuickPlayer(); }}
                placeholder="Lisää uusi pelaaja..."
                className="flex-1 border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                onClick={addQuickPlayer}
                disabled={!newPlayerName.trim()}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={13} /> Lisää
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setPlayerSelectOpen(false)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Peruuta
              </button>
              <button
                onClick={confirmPlayerSelect}
                disabled={pendingPlayerIds.size === 0}
                className="px-4 py-1.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sessionPlayerIds.length === 0
                  ? `Luo ryhmäjako (${pendingPlayerIds.size})`
                  : `Tallenna (${pendingPlayerIds.size})`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
