import { useRef, useState, useEffect } from 'react';
import type { TeamFormat } from '../types';
import { Download, Upload, Trash2, RotateCcw, Check, Save, ChevronDown, Plus, X, Link, Copy } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMatchStore } from '../store/useMatchStore';
import { useTrainingStore } from '../store/useTrainingStore';
import { useTeamStore } from '../store/useTeamStore';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { getCoachProfiles } from '../lib/firestore/userData';
import { createInvitation } from '../lib/firestore/invitations';
import { removeCoachFromTeam } from '../lib/firestore/teams';

function CollapsibleCard({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between mb-0 group"
      >
        <h2 className="font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
        <ChevronDown
          size={16}
          className={`text-gray-400 dark:text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="mt-4">{children}</div>}
    </Card>
  );
}

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{label}</p>
        {description && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${
          checked ? 'bg-brand-600' : 'bg-gray-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export function Settings() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const players = usePlayerStore((s) => s.players);
  const matches = useMatchStore((s) => s.matches);
  const sessions = useTrainingStore((s) => s.sessions);
  const { addPlayer } = usePlayerStore();
  const { addMatch } = useMatchStore();
  const { addSession } = useTrainingStore();
  const { teams, addTeam, deleteTeam } = useTeamStore();
  const [newTeamName, setNewTeamName] = useState('');

  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  useEffect(() => { setDraft(settings); }, [settings]);

  const authUser = useAuthStore((s) => s.user);
  const authTeams = useAuthStore((s) => s.teams);
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  const activeTeam = authTeams.find((t) => t.id === activeTeamId) ?? null;
  const isHeadCoach = activeTeam?.headCoachId === authUser?.uid;

  const [coachProfiles, setCoachProfiles] = useState<
    { uid: string; displayName: string; email: string }[]
  >([]);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (!activeTeam?.coaches?.length) {
      setCoachProfiles([]);
      return;
    }
    getCoachProfiles(activeTeam.coaches).then(setCoachProfiles).catch(console.error);
  }, [activeTeam?.coaches?.join(',')]);

  async function handleRemoveCoach(coachId: string) {
    if (!activeTeam) return;
    await removeCoachFromTeam(activeTeam.id, coachId);
    setCoachProfiles((prev) => prev.filter((c) => c.uid !== coachId));
    setConfirmRemoveId(null);
  }

  async function handleCreateInvite() {
    if (!activeTeam || !authUser) return;
    setInviteLoading(true);
    try {
      const token = await createInvitation(activeTeam.id, authUser.uid);
      setInviteUrl(`${window.location.origin}/join?token=${token}`);
    } catch (err) {
      console.error(err);
    } finally {
      setInviteLoading(false);
    }
  }

  function handleSave() {
    updateSettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleReset() {
    resetSettings();
  }

  const [clearConfirm, setClearConfirm] = useState(false);
  const [importError, setImportError] = useState('');
  const [importOk, setImportOk] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function exportData() {
    const data = JSON.stringify({ players, matches, sessions }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jalkapallo-varmuuskopio-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportOk(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (!json.players || !json.matches) throw new Error('Virheellinen tiedostorakenne');
        json.players?.forEach((p: any) => addPlayer(p));
        json.matches?.forEach((m: any) => addMatch(m));
        json.sessions?.forEach((s: any) => addSession(s));
        setImportOk(true);
        setTimeout(() => setImportOk(false), 3000);
      } catch {
        setImportError('Tiedoston lukeminen epäonnistui. Tarkista että se on oikea varmuuskopiotiedosto.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function clearAllData() {
    localStorage.removeItem('football-players');
    localStorage.removeItem('football-matches');
    localStorage.removeItem('football-training');
    window.location.reload();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

      <CollapsibleCard title="Valmentajat">
        {!activeTeam ? (
          <p className="text-sm text-gray-400 dark:text-slate-500">Ei aktiivista joukkuetta.</p>
        ) : (
          <div className="space-y-2">
            {coachProfiles.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-slate-500 italic">Ladataan valmentajia…</p>
            )}
            {coachProfiles.map((coach) => (
              <div
                key={coach.uid}
                className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-50 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                      {(coach.displayName || coach.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                      {coach.displayName || '—'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{coach.email}</p>
                  </div>
                  {coach.uid === activeTeam.headCoachId && (
                    <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                      Päävalmentaja
                    </span>
                  )}
                </div>

                {isHeadCoach && coach.uid !== authUser?.uid && (
                  confirmRemoveId === coach.uid ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-500 dark:text-slate-400">Vahvistetaanko poisto?</span>
                      <Button variant="danger" size="sm" onClick={() => handleRemoveCoach(coach.uid)}>
                        Kyllä
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setConfirmRemoveId(null)}>
                        Peruuta
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setConfirmRemoveId(coach.uid)}
                    >
                      Poista
                    </Button>
                  )
                )}
              </div>
            ))}

            {isHeadCoach && (
              <div className="pt-3 border-t border-gray-100 dark:border-slate-700 space-y-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Link size={14} />}
                  onClick={handleCreateInvite}
                >
                  {inviteLoading ? 'Luodaan…' : 'Luo kutsulinkki'}
                </Button>
                {inviteUrl && (
                  <div className="flex gap-2 items-center mt-2">
                    <input
                      readOnly
                      value={inviteUrl}
                      className="flex-1 text-xs border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Copy size={13} />}
                      onClick={() => navigator.clipboard.writeText(inviteUrl)}
                    >
                      Kopioi
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CollapsibleCard>

      <CollapsibleCard title="Joukkueen tiedot">
        <div className="space-y-3">
          <Input
            label="Joukkueen nimi"
            value={draft.teamName}
            onChange={(e) => setDraft({ ...draft, teamName: e.target.value })}
            placeholder="esim. FC Tähdet U13"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kausi"
              value={draft.season}
              onChange={(e) => setDraft({ ...draft, season: e.target.value })}
              placeholder="esim. 2026"
            />
            <Input
              label="Valmentajan nimi"
              value={draft.coachName}
              onChange={(e) => setDraft({ ...draft, coachName: e.target.value })}
              placeholder="Oma nimesi"
            />
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Joukkueet</p>
            <div className="space-y-1.5 mb-2">
              {teams.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-slate-500 italic">Ei joukkueita vielä.</p>
              )}
              {teams.map((t) => (
                <div key={t.id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-900 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-800 dark:text-slate-200">{t.name}</span>
                  <button onClick={() => deleteTeam(t.id)} className="text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTeamName.trim()) {
                    addTeam({ id: crypto.randomUUID(), name: newTeamName.trim(), createdAt: new Date().toISOString() });
                    setNewTeamName('');
                  }
                }}
                placeholder="Joukkueen nimi, esim. Valkoiset"
                className="flex-1 border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={() => {
                  if (!newTeamName.trim()) return;
                  addTeam({ id: crypto.randomUUID(), name: newTeamName.trim(), createdAt: new Date().toISOString() });
                  setNewTeamName('');
                }}
                disabled={!newTeamName.trim()}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={13} /> Lisää
              </button>
            </div>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Teema">
        <Toggle
          label="Tumma teema"
          description="Vaihda sovelluksen värimaailma tummaksi"
          checked={draft.theme === 'dark'}
          onChange={(v) => setDraft({ ...draft, theme: v ? 'dark' : 'light' })}
        />
      </CollapsibleCard>

      <CollapsibleCard title="Pelaajan tietojen näkyvyys">
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">Valitse mitä tietoja näytetään pelaajalistassa ja -korteissa.</p>
        <Toggle
          label="Pelipaikka"
          description="Näytä pelaajan pelipaikka"
          checked={draft.showPosition}
          onChange={(v) => setDraft({ ...draft, showPosition: v })}
        />
        <Toggle
          label="Vanhemman tiedot"
          description="Vanhemman nimi ja yhteystieto"
          checked={draft.showParentInfo}
          onChange={(v) => setDraft({ ...draft, showParentInfo: v })}
        />
        <Toggle
          label="Syntymäaika"
          description="Näytä pelaajan syntymäpäivä"
          checked={draft.showDateOfBirth}
          onChange={(v) => setDraft({ ...draft, showDateOfBirth: v })}
        />
      </CollapsibleCard>

      <CollapsibleCard title="Otteluasetukset">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-200 block mb-1">
              Kokoonpanon minimimäärä
            </label>
            <input
              type="number"
              min={3}
              max={11}
              value={draft.minLineupSize}
              onChange={(e) => setDraft({ ...draft, minLineupSize: Math.max(3, Math.min(11, +e.target.value)) })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Muistutus jos kokoonpanossa alle tämän verran pelaajia</p>
          </div>
          <Select
            label="Oletusmuoto (ottelu ja joukkuegeneraattori)"
            value={draft.defaultTeamFormat}
            onChange={(e) => setDraft({ ...draft, defaultTeamFormat: e.target.value as TeamFormat })}
          >
            <option value="5v5">5 vs 5</option>
            <option value="7v7">7 vs 7</option>
            <option value="8v8">8 vs 8</option>
            <option value="11v11">11 vs 11</option>
          </Select>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Data">
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
          Tiedot tallennetaan selaimeen. Varmuuskopioi säännöllisesti.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-slate-200">Vie varmuuskopio</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {players.length} pelaajaa · {matches.length} ottelua · {sessions.length} harjoitusta
              </p>
            </div>
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportData}>
              Lataa JSON
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-slate-200">Tuo varmuuskopiosta</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">Lisää data olemassaolevan päälle</p>
            </div>
            <div className="flex items-center gap-2">
              {importOk && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <Check size={13} /> Tuotu!
                </span>
              )}
              <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>
                Valitse tiedosto
              </Button>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            </div>
          </div>
          {importError && (
            <p className="text-xs text-red-500 px-1">{importError}</p>
          )}

          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Tyhjennä kaikki data</p>
              <p className="text-xs text-red-400 dark:text-red-500">Poistaa pelaajat, ottelut ja harjoitukset pysyvästi</p>
            </div>
            {clearConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">Oletko varma?</span>
                <Button variant="danger" size="sm" onClick={clearAllData}>Kyllä, tyhjennä</Button>
                <Button variant="secondary" size="sm" onClick={() => setClearConfirm(false)}>Peruuta</Button>
              </div>
            ) : (
              <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setClearConfirm(true)}>
                Tyhjennä
              </Button>
            )}
          </div>
        </div>
      </CollapsibleCard>

      {/* Palauta oletukset */}
      <div className="lg:col-span-2 flex justify-start">
        <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} onClick={handleReset}>
          Palauta oletusasetukset
        </Button>
      </div>

      {/* Sticky save bar */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${isDirty || saved ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-lg px-6 py-3 flex items-center justify-between max-w-2xl mx-auto rounded-t-xl">
          <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            Tallentamattomia muutoksia
          </span>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
                <Check size={15} /> Tallennettu!
              </span>
            )}
            <Button icon={<Save size={14} />} onClick={handleSave}>
              Tallenna muutokset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
