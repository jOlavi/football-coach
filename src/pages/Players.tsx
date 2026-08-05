import { useState } from 'react';
import { UserPlus, Pencil, Trash2, Search, LayoutGrid, List, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMatchStore } from '../store/useMatchStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { getPlayerMatchCount, getPlayerGoals, getPlayerParticipation } from '../utils/stats';
import type { Player, Position, SkillLevel } from '../types';

const POSITIONS: Position[] = ['goalkeeper', 'defender', 'midfielder', 'forward'];
const POSITION_LABELS: Record<Position, string> = {
  goalkeeper: 'Maalivahti', defender: 'Puolustaja', midfielder: 'Keskikenttäpelaaja', forward: 'Hyökkääjä',
};
const posColor: Record<Position, 'blue' | 'green' | 'purple' | 'yellow'> = {
  goalkeeper: 'yellow', defender: 'blue', midfielder: 'green', forward: 'purple',
};

const SKILL_LABELS: Record<SkillLevel, string> = { 1: 'Taso 1', 2: 'Taso 2', 3: 'Taso 1 + Taso 2' };

function SkillLabel({ level }: { level: SkillLevel }) {
  return <span className="text-xs text-gray-500 dark:text-slate-400">{SKILL_LABELS[level]}</span>;
}

const emptyPlayer = (): Omit<Player, 'id' | 'createdAt'> => ({
  name: '', number: 0, position: 'midfielder', skillLevel: 1,
  dateOfBirth: '', parentName: '', parentContact: '',
  active: true,
});

type ViewMode = 'grid' | 'list';

