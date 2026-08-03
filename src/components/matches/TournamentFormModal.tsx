import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { TournamentLineupModal } from './TournamentLineupModal';
import { format } from 'date-fns';
import { useTournamentStore } from '../../store/useTournamentStore';
import { useTeamStore } from '../../store/useTeamStore';
import { Modal } from '../ui/Modal';
import { Input, Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import type { Tournament, TournamentMatch } from '../../types';

type TournamentDraft = {
  name: string; date: string; venue: string; address: string;
  notes: string; ownTeamId?: string; level: string;
};
type DraftMatch = { id: string; time: string; field: string; opponent: string; location: 'home' | 'away' };

function emptyDraftMatch(): DraftMatch {
  return { id: crypto.randomUUID(), time: '', field: '', opponent: '', location: 'home' };
}

interface Props {
  editing?: Tournament;
  initialDate?: Date;
  onClose: () => void;
}

export function TournamentFormModal({ editing, initialDate, onClose }: Props) {
  const { addTournament, updateTournament } = useTournamentStore();
  const teams = useTeamStore((s) => s.teams);

  const [draft, setDraft] = useState<TournamentDraft>(() => {
    if (editing) return {
      name: editing.name, date: editing.date ?? '', venue: editing.venue ?? '',
      address: editing.address ?? '', notes: editing.notes ?? '',
      ownTeamId: editing.ownTeamId, level: editing.level ?? '',
    };
    return {
      name: '', date: initialDate ? format(initialDate, 'yyyy-MM-dd') : '',
      venue: '', address: '', notes: '', ownTeamId: undefined, level: '',
    };
  });

  const [lineup, setLineup] = useState<string[]>(() => editing?.lineup ?? []);
  const [showLineupModal, setShowLineupModal] = useState(false);

  const [draftMatches, setDraftMatches] = useState<DraftMatch[]>(() => {
    if (editing) return (editing.matches ?? []).map((m) => ({
      id: m.id, time: m.time ?? '', field: m.field ?? '', opponent: m.opponent, location: m.location ?? 'home',
    }));
    return [];
  });

  function handleSave() {
    if (!draft.name.trim()) return;
    const savedMatches: TournamentMatch[] = draftMatches
      .filter((m) => m.opponent.trim())
      .map((m) => {
        const existing = editing?.matches.find((em) => em.id === m.id);
        return {
          id: m.id,
          time: m.time || undefined,
          field: m.field || undefined,
          opponent: m.opponent,
          location: m.location,
          ...(existing?.result ? { result: existing.result } : {}),
        };
      });
    if (editing) {
      updateTournament(editing.id, { ...draft, lineup, matches: savedMatches });
    } else {
      addTournament({ ...draft, lineup, matches: savedMatches, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    }
    onClose();
  }

  return (
    <>
    <Modal title={editing ? 'Muokkaa turnausta' : 'Luo turnaus'} onClose={onClose} wide>
      <div className="space-y-4">
        {/* Tournament details */}
        <div className="space-y-3">
          <Input
            label="Turnauksen nimi *"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="esim. Kevätcup 2026"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Päivämäärä" type="date" value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            <Input label="Paikka / Kenttä" value={draft.venue}
              onChange={(e) => setDraft({ ...draft, venue: e.target.value })}
              placeholder="Kentän nimi" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Osoite" value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              placeholder="Katuosoite" />
            <Input label="Taso / Sarja" value={draft.level}
              onChange={(e) => setDraft({ ...draft, level: e.target.value })}
              placeholder="esim. Kilpa / Haaste" />
          </div>
          {teams.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Pelaava joukkue</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDraft({ ...draft, ownTeamId: undefined })}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    !draft.ownTeamId
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-brand-400'
                  }`}
                >
                  Ei valittu
                </button>
                {teams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDraft({ ...draft, ownTeamId: draft.ownTeamId === t.id ? undefined : t.id })}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      draft.ownTeamId === t.id
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-brand-400'
                    }`}
                    style={draft.ownTeamId === t.id && t.color ? { backgroundColor: t.color, borderColor: t.color } : {}}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Textarea label="Muistiinpanot" value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Kokoonpano</p>
            <Button variant="secondary" size="sm" onClick={() => setShowLineupModal(true)}>
              {lineup.length > 0 ? `Muokkaa kokoonpanoa (${lineup.length})` : 'Lisää kokoonpano'}
            </Button>
          </div>
        </div>

        {/* Matches */}
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">Ottelut</p>
          {draftMatches.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">Ei otteluita vielä.</p>
          )}
          <div className="space-y-2">
            {draftMatches.map((dm, idx) => (
              <div key={dm.id} className="flex flex-col gap-1.5 py-1.5 border-b border-gray-100 dark:border-slate-700 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">{idx + 1}.</span>
                  <input
                    type="text"
                    value={dm.opponent}
                    onChange={(e) => setDraftMatches(draftMatches.map((x) => x.id === dm.id ? { ...x, opponent: e.target.value } : x))}
                    placeholder="Vastustaja *"
                    className="flex-1 text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setDraftMatches(draftMatches.map((x) => x.id === dm.id ? { ...x, location: x.location === 'home' ? 'away' : 'home' } : x))}
                    className={`text-xs font-semibold px-2 py-1.5 rounded-lg border flex-shrink-0 transition-colors ${
                      dm.location === 'home'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    {dm.location === 'home' ? 'Koti' : 'Vieras'}
                  </button>
                  <button
                    onClick={() => setDraftMatches(draftMatches.filter((x) => x.id !== dm.id))}
                    className="text-gray-300 dark:text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="flex items-center gap-2 pl-6">
                  <input
                    type="time"
                    value={dm.time}
                    onChange={(e) => setDraftMatches(draftMatches.map((x) => x.id === dm.id ? { ...x, time: e.target.value } : x))}
                    className="w-28 text-sm border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={dm.field}
                    onChange={(e) => setDraftMatches(draftMatches.map((x) => x.id === dm.id ? { ...x, field: e.target.value } : x))}
                    placeholder="Kenttä"
                    className="flex-1 min-w-0 text-sm border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setDraftMatches([...draftMatches, emptyDraftMatch()])}
            className="mt-2 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            <Plus size={15} /> Lisää ottelu
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Peruuta</Button>
          <Button onClick={handleSave} disabled={!draft.name.trim()}>
            {editing ? 'Tallenna muutokset' : 'Luo turnaus'}
          </Button>
        </div>
      </div>
    </Modal>
    {showLineupModal && (
      <TournamentLineupModal
        initialLineup={lineup}
        ownTeamId={draft.ownTeamId}
        onSave={(ids) => { setLineup(ids); setShowLineupModal(false); }}
        onClose={() => setShowLineupModal(false)}
      />
    )}
    </>
  );
}
