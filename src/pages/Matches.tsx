import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from "lucide-react";
import { useMatchStore } from "../store/useMatchStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Input, Textarea } from "../components/ui/Input";
import { format } from "date-fns";
import type {
  Match,
  MatchLevel,
  MatchLocation,
  MatchResult,
  TeamFormat,
  TeamLevel,
} from "../types";

function getLineupThresholds(format?: TeamFormat): { low: number; max: number } {
  if (format === "5v5")   return { low: 5, max: 9 };
  if (format === "7v7")   return { low: 7, max: 12 };
  if (format === "8v8")   return { low: 8, max: 11 };
  if (format === "11v11") return { low: 11, max: 14 };
  return { low: 7, max: 12 };
}

const emptyMatch = (): Omit<Match, "id" | "createdAt"> => ({
  date: "",
  opponent: "",
  level: "league",
  location: "home",
  format: "7v7",
  teamLevel: "taso1",
  venue: "",
  address: "",
  lineup: [],
  availability: [],
  notes: "",
});

const levelLabels: Record<MatchLevel, string> = {
  league: "Sarja", cup: "Cup", tournament: "Turnaus", friendly: "Harjoitusottelu",
};

const levelColors: Record<MatchLevel, "blue" | "purple" | "yellow" | "green"> =
  {
    league: "blue",
    cup: "purple",
    tournament: "yellow",
    friendly: "green",
  };

