import { useState } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { useMatchStore } from '../../store/useMatchStore';
import { useTeamStore } from '../../store/useTeamStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import type { Match, MatchLevel, MatchLocation, OwnTeam } from '../../types';

interface Props {
  editing?: Match;
  initialDate?: Date;
  onClose: () => void;
}

function emptyForm(
  initialDate?: Date,
  team?: OwnTeam,
  defaultFormat = '7v7' as string,
): Omit<Match, 'id' | 'createdAt'> {
  return {
    date: initialDate ? format(initialDate, "yyyy-MM-dd'T'HH:mm") + ':00' : '',
    opponent: '',
    level: 'league',
    location: 'home',
    format: (team?.format ?? defaultFormat) as Match['format'],
    teamLevel: 'taso1',
    venue: '',
    address: '',
    lineup: [],
    availability: [],
    notes: '',
    ownTeamId: team?.id,
  };
}

const INPUT = 'w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm font-medium placeholder:text-gray-600 focus:outline-none focus:border-gray-500 transition-colors';
const INPUT_DATE = INPUT + ' dark-input';

export function MatchFormModal({ editing, initialDate, onClose }: Props) {
  const { addMatch, updateMatch } = useMatchStore();
  const teams = useTeamStore((s) => s.teams);
  const defaultFormat = useSettingsStore((s) => s.settings.defaultTeamFormat);

  const [step, setStep] = useState<'team' | 'form'>(
    editing || teams.length === 0 ? 'form' : 'team'
  );

  const [selectedTeam, setSelectedTeam] = useState<OwnTeam | undefined>(() => {
    if (editing?.ownTeamId) return teams.find((t) => t.id === editing.ownTeamId);
    return undefined;
  });

  const [form, setForm] = useState<Omit<Match, 'id' | 'createdAt'>>(() =>
    editing ? { ...editing } : emptyForm(initialDate, undefined, defaultFormat)
  );

  function pickTeam(team: OwnTeam) {
    setSelectedTeam(team);
    setForm((f) => ({ ...f, ownTeamId: team.id, format: team.format ?? (defaultFormat as Match['format']), teamLevel: team.level ?? 'taso1' }));
  }

  function handleSave() {
    if (!form.date || !form.opponent) return;
    if (editing) {
      updateMatch(editing.id, form);
    } else {
      addMatch({ ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    }
    onClose();
  }

  const showSteps = !editing && teams.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md sm:mx-auto rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Askelmittari */}
        {showSteps && (
          <div className="bg-gray-900 px-6 pt-4 pb-3 flex items-center gap-3 flex-shrink-0">
            <div className={`flex items-center gap-1.5 ${step === 'team' ? 'text-white' : 'text-green-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step === 'form' ? 'bg-green-700' : 'bg-brand-600'}`}>
                {step === 'form' ? '✓' : '1'}
              </span>
              <span className="text-xs font-semibold">Joukkue</span>
            </div>
            <div className={`flex-1 h-px ${step === 'form' ? 'bg-brand-600' : 'bg-gray-700'}`} />
            <div className={`flex items-center gap-1.5 ${step === 'form' ? 'text-white' : 'text-gray-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step === 'form' ? 'bg-brand-600' : 'bg-gray-700'}`}>
                2
              </span>
              <span className="text-xs font-semibold">Tiedot</span>
            </div>
          </div>
        )}

        {/* ── Vaihe 1: Joukkueen valinta ─────── */}
        {step === 'team' && (
          <>
            <div className="bg-gray-900 px-5 pt-4 pb-5 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                {initialDate && (
                  <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                    {format(initialDate, 'dd.MM.yyyy')}
                  </p>
                )}
                <button
                  onClick={onClose}
                  className="ml-auto w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/20 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <h2 className="text-lg font-bold text-white mb-4">Kenelle joukkueelle?</h2>
              <div className="space-y-2">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => pickTeam(t)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                      selectedTeam?.id === t.id
                        ? 'border-brand-600 bg-brand-600/10'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                      style={{ backgroundColor: t.color ?? '#6b7280' }}
                    >
                      {t.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{t.name}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ${
                      selectedTeam?.id === t.id
                        ? 'bg-brand-600/30 text-green-300'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {t.format ?? defaultFormat}
                    </span>
                    {selectedTeam?.id === t.id && (
                      <span className="text-brand-500 font-bold text-sm">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 px-5 py-4 flex gap-3 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-5 py-3 rounded-2xl bg-gray-700 text-sm font-semibold text-gray-300 hover:bg-gray-600 transition-colors"
              >
                Peruuta
              </button>
              <button
                onClick={() => selectedTeam && setStep('form')}
                disabled={!selectedTeam}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${
                  selectedTeam
                    ? 'bg-brand-600 text-white hover:bg-gray-900'
                    : 'bg-gray-700 text-gray-600 cursor-not-allowed'
                }`}
              >
                Jatka →
              </button>
            </div>
          </>
        )}

        {/* ── Vaihe 2: Lomake ────────────────── */}
        {step === 'form' && (
          <>
            {/* Tumma hero */}
            <div className="bg-gray-900 px-5 pt-4 pb-5 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                {editing ? (
                  <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Muokkaa ottelua</p>
                ) : selectedTeam ? (
                  <button
                    onClick={() => setStep('team')}
                    className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 hover:bg-white/15 transition-colors"
                  >
                    <div
                      className="w-5 h-5 rounded-md flex-shrink-0"
                      style={{ backgroundColor: selectedTeam.color ?? '#6b7280' }}
                    />
                    <span className="text-sm font-bold text-white">{selectedTeam.name}</span>
                    <span className="text-xs text-white/40">· {selectedTeam.format ?? defaultFormat}</span>
                    <span className="text-xs text-white/25 ml-1">vaihda</span>
                  </button>
                ) : (
                  <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Lisää ottelu</p>
                )}
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/20 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Päivä + vastustaja */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-1.5">Päivä ja aika</p>
                  <input
                    type="datetime-local"
                    value={form.date.slice(0, 16)}
                    onChange={(e) => setForm({ ...form, date: e.target.value + ':00' })}
                    className={INPUT_DATE}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-1.5">Vastustaja</p>
                  <input
                    type="text"
                    value={form.opponent}
                    onChange={(e) => setForm({ ...form, opponent: e.target.value })}
                    placeholder="Joukkueen nimi"
                    className={INPUT}
                  />
                </div>
              </div>

              {/* Koti / Vieras */}
              <div className="grid grid-cols-2 gap-2">
                {([['home', '🏠', 'Kotipeli'] as const, ['away', '✈️', 'Vieraspeli'] as const]).map(
                  ([val, icon, label]) => (
                    <button
                      key={val}
                      onClick={() => setForm({ ...form, location: val as MatchLocation })}
                      className={`py-3 rounded-xl border-2 text-center transition-all ${
                        form.location === val
                          ? val === 'home'
                            ? 'border-brand-600 bg-brand-600/15'
                            : 'border-blue-500 bg-blue-500/15'
                          : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                      }`}
                    >
                      <span className="block text-xl mb-1">{icon}</span>
                      <span className={`text-xs font-bold ${
                        form.location === val
                          ? val === 'home' ? 'text-green-300' : 'text-blue-300'
                          : 'text-gray-500'
                      }`}>{label}</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Tumma alaosa */}
            <div className="bg-gray-800 overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* Tyyppi */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Tyyppi</p>
                <div className="flex gap-2">
                  {([['league', 'Sarja'], ['friendly', 'Harjoitusottelu']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setForm({ ...form, level: val as MatchLevel })}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-colors ${
                        form.level === val
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Taso */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Taso</p>
                <div className="flex gap-2">
                  {([['taso1', 'Taso 1'], ['taso2', 'Taso 2']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setForm({ ...form, teamLevel: val })}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-colors ${
                        (form.teamLevel ?? 'taso1') === val
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paikka */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Paikka</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    placeholder="Kenttä / halli"
                    className={INPUT}
                  />
                  <input
                    type="text"
                    value={form.address ?? ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Osoite"
                    className={INPUT}
                  />
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-gray-800 px-5 pb-8 pt-3 flex gap-3 flex-shrink-0 border-t border-gray-700">
              <button
                onClick={!editing && teams.length > 0 ? () => setStep('team') : onClose}
                className="px-5 py-3.5 rounded-2xl bg-gray-700 text-sm font-semibold text-gray-300 hover:bg-gray-600 transition-colors"
              >
                {!editing && teams.length > 0 ? '← Takaisin' : 'Peruuta'}
              </button>
              <button
                onClick={handleSave}
                disabled={!form.date || !form.opponent}
                className={`flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                  form.date && form.opponent
                    ? 'bg-brand-600 text-white hover:bg-gray-900'
                    : 'bg-gray-700 text-gray-600 cursor-not-allowed'
                }`}
              >
                {editing ? 'Tallenna muutokset' : 'Lisää ottelu'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