export function Players() {
  const { players, addPlayer, updatePlayer, deletePlayer } = usePlayerStore();
  const matches = useMatchStore((s) => s.matches);
  const { showParentInfo, showDateOfBirth, showPosition } = useSettingsStore((s) => s.settings);

  type SortKey = 'name' | 'number' | 'skillLevel' | 'position' | 'matchCount' | 'goals' | 'participation';

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortKey>('number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterLevel, setFilterLevel] = useState<0 | 1 | 2 | 3>(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [form, setForm] = useState(emptyPlayer());
  const [numberError, setNumberError] = useState('');
  const [viewPlayer, setViewPlayer] = useState<Player | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleSortColumn(col: SortKey) {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
  }

  const filtered = players
    .filter((p) => p.active)
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => filterLevel === 0 || p.skillLevel === filterLevel)
    .sort((a, b) => {
      let diff = 0;
      if (sortBy === 'name') diff = a.name.localeCompare(b.name, 'fi');
      else if (sortBy === 'number') diff = a.number - b.number;
      else if (sortBy === 'skillLevel') diff = a.skillLevel - b.skillLevel;
      else if (sortBy === 'position') diff = a.position.localeCompare(b.position);
      else if (sortBy === 'matchCount') diff = getPlayerMatchCount(a.id, matches) - getPlayerMatchCount(b.id, matches);
      else if (sortBy === 'goals') diff = getPlayerGoals(a.id, matches) - getPlayerGoals(b.id, matches);
      else if (sortBy === 'participation') diff = getPlayerParticipation(a.id, matches) - getPlayerParticipation(b.id, matches);
      return sortDir === 'asc' ? diff : -diff;
    });

  function openAdd() {
    setEditing(null);
    setForm(emptyPlayer());
    setNumberError('');
    setShowModal(true);
  }

  function openEdit(p: Player) {
    setEditing(p);
    setForm({ ...p });
    setNumberError('');
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (form.number < 1 || form.number > 99) {
      setNumberError('Numeron täytyy olla välillä 1–99');
      return;
    }
    const duplicate = players.find(
      (p) => p.number === form.number && p.id !== editing?.id
    );
    if (duplicate) {
      setNumberError(`Numero ${form.number} on jo pelaajalla ${duplicate.name}`);
      return;
    }
    if (editing) {
      updatePlayer(editing.id, form);
    } else {
      addPlayer({ ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    }
    setShowModal(false);
  }

  // const activeCount = players.filter((p) => p.active).length;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Etsi pelaajia…"
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
            />
          </div>
          {viewMode === 'grid' && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="name">Nimi</option>
              <option value="number">Numero</option>
              <option value="skillLevel">Taso</option>
              <option value="position">Pelipaikka</option>
            </select>
          )}
          <Badge label={`${filtered.length} pelaajaa`} color="green" />
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 transition-colors ${viewMode === 'grid' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
              title="Korttinäkymä"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1.5 border-l border-gray-200 dark:border-slate-700 transition-colors ${viewMode === 'list' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
              title="Listanäkymä"
            >
              <List size={15} />
            </button>
          </div>
          <Button icon={<UserPlus size={15} />} onClick={openAdd}>
            Lisää pelaaja
          </Button>
        </div>
      </div>

      {/* Level filter pills */}
      <div className="flex gap-2">
        {([0, 1, 2, 3] as const).map((level) => {
          const label = level === 0 ? 'Kaikki' : level === 1 ? 'Taso 1' : level === 2 ? 'Taso 2' : 'Taso 1 + Taso 2';
          const active = filterLevel === level;
          return (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <p className="text-center text-gray-400 dark:text-slate-500 py-8">Pelaajia ei löydy. Lisää ensimmäinen pelaaja!</p>
        </Card>
      )}

      {/* ── GRID VIEW ── */}
      {filtered.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const matchCount = getPlayerMatchCount(p.id, matches);
            const goals = getPlayerGoals(p.id, matches);
            const pct = getPlayerParticipation(p.id, matches);
            return (
              <div
                key={p.id}
                onClick={() => setViewPlayer(p)}
                className="bg-gray-100 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 cursor-pointer hover:border-brand-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center font-bold text-white text-sm shadow-sm">
                      {p.number}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">{p.name}</p>
                      {showPosition && <Badge label={POSITION_LABELS[p.position]} color={posColor[p.position]} />}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => openEdit(p)} />
                    <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={() => setConfirmDeleteId(p.id)} />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white dark:bg-slate-700 rounded-lg p-2 shadow-sm">
                    <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{matchCount}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Ottelut</p>
                  </div>
                  <div className="bg-white dark:bg-slate-700 rounded-lg p-2 shadow-sm">
                    <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{goals}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Maalit</p>
                  </div>
                  <div className="bg-white dark:bg-slate-700 rounded-lg p-2 shadow-sm">
                    <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{pct}%</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Osallistuminen</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <SkillLabel level={p.skillLevel} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {filtered.length > 0 && viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                {(
                  [
                    { col: 'number' as SortKey, label: '#', align: 'left', px: 'px-4' },
                    { col: 'name' as SortKey, label: 'Nimi', align: 'left', px: 'px-4' },
                    ...(showPosition ? [{ col: 'position' as SortKey, label: 'Pelipaikka', align: 'left', px: 'px-4' }] : []),
                    { col: 'skillLevel' as SortKey, label: 'Taito', align: 'center', px: 'px-3' },
                    { col: 'matchCount' as SortKey, label: 'Ottelut', align: 'center', px: 'px-3' },
                    { col: 'goals' as SortKey, label: 'Maalit', align: 'center', px: 'px-3' },
                    { col: 'participation' as SortKey, label: 'Os.%', align: 'center', px: 'px-3' },
                  ] as { col: SortKey; label: string; align: string; px: string }[]
                ).map(({ col, label, align, px }) => {
                  const active = sortBy === col;
                  const Icon = active ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
                  return (
                    <th
                      key={col}
                      onClick={() => handleSortColumn(col)}
                      className={`${px} py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none transition-colors hover:text-brand-600 dark:hover:text-brand-400 text-${align} ${active ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-slate-400'}`}
                    >
                      <span className={`inline-flex items-center gap-0.5 ${align === 'center' ? 'justify-center w-full' : ''}`}>
                        {label}
                        <Icon size={12} className="flex-shrink-0" />
                      </span>
                    </th>
                  );
                })}
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => {
                const matchCount = getPlayerMatchCount(p.id, matches);
                const goals = getPlayerGoals(p.id, matches);
                const pct = getPlayerParticipation(p.id, matches);
                return (
                  <tr
                    key={p.id}
                    onClick={() => setViewPlayer(p)}
                    className={`cursor-pointer border-b border-gray-100 dark:border-slate-700 last:border-0 hover:bg-brand-50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-900'}`}
                  >
                    <td className="px-4 py-3">
                      <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
                        {p.number}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{p.name}</td>
                    {showPosition && <td className="px-4 py-3"><Badge label={POSITION_LABELS[p.position]} color={posColor[p.position]} /></td>}
                    <td className="px-3 py-3">
                      <div className="flex justify-center">
                        <SkillLabel level={p.skillLevel} />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-gray-800 dark:text-slate-200">{matchCount}</td>
                    <td className="px-3 py-3 text-center font-semibold text-gray-800 dark:text-slate-200">{goals}</td>
                    <td className="px-3 py-3 text-center font-semibold text-gray-800 dark:text-slate-200">{pct}%</td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => openEdit(p)} />
                        <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={() => setConfirmDeleteId(p.id)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editing ? 'Muokkaa pelaajaa' : 'Lisää pelaaja'} onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nimi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pelaajan nimi" />
              <Input
                label="Pelaajanumero"
                type="text"
                inputMode="numeric"
                placeholder="1–99"
                value={form.number === 0 ? '' : String(form.number)}
                error={numberError}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
                  const num = parseInt(raw, 10);
                  setForm({ ...form, number: raw ? num : 0 });
                  if (!raw || num < 1 || num > 99) {
                    setNumberError('Anna numero väliltä 1–99');
                  } else {
                    setNumberError('');
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {showPosition && (
                <Select label="Pelipaikka" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value as Position })}>
                  {POSITIONS.map((p) => <option key={p} value={p}>{POSITION_LABELS[p]}</option>)}
                </Select>
              )}
              <Select label="Taitotaso" value={form.skillLevel} onChange={(e) => setForm({ ...form, skillLevel: +e.target.value as SkillLevel })}>
                {([1, 2, 3] as SkillLevel[]).map((n) => <option key={n} value={n}>{SKILL_LABELS[n]}</option>)}
              </Select>
            </div>
            {showDateOfBirth && <Input label="Syntymäaika" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />}
            {showParentInfo && <Input label="Vanhemman nimi" value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} />}
            {showParentInfo && <Input label="Vanhemman yhteystieto (puh / sähköposti)" value={form.parentContact} onChange={(e) => setForm({ ...form, parentContact: e.target.value })} />}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Peruuta</Button>
              <Button onClick={handleSave}>{editing ? 'Tallenna muutokset' : 'Lisää pelaaja'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Player Modal */}
      {viewPlayer && (
        <Modal title={viewPlayer.name} onClose={() => setViewPlayer(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center text-2xl font-bold text-white shadow">
                {viewPlayer.number}
              </div>
              <div>
                {showPosition && <Badge label={POSITION_LABELS[viewPlayer.position]} color={posColor[viewPlayer.position]} />}
                <div className="mt-1"><SkillLabel level={viewPlayer.skillLevel} /></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{getPlayerMatchCount(viewPlayer.id, matches)}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Ottelut</p>
              </div>
              <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{getPlayerGoals(viewPlayer.id, matches)}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Maalit</p>
              </div>
              <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{getPlayerParticipation(viewPlayer.id, matches)}%</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Osallistuminen</p>
              </div>
            </div>
            <div className="space-y-1 text-sm text-gray-600 dark:text-slate-300">
              {showDateOfBirth && viewPlayer.dateOfBirth && <p><span className="font-medium">Syntynyt:</span> {viewPlayer.dateOfBirth}</p>}
              {showParentInfo && viewPlayer.parentName && <p><span className="font-medium">Vanhempi:</span> {viewPlayer.parentName}</p>}
              {showParentInfo && viewPlayer.parentContact && <p><span className="font-medium">Yhteystieto:</span> {viewPlayer.parentContact}</p>}
            </div>
          </div>
        </Modal>
      )}

      {confirmDeleteId && (() => {
        const player = players.find((p) => p.id === confirmDeleteId);
        return (
          <Modal title="Poistetaanko pelaaja?" onClose={() => setConfirmDeleteId(null)}>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
              Haluatko varmasti poistaa pelaajan <strong>{player?.name}</strong>? Tätä toimintoa ei voi peruuttaa.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Peruuta</Button>
              <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => { deletePlayer(confirmDeleteId); setConfirmDeleteId(null); }}>
                Poista
              </Button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