export function Matches() {
  const navigate = useNavigate();
  const { matches, addMatch, updateMatch, deleteMatch, setResult } =
    useMatchStore();
  const players = usePlayerStore((s) => s.players);
  const defaultTeamFormat = useSettingsStore((s) => s.settings.defaultTeamFormat);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Match | null>(null);
  const [form, setForm] = useState(emptyMatch());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<Match | null>(null);
  const [resultForm, setResultForm] = useState<MatchResult>({
    goalsFor: 0,
    goalsAgainst: 0,
    scorers: [],
  });

  const sorted = [...matches].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const past = sorted.filter((m) => m.result);
  const upcoming = sorted
    .filter((m) => !m.result)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyMatch(), format: defaultTeamFormat });
    setShowForm(true);
  }
  function openEdit(m: Match) {
    setEditing(m);
    setForm({ ...m });
    setShowForm(true);
  }
  function handleSave() {
    if (!form.date || !form.opponent) return;
    if (editing) updateMatch(editing.id, form);
    else
      addMatch({
        ...form,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      });
    setShowForm(false);
  }

  function openResult(m: Match) {
    setResultModal(m);
    setResultForm(m.result ?? { goalsFor: 0, goalsAgainst: 0, scorers: [] });
  }

  function handleSaveResult() {
    if (!resultModal) return;
    setResult(resultModal.id, resultForm);
    setResultModal(null);
  }

  function toggleScorer(playerId: string, count: number) {
    const existing = resultForm.scorers.find((s) => s.playerId === playerId);
    if (count === 0) {
      setResultForm({
        ...resultForm,
        scorers: resultForm.scorers.filter((s) => s.playerId !== playerId),
      });
    } else if (existing) {
      setResultForm({
        ...resultForm,
        scorers: resultForm.scorers.map((s) =>
          s.playerId === playerId ? { ...s, count } : s
        ),
      });
    } else {
      setResultForm({
        ...resultForm,
        scorers: [...resultForm.scorers, { playerId, count }],
      });
    }
  }

  function MatchRow({ m }: { m: Match }) {
    const open = expanded === m.id;
    const lineupPlayers = m.lineup
      .map((id) => players.find((p) => p.id === id))
      .filter(Boolean);
    return (
      <div className="border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden">
        <div
          className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          onClick={() => setExpanded(open ? null : m.id)}
        >
          <div className="flex items-center gap-3">
            <div className="text-center min-w-[44px]">
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {format(new Date(m.date), "EEE")}
              </p>
              <p className="text-base font-bold text-gray-900 dark:text-slate-100">
                {format(new Date(m.date), "dd.MM")}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-slate-100">vs {m.opponent}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge label={levelLabels[m.level]} color={levelColors[m.level]} />
                {m.teamLevel && (
                  <Badge label={m.teamLevel === 'taso1' ? 'Taso 1' : 'Taso 2'} color={m.teamLevel === 'taso1' ? 'purple' : 'yellow'} />
                )}
                <Badge
                  label={m.location === "home" ? "Koti" : "Vieras"}
                  color={m.location === "home" ? "green" : "blue"}
                />
                {m.venue && (
                  <span className="text-xs text-gray-400 dark:text-slate-500">{m.venue}</span>
                )}
                {m.address && (
                  <span className="text-xs text-gray-400 dark:text-slate-500">· {m.address}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {m.result ? (
              <span
                className={`font-bold text-lg ${
                  m.result.goalsFor > m.result.goalsAgainst
                    ? "text-green-600"
                    : m.result.goalsFor < m.result.goalsAgainst
                    ? "text-red-500"
                    : "text-gray-600 dark:text-slate-300"
                }`}
              >
                {m.result.goalsFor} – {m.result.goalsAgainst}
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                <Badge label="Tuleva" color="blue" />
                {(() => {
                  const { low, max } = getLineupThresholds(m.format);
                  const n = m.lineup.length;
                  if (n === 0)
                    return <span className="text-xs font-medium text-red-500">● Ei kokoonpanoa</span>;
                  const color = n < low ? "text-red-500" : n < max ? "text-yellow-600" : "text-green-600";
                  return <span className={`text-xs font-medium ${color}`}>● {n}/{max}</span>;
                })()}
              </div>
            )}
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                icon={<Pencil size={13} />}
                onClick={() => openEdit(m)}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={13} />}
                onClick={() => deleteMatch(m.id)}
              />
            </div>
            {open ? (
              <ChevronUp size={16} className="text-gray-400 dark:text-slate-500" />
            ) : (
              <ChevronDown size={16} className="text-gray-400 dark:text-slate-500" />
            )}
          </div>
        </div>
        {open && (
          <div className="px-4 pb-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700">
            <div className="pt-3 space-y-3">
              {!m.result && m.lineup.length === 0 && (
                <button
                  onClick={() => navigate(`/planning?matchId=${m.id}`)}
                  className="w-full flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2.5 text-left hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                >
                  <ClipboardList
                    size={16}
                    className="text-yellow-600 flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      Kokoonpano puuttuu
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      Klikkaa suunnitellaksesi joukkue tälle ottelulle
                    </p>
                  </div>
                </button>
              )}
              {m.lineupConfirmed && m.lineup.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    Kokoonpano ({m.lineup.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {lineupPlayers.map(
                      (p) =>
                        p && (
                          <span
                            key={p.id}
                            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full px-2.5 py-1 text-xs font-medium dark:text-slate-200"
                          >
                            #{p.number} {p.name}
                          </span>
                        )
                    )}
                  </div>
                </div>
              )}
              {m.result?.scorers && m.result.scorers.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    Maalintekijät
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.result.scorers.map((s) => {
                      const p = players.find((pl) => pl.id === s.playerId);
                      return p ? (
                        <span
                          key={s.playerId}
                          className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-full px-2.5 py-1 text-xs font-medium"
                        >
                          ⚽ {p.name} ({s.count})
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              {m.notes && (
                <p className="text-sm text-gray-600 dark:text-slate-300 italic">{m.notes}</p>
              )}
              {!m.result && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<ClipboardList size={13} />}
                    onClick={() => navigate(`/planning?matchId=${m.id}`)}
                  >
                    Suunnittele kokoonpano
                  </Button>
                  <Button size="sm" onClick={() => openResult(m)}>
                    Kirjaa tulos
                  </Button>
                </div>
              )}
              {m.result && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openResult(m)}
                >
                  Muokkaa tulosta
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button icon={<Plus size={15} />} onClick={openAdd}>
          Lisää ottelu
        </Button>
      </div>

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Tulevat
          </h2>
          <div className="space-y-2">
            {upcoming.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Tulokset
          </h2>
          <div className="space-y-2">
            {past.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        </section>
      )}

      {matches.length === 0 && (
        <Card>
          <p className="text-center text-gray-400 dark:text-slate-500 py-8">
            Ei otteluita vielä. Lisää ensimmäinen ottelu!
          </p>
        </Card>
      )}

      {/* Add/Edit Match Modal */}
      {showForm && (
        <Modal
          title={editing ? "Muokkaa ottelua" : "Lisää ottelu"}
          onClose={() => setShowForm(false)}
        >
          <div className="space-y-px">
            {/* Perustiedot */}
            <div className="bg-gray-50 dark:bg-slate-900/50 rounded-t-lg px-4 pt-4 pb-3 space-y-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Perustiedot</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Päivämäärä ja aika"
                  type="datetime-local"
                  value={form.date.slice(0, 16)}
                  onChange={(e) => setForm({ ...form, date: e.target.value + ":00Z" })}
                />
                <Input
                  label="Vastustaja"
                  value={form.opponent}
                  onChange={(e) => setForm({ ...form, opponent: e.target.value })}
                  placeholder="Joukkueen nimi"
                />
              </div>
            </div>

            {/* Ottelun tyyppi */}
            <div className="bg-gray-50 dark:bg-slate-900/50 px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Ottelun tyyppi</p>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Tyyppi</p>
                <div className="flex flex-wrap gap-2">
                  {([['league','Sarja'],['cup','Cup'],['tournament','Turnaus'],['friendly','Harjoitusottelu']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setForm({ ...form, level: val as MatchLevel })}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        form.level === val
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-brand-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Sijainti</p>
                  <div className="flex gap-2">
                    {([['home','Koti'],['away','Vieras']] as const).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setForm({ ...form, location: val as MatchLocation })}
                        className={`flex-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          form.location === val
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-brand-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Joukkuetaso</p>
                  <div className="flex gap-2">
                    {([['taso1','Taso 1'],['taso2','Taso 2']] as const).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setForm({ ...form, teamLevel: val as TeamLevel })}
                        className={`flex-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          (form.teamLevel ?? 'taso1') === val
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-brand-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Formaatti</p>
                <div className="flex gap-2">
                  {(['5v5','7v7','8v8','11v11'] as const).map((val) => (
                    <button
                      key={val}
                      onClick={() => setForm({ ...form, format: val as TeamFormat })}
                      className={`flex-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        (form.format ?? '7v7') === val
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-brand-400'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Paikka */}
            <div className="bg-gray-50 dark:bg-slate-900/50 rounded-b-lg px-4 pt-3 pb-4 space-y-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Paikka</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Kenttä / Halli"
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  placeholder="Kentän nimi"
                />
                <Input
                  label="Osoite"
                  value={form.address ?? ''}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Katuosoite"
                />
              </div>
              <Textarea
                label="Muistiinpanot"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Peruuta
              </Button>
              <Button onClick={handleSave}>
                {editing ? "Tallenna muutokset" : "Lisää ottelu"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Result Modal */}
      {resultModal && (
        <Modal
          title={`Tulos: vs ${resultModal.opponent}`}
          onClose={() => setResultModal(null)}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Omat maalit</p>
                <input
                  type="number"
                  min={0}
                  value={resultForm.goalsFor}
                  onChange={(e) =>
                    setResultForm({ ...resultForm, goalsFor: +e.target.value })
                  }
                  className="w-16 text-center text-2xl font-bold border rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                />
              </div>
              <span className="text-2xl text-gray-400 dark:text-slate-500 font-bold">–</span>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Vastustaja</p>
                <input
                  type="number"
                  min={0}
                  value={resultForm.goalsAgainst}
                  onChange={(e) =>
                    setResultForm({
                      ...resultForm,
                      goalsAgainst: +e.target.value,
                    })
                  }
                  className="w-16 text-center text-2xl font-bold border rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                />
              </div>
            </div>
            {resultModal.lineup.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                  Maalintekijät
                </p>
                <div className="rounded-lg border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700 max-h-52 overflow-y-auto">
                  {resultModal.lineup.map((pid) => {
                    const p = players.find((pl) => pl.id === pid);
                    if (!p) return null;
                    const scorer = resultForm.scorers.find((s) => s.playerId === pid);
                    const count = scorer?.count ?? 0;
                    return (
                      <div
                        key={pid}
                        className="flex items-center justify-between px-3 py-2.5 text-sm bg-white dark:bg-slate-800"
                      >
                        <span className="font-medium text-gray-800 dark:text-slate-200">{p.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleScorer(pid, Math.max(0, count - 1))}
                            className="w-7 h-7 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 flex items-center justify-center text-lg leading-none transition-colors"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-bold text-gray-800 dark:text-slate-100">
                            {count}
                          </span>
                          <button
                            onClick={() => toggleScorer(pid, count + 1)}
                            className="w-7 h-7 rounded-md bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center text-lg leading-none transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setResultModal(null)}>
                Peruuta
              </Button>
              <Button onClick={handleSaveResult}>Tallenna tulos</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
