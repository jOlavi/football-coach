import { useState } from 'react';
import { Plus, RefreshCw, Trash2, X } from 'lucide-react';
import type { Player } from '../../types';
import { generateNGroups } from '../../utils/teamGenerator';
import { usePlayerStore } from '../../store/usePlayerStore';

const GROUP_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#06b6d4', '#8b5cf6'];
const PLAYER_COLOR_OPTIONS = [
  { value: 'red',    dot: '#ef4444', bg: 'bg-red-100 dark:bg-red-900/30',       label: 'Punainen' },
  { value: 'yellow', dot: '#eab308', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Keltainen' },
  { value: 'green',  dot: '#22c55e', bg: 'bg-green-100 dark:bg-green-900/30',   label: 'Vihreä' },
  { value: 'blue',   dot: '#3b82f6', bg: 'bg-blue-100 dark:bg-blue-900/30',     label: 'Sininen' },
] as const;

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

export interface GroupModalResult {
  groupSets: GroupSetDraft[];
  sessionPlayerIds: string[];
  sessionUncertainIds: Set<string>;
}

interface Props {
  players: Player[];
  matchCounts: Record<string, number>;
  initialGroupSets: GroupSetDraft[];
  initialSessionPlayerIds: string[];
  initialUncertainIds: Set<string>;
  onSave: (result: GroupModalResult) => void;
  onClose: () => void;
}

function shortName(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

function makeDefaultGroupNames(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `Ryhmä ${i + 1}`);
}

export function GroupModal({
  players,
  matchCounts,
  initialGroupSets,
  initialSessionPlayerIds,
  initialUncertainIds,
  onSave,
  onClose,
}: Props) {
  const addPlayer = usePlayerStore((s) => s.addPlayer);

  const [step, setStep] = useState<1 | 2>(initialGroupSets.length > 0 ? 2 : 1);
  const [pendingPlayerIds, setPendingPlayerIds] = useState<Set<string>>(
    initialSessionPlayerIds.length > 0
      ? new Set(initialSessionPlayerIds)
      : new Set(players.map((p) => p.id))
  );
  const [pendingUncertainIds, setPendingUncertainIds] = useState<Set<string>>(new Set(initialUncertainIds));
  const [newPlayerName, setNewPlayerName] = useState('');

  const [groupSets, setGroupSets] = useState<GroupSetDraft[]>(initialGroupSets);
  const [sessionPlayerIds, setSessionPlayerIds] = useState<string[]>(initialSessionPlayerIds);
  const [movingPlayer, setMovingPlayer] = useState<{ setId: string; playerId: string; fromGroup: number } | null>(null);
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);

  function addQuickPlayer() {
    const name = newPlayerName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    addPlayer({
      id, name, number: 0, position: 'midfielder', skillLevel: 1,
      dateOfBirth: '', parentName: '', parentContact: '',
      active: true, createdAt: new Date().toISOString(),
    });
    setPendingPlayerIds((prev) => new Set([...prev, id]));
    setNewPlayerName('');
  }

  function goToStep2() {
    const selectedIds = Array.from(pendingPlayerIds);
    if (groupSets.length === 0) {
      const n = 2;
      const newSet: GroupSetDraft = {
        id: crypto.randomUUID(),
        label: 'Ryhmäjako 1',
        groupCount: n,
        availablePlayerIds: selectedIds,
        playerIds: Array.from({ length: n }, () => []),
        groupNames: makeDefaultGroupNames(n),
        movedPlayerIds: new Set(),
        playerColors: {},
      };
      setGroupSets([newSet]);
    } else {
      const removed = new Set(sessionPlayerIds.filter((id) => !pendingPlayerIds.has(id)));
      setGroupSets((prev) =>
        prev.map((s) => {
          const playerIds = s.playerIds.map((g) => g.filter((id) => !removed.has(id)));
          return { ...s, availablePlayerIds: selectedIds, playerIds };
        })
      );
    }
    setSessionPlayerIds(selectedIds);
    setStep(2);
  }

  function addGroupSet() {
    const n = 2;
    setGroupSets((prev) => [...prev, {
      id: crypto.randomUUID(),
      label: `Ryhmäjako ${prev.length + 1}`,
      groupCount: n,
      availablePlayerIds: sessionPlayerIds,
      playerIds: Array.from({ length: n }, () => []),
      groupNames: makeDefaultGroupNames(n),
      movedPlayerIds: new Set(),
      playerColors: {},
    }]);
  }

  function removeGroupSet(id: string) {
    setGroupSets((prev) => prev.filter((s) => s.id !== id));
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

  function generateGroups(id: string) {
    setGroupSets((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const available = players.filter((p) => s.availablePlayerIds.includes(p.id));
        return { ...s, playerIds: generateNGroups(available, s.groupCount, matchCounts, true), movedPlayerIds: new Set() };
      })
    );
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

  function handleSave() {
    const finalUncertain = new Set([...pendingUncertainIds].filter((id) => pendingPlayerIds.has(id)));
    onSave({ groupSets, sessionPlayerIds, sessionUncertainIds: finalUncertain });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <div>
            <div className="text-base font-bold text-gray-900 dark:text-slate-100">Ryhmäjaot</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-semibold ${step === 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-green-600 dark:text-green-400'}`}>
                {step > 1 ? '✓' : '1'} Osallistujat
              </span>
              <span className="text-gray-300 dark:text-slate-600 text-xs">→</span>
              <span className={`text-xs font-semibold ${step === 2 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-slate-500'}`}>
                2 Ryhmät
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex items-center justify-between mb-3">
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

              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {players.map((p) => {
                  const selected = pendingPlayerIds.has(p.id);
                  const uncertain = pendingUncertainIds.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center rounded-lg border text-sm transition-colors ${
                        selected
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600'
                          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                      }`}
                    >
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
                            uncertain ? 'text-amber-600 dark:text-amber-400' : 'text-gray-300 dark:text-slate-600 hover:text-amber-500'
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
            </div>

            <div className="flex justify-between gap-2 px-5 py-4 border-t border-gray-100 dark:border-slate-700 shrink-0">
              <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                Peruuta
              </button>
              <button
                onClick={goToStep2}
                disabled={pendingPlayerIds.size === 0}
                className="px-4 py-1.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Seuraava →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {groupSets.map((gs) => {
                const assignedIds = new Set(gs.playerIds.flat());
                const availablePlayers = players.filter((p) => gs.availablePlayerIds.includes(p.id));
                const poolPlayers = availablePlayers.filter((p) => !assignedIds.has(p.id));
                const isSelecting = movingPlayer?.setId === gs.id;
                const selectedId = isSelecting ? movingPlayer!.playerId : null;

                return (
                  <div key={gs.id} className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3 border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        value={gs.label}
                        onChange={(e) => updateSetLabel(gs.id, e.target.value)}
                        className="flex-1 bg-transparent border-b border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 font-semibold text-sm focus:outline-none focus:border-indigo-500 pb-0.5"
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

                    {poolPlayers.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-400 dark:text-slate-500 mb-1.5">
                          {isSelecting ? 'Valittu — klikkaa ryhmää sijoittaaksesi' : 'Jakamatta — klikkaa valitaksesi'}
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
                                {shortName(p.name)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className={`grid gap-2 ${gs.groupCount <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {gs.playerIds.map((groupPlayerIds, gi) => {
                        const color = GROUP_COLORS[gi % GROUP_COLORS.length];
                        const groupName = gs.groupNames[gi] ?? `Ryhmä ${gi + 1}`;
                        const isTarget = isSelecting && movingPlayer!.fromGroup !== gi;
                        return (
                          <div
                            key={`${gs.id}-${gi}`}
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
                                        {shortName(player.name)}
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

              <button
                onClick={addGroupSet}
                className="w-full py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
              >
                + Lisää ryhmäjako
              </button>
            </div>

            <div className="flex justify-between gap-2 px-5 py-4 border-t border-gray-100 dark:border-slate-700 shrink-0">
              <button onClick={() => setStep(1)} className="px-3 py-1.5 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                ← Takaisin
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                Tallenna ryhmät
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
