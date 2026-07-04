import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, GripVertical, Users } from 'lucide-react';
import type { Exercise, ExerciseCategory, GroupSet } from '../types';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMatchStore } from '../store/useMatchStore';
import { useTrainingStore } from '../store/useTrainingStore';
import { useExerciseStore } from '../store/useExerciseStore';
import { useDrillStore } from '../store/useDrillStore';
import { getMatchCountsForPlayers } from '../utils/teamGenerator';
import { Badge } from '../components/ui/Badge';
import { LibraryModal } from '../components/training/LibraryModal';
import { GroupModal } from '../components/training/GroupModal';
import type { GroupModalResult } from '../components/training/GroupModal';

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
const CAT_PILL_ACTIVE: Record<ExerciseCategory, string> = {
  warmup:    'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
  technical: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  tactical:  'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
  physical:  'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  game:      'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
};
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

export function TrainingBuilder() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const allPlayers = usePlayerStore((s) => s.players);
  const players = useMemo(() => allPlayers.filter((p) => p.active), [allPlayers]);
  const matches = useMatchStore((s) => s.matches);
  const { exercises: custom } = useExerciseStore();
  const drills = useDrillStore((s) => s.drills);
  const { addSession, updateSession } = useTrainingStore();
  const storedSession = useTrainingStore(
    useCallback((s) => s.sessions.find((t) => t.id === editId) ?? null, [editId])
  );
  const initializedForId = useRef<string | null>(null);

  const matchCounts = useMemo(
    () => getMatchCountsForPlayers(players.map((p) => p.id), matches.map((m) => m.lineup)),
    [players, matches]
  );

  const libraryItems = useMemo<Exercise[]>(() => [
    ...BUILT_IN,
    ...custom,
    ...drills.map((d) => ({
      id: d.id,
      name: d.name,
      category: (d.category ?? 'tactical') as ExerciseCategory,
      duration: d.duration,
      description: d.description || '',
      goals: d.goals || undefined,
      drillId: d.id,
      canvasDataUrl: d.canvasDataUrl,
    })),
  ], [custom, drills]);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('16:00');
  const [sessionDuration, setSessionDuration] = useState(90);
  const [customDuration, setCustomDuration] = useState(false);
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [groupSets, setGroupSets] = useState<GroupSetDraft[]>([]);
  const [sessionPlayerIds, setSessionPlayerIds] = useState<string[]>([]);
  const [sessionUncertainIds, setSessionUncertainIds] = useState<Set<string>>(new Set());
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  useEffect(() => {
    if (!editId || !storedSession) return;
    if (initializedForId.current === editId) return;
    initializedForId.current = editId;
    setTitle(storedSession.title);
    setDate(storedSession.date);
    setStartTime(storedSession.startTime ?? '');
    setSessionDuration(storedSession.duration);
    setNotes(storedSession.notes);
    const drillMap = new Map(useDrillStore.getState().drills.map((d) => [d.id, d]));
    setExercises(
      storedSession.exercises.map((ex) => {
        if (!ex.drillId) return ex;
        const drill = drillMap.get(ex.drillId);
        return drill ? { ...ex, canvasDataUrl: drill.canvasDataUrl } : ex;
      })
    );
    if ((storedSession.uncertainPlayerIds ?? []).length > 0) {
      setSessionUncertainIds(new Set(storedSession.uncertainPlayerIds));
    }
    if ((storedSession.groupSets ?? []).length > 0) {
      const allIds = Array.from(new Set((storedSession.groupSets ?? []).flatMap((gs) => gs.playerIds.flat())));
      setSessionPlayerIds(allIds);
      setGroupSets(
        (storedSession.groupSets ?? []).map((gs) => ({
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
  }, [editId, storedSession]);

  const endTime = startTime ? addMinutes(startTime, sessionDuration) : '';

  function addExercise(e: Exercise) {
    setExercises((prev) => [...prev, { ...e, id: crypto.randomUUID() }]);
  }

  function addTextSection() {
    setExercises((prev) => [...prev, {
      id: crypto.randomUUID(),
      name: '',
      category: 'warmup' as ExerciseCategory,
      duration: 10,
      description: '',
      isTextSection: true,
    }]);
  }

  function removeExercise(id: string) {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  function updateExerciseDuration(id: string, duration: number) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, duration: Math.max(1, duration) } : e)));
  }

  function updateExerciseName(id: string, name: string) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, name } : e)));
  }

  function updateExerciseDescription(id: string, description: string) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, description } : e)));
  }

  function updateExerciseCategory(id: string, category: ExerciseCategory) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, category } : e)));
  }

  function handleGroupSave(result: GroupModalResult) {
    setGroupSets(result.groupSets);
    setSessionPlayerIds(result.sessionPlayerIds);
    setSessionUncertainIds(result.sessionUncertainIds);
    setGroupModalOpen(false);
  }

  function handleSave() {
    if (!title.trim() || !date) return;
    const savedGroupSets: GroupSet[] = groupSets.map(({ id, label, playerIds, groupNames, playerColors }) => ({
      id, label, playerIds, groupNames,
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
  const totalMinutes = exercises.reduce((s, e) => s + e.duration, 0);

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

      {/* Meta row */}
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
            className="border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 dark:[color-scheme:dark] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Alkaa</label>
          <div className="flex items-center gap-1">
            <select
              value={startTime ? startTime.split(':')[0] : '16'}
              onChange={(e) => setStartTime(`${e.target.value}:${startTime ? startTime.split(':')[1] : '00'}`)}
              className="border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span className="text-gray-400 dark:text-slate-500 font-semibold">:</span>
            <select
              value={startTime ? startTime.split(':')[1] : '00'}
              onChange={(e) => setStartTime(`${startTime ? startTime.split(':')[0] : '16'}:${e.target.value}`)}
              className="border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {['00', '15', '30', '45'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
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
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Ryhmät</label>
          <button
            onClick={() => setGroupModalOpen(true)}
            className="flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg px-2.5 py-1.5 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <Users size={14} />
            Ryhmäjaot
            {groupSets.length > 0 && (
              <span className="text-xs text-indigo-500 dark:text-indigo-400 font-normal">({groupSets.length})</span>
            )}
          </button>
        </div>
      </div>

      {/* Exercise list */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        {exercises.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Suunnitelma</p>
            <span className="text-xs text-brand-600 font-medium">{totalMinutes} min yhteensä</span>
          </div>
        )}

        {exercises.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">
            Lisää harjoitteita suunnitelmaan alta.
          </p>
        )}

        <div className="space-y-2 mb-4">
          {exercises.map((e) => (
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
              className={`flex items-stretch gap-2 rounded-xl border p-3 transition-colors ${
                e.isTextSection
                  ? 'border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/60'
                  : dragOverId === e.id
                  ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}
            >
              <div className="flex items-center shrink-0">
                <GripVertical size={15} className="text-gray-300 dark:text-slate-600 cursor-grab" />
              </div>

              {!e.isTextSection && e.canvasDataUrl && (
                <img
                  src={e.canvasDataUrl}
                  alt={e.name}
                  className="w-20 h-14 object-cover rounded-lg shrink-0 self-center"
                />
              )}

              <div className="flex-1 min-w-0">
                {e.isTextSection ? (
                  <>
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      {(Object.keys(CAT_LABELS) as ExerciseCategory[]).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); updateExerciseCategory(e.id, cat); }}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                            e.category === cat
                              ? CAT_PILL_ACTIVE[cat]
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 hover:bg-gray-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          {CAT_LABELS[cat]}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        value={e.name}
                        onChange={(ev) => updateExerciseName(e.id, ev.target.value)}
                        placeholder="Otsikko..."
                        className="flex-1 font-semibold text-sm text-gray-900 dark:text-slate-100 bg-transparent border-none focus:outline-none placeholder-gray-300 dark:placeholder-slate-600"
                        onClick={(ev) => ev.stopPropagation()}
                      />
                    </div>
                    <textarea
                      value={e.description}
                      onChange={(ev) => updateExerciseDescription(e.id, ev.target.value)}
                      placeholder="Kuvaus (valinnainen)..."
                      rows={2}
                      className="w-full text-xs text-gray-500 dark:text-slate-400 bg-transparent border-none resize-none focus:outline-none placeholder-gray-300 dark:placeholder-slate-600 leading-relaxed"
                      onClick={(ev) => ev.stopPropagation()}
                    />
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <Badge label={CAT_LABELS[e.category]} color={CAT_COLORS[e.category]} />
                      <span className="font-semibold text-sm text-gray-900 dark:text-slate-100">{e.name}</span>
                    </div>
                    {e.description && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                        {e.description}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0 self-start pt-0.5">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={e.duration}
                  onChange={(ev) => updateExerciseDuration(e.id, +ev.target.value)}
                  className="w-12 text-center border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-lg px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                  onClick={(ev) => ev.stopPropagation()}
                />
                <span className="text-xs text-gray-400 dark:text-slate-500">min</span>
              </div>

              <button
                onClick={() => removeExercise(e.id)}
                className="text-gray-300 dark:text-slate-600 hover:text-red-500 shrink-0 self-start pt-0.5 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setLibraryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-700 rounded-xl hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors"
          >
            + Lisää harjoite
          </button>
          <button
            onClick={addTextSection}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            + Lisää tekstiosio
          </button>
        </div>
      </div>

      {libraryOpen && (
        <LibraryModal
          items={libraryItems}
          onAdd={addExercise}
          onClose={() => setLibraryOpen(false)}
        />
      )}

      {groupModalOpen && (
        <GroupModal
          players={players}
          matchCounts={matchCounts}
          initialGroupSets={groupSets}
          initialSessionPlayerIds={sessionPlayerIds}
          initialUncertainIds={sessionUncertainIds}
          onSave={handleGroupSave}
          onClose={() => setGroupModalOpen(false)}
        />
      )}
    </div>
  );
}
