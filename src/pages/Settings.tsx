import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TeamFormat } from '../types';
import { Download, Upload, Trash2, RotateCcw, Check, Save, ChevronDown, Plus, X, Link, Copy, Pencil } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMatchStore } from '../store/useMatchStore';
import { useTrainingStore } from '../store/useTrainingStore';
import { useTeamStore } from '../store/useTeamStore';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { getCoachProfiles } from '../lib/firestore/userData';
import { createInvitation } from '../lib/firestore/invitations';
import { removeCoachFromTeam, deleteFirebaseTeam, updateFirebaseTeamName } from '../lib/firestore/teams';

function CollapsibleCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={className}>
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
    </div>
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

const PRESET_COLORS = ['#1d4ed8', '#dc2626', '#eab308', '#64748b', '#000000'];

export function Settings() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const players = usePlayerStore((s) => s.players);
  const matches = useMatchStore((s) => s.matches);
  const sessions = useTrainingStore((s) => s.sessions);
  const { addPlayer } = usePlayerStore();
  const { addMatch } = useMatchStore();
  const { addSession } = useTrainingStore();
  const { teams, addTeam, updateTeam, deleteTeam } = useTeamStore();
  const { activeSeason, seasons, setActiveSeason, addSeason, renameSeason, removeSeason } = useAppStore();

  type TeamModalDraft = { name: string; color: string; format: TeamFormat; minLineupSize: number };
  const emptyTeamDraft = (): TeamModalDraft => ({ name: '', color: PRESET_COLORS[0], format: '7v7', minLineupSize: 7 });
  const [teamModal, setTeamModal] = useState<{ mode: 'add' | 'edit'; id?: string } | null>(null);
  const [teamDraft, setTeamDraft] = useState<TeamModalDraft>(emptyTeamDraft());
  const [teamSaveConfirm, setTeamSaveConfirm] = useState(false);

  function openAddTeam() {
    setTeamDraft(emptyTeamDraft());
    setTeamSaveConfirm(false);
    setTeamModal({ mode: 'add' });
  }

  function openEditTeam(t: { id: string; name: string; color?: string; format?: TeamFormat; minLineupSize?: number }) {
    setTeamDraft({ name: t.name, color: t.color ?? PRESET_COLORS[0], format: t.format ?? '7v7', minLineupSize: t.minLineupSize ?? 7 });
    setTeamSaveConfirm(false);
    setTeamModal({ mode: 'edit', id: t.id });
  }

  function saveTeamModal() {
    if (!teamDraft.name.trim()) return;
    if (teamModal?.mode === 'add') {
      addTeam({ id: crypto.randomUUID(), name: teamDraft.name.trim(), color: teamDraft.color, format: teamDraft.format, minLineupSize: teamDraft.minLineupSize, createdAt: new Date().toISOString() });
      setTeamModal(null);
    } else if (teamModal?.id) {
      updateTeam(teamModal.id, { name: teamDraft.name.trim(), color: teamDraft.color, format: teamDraft.format, minLineupSize: teamDraft.minLineupSize });
      setTeamModal(null);
    }
  }

  const [newSeasonInput, setNewSeasonInput] = useState('');
  const [confirmSeasonSwitch, setConfirmSeasonSwitch] = useState<string | null>(null);
  const [editingSeason, setEditingSeason] = useState<string | null>(null);
  const [editingSeasonDraft, setEditingSeasonDraft] = useState('');
  const [confirmDeleteSeason, setConfirmDeleteSeason] = useState<string | null>(null);

  function handleSaveSeasonName() {
    const name = editingSeasonDraft.trim();
    if (!name || !editingSeason || (name !== editingSeason && seasons.includes(name))) return;
    if (name !== editingSeason) renameSeason(editingSeason, name);
    setEditingSeason(null);
  }

  function handleCreateSeason() {
    const name = newSeasonInput.trim();
    if (!name || seasons.includes(name)) return;
    addSeason(name);
    setActiveSeason(name);
    setNewSeasonInput('');
    setShowNewSeasonInput(false);
  }

  const [draft, setDraft] = useState({
    showPosition: settings.showPosition,
    showParentInfo: settings.showParentInfo,
    showDateOfBirth: settings.showDateOfBirth,
  });
  const [saved, setSaved] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const deletedTeamName = useRef('');
  const isDirty =
    draft.showPosition !== settings.showPosition ||
    draft.showParentInfo !== settings.showParentInfo ||
    draft.showDateOfBirth !== settings.showDateOfBirth;

  useEffect(() => {
    setDraft({
      showPosition: settings.showPosition,
      showParentInfo: settings.showParentInfo,
      showDateOfBirth: settings.showDateOfBirth,
    });
  }, [settings]);

  const [editingCoachName, setEditingCoachName] = useState(false);
  const [coachNameDraft, setCoachNameDraft] = useState(settings.coachName);
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [showNewSeasonInput, setShowNewSeasonInput] = useState(false);

  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  const activeTeam = useAuthStore(
    (s) => s.teams.find((t) => t.id === activeTeamId) ?? null
  );
  const isHeadCoach = activeTeam?.headCoachId === authUser?.uid;

  const [teamNameDraft, setTeamNameDraft] = useState(activeTeam?.name ?? '');
  const [teamNameSaving, setTeamNameSaving] = useState(false);
  const teamNameDirty = teamNameDraft.trim() !== (activeTeam?.name ?? '');

  async function handleSaveTeamName() {
    if (!activeTeamId || !teamNameDraft.trim()) return;
    setTeamNameSaving(true);
    try {
      await updateFirebaseTeamName(activeTeamId, teamNameDraft.trim());
      const { teams: authTeams, setTeams } = useAuthStore.getState();
      setTeams(authTeams.map((t) => t.id === activeTeamId ? { ...t, name: teamNameDraft.trim() } : t));
      setEditingTeamName(false);
    } finally {
      setTeamNameSaving(false);
    }
  }

  const [coachProfiles, setCoachProfiles] = useState<
    { uid: string; displayName: string; email: string }[]
  >([]);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const coachIdsKey = activeTeam?.coaches?.join(',') ?? '';

  useEffect(() => {
    if (!coachIdsKey) { setCoachProfiles([]); return; }
    getCoachProfiles(coachIdsKey.split(',')).then(setCoachProfiles).catch(console.error);
  }, [coachIdsKey]);

  async function handleRemoveCoach(coachId: string) {
    if (!activeTeam) return;
    try {
      await removeCoachFromTeam(activeTeam.id, coachId);
      const { teams, setTeams } = useAuthStore.getState();
      setTeams(
        teams.map((t) =>
          t.id === activeTeam.id
            ? { ...t, coaches: t.coaches.filter((c) => c !== coachId) }
            : t
        )
      );
      setCoachProfiles((prev) => prev.filter((c) => c.uid !== coachId));
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmRemoveId(null);
    }
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
        json.players?.forEach((p: unknown) => addPlayer(p as Parameters<typeof addPlayer>[0]));
        json.matches?.forEach((m: unknown) => addMatch(m as Parameters<typeof addMatch>[0]));
        json.sessions?.forEach((s: unknown) => addSession(s as Parameters<typeof addSession>[0]));
        setImportOk(true);
        setTimeout(() => setImportOk(false), 3000);
      } catch {
        setImportError('Tiedoston lukeminen epäonnistui. Tarkista että se on oikea varmuuskopiotiedosto.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const [deleteError, setDeleteError] = useState('');

  async function deleteCurrentTeam() {
    if (!activeTeamId) return;
    setDeleteError('');
    try {
      deletedTeamName.current = activeTeam?.name ?? 'Joukkue';
      await deleteFirebaseTeam(activeTeamId);
      setClearConfirm(false);
      setShowDeleteSuccess(true);
    } catch (err) {
      console.error('Failed to delete team:', err);
      setDeleteError('Joukkueen poistaminen epäonnistui. Tarkista internetyhteys.');
    }
  }

  function handleDeleteSuccessClose() {
    setShowDeleteSuccess(false);
    useAuthStore.getState().removeTeam(activeTeamId!);
    const remaining = useAuthStore.getState().teams;
    useAppStore.getState().setActiveTeamId(remaining[0]?.id ?? null);
    navigate('/');
  }


  return (
    <>
    {showDeleteSuccess && (
      <Modal title="Joukkue poistettu" onClose={handleDeleteSuccessClose}>
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check size={24} className="text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-700 dark:text-slate-300">
            <span className="font-semibold">{deletedTeamName.current}</span> on poistettu pysyvästi.
          </p>
          <Button onClick={handleDeleteSuccessClose}>OK</Button>
        </div>
      </Modal>
    )}
    <div className="lg:columns-2 lg:gap-6">

      <CollapsibleCard className="break-inside-avoid mb-6" title="Joukkueen tiedot">
        <div className="space-y-3">
          {activeTeam && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Joukkueen nimi</p>
              {editingTeamName ? (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      autoFocus
                      value={teamNameDraft}
                      onChange={(e) => setTeamNameDraft(e.target.value)}
                      placeholder="Joukkueen nimi"
                    />
                  </div>
                  <Button
                    onClick={handleSaveTeamName}
                    disabled={!teamNameDirty || teamNameSaving || !teamNameDraft.trim()}
                    icon={<Save size={14} />}
                  >
                    {teamNameSaving ? 'Tallennetaan…' : 'Tallenna'}
                  </Button>
                  <Button variant="secondary" onClick={() => { setTeamNameDraft(activeTeam.name ?? ''); setEditingTeamName(false); }}>
                    Peruuta
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{activeTeam.name || '—'}</p>
                  {isHeadCoach ? (
                    <button
                      onClick={() => setEditingTeamName(true)}
                      className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 font-medium transition-colors"
                    >
                      <Pencil size={12} /> Muokkaa
                    </button>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-slate-500">Vain päävalmentaja voi muuttaa.</p>
                  )}
                </div>
              )}
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Valmentajan nimi</p>
            {editingCoachName ? (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    autoFocus
                    value={coachNameDraft}
                    onChange={(e) => setCoachNameDraft(e.target.value)}
                    placeholder="Oma nimesi"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { updateSettings({ coachName: coachNameDraft.trim() }); setEditingCoachName(false); }
                      if (e.key === 'Escape') { setCoachNameDraft(settings.coachName); setEditingCoachName(false); }
                    }}
                  />
                </div>
                <Button size="sm" icon={<Check size={14} />} onClick={() => { updateSettings({ coachName: coachNameDraft.trim() }); setEditingCoachName(false); }}>
                  Tallenna
                </Button>
                <Button variant="secondary" size="sm" onClick={() => { setCoachNameDraft(settings.coachName); setEditingCoachName(false); }}>
                  Peruuta
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {settings.coachName || <span className="italic font-normal text-gray-400 dark:text-slate-500">Ei asetettu</span>}
                </p>
                <button
                  onClick={() => { setCoachNameDraft(settings.coachName); setEditingCoachName(true); }}
                  className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 font-medium transition-colors"
                >
                  <Pencil size={12} /> Muokkaa
                </button>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Joukkueet</p>
            <div className="space-y-1.5 mb-2">
              {teams.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-slate-500 italic">Ei joukkueita vielä.</p>
              )}
              {teams.map((t) => (
                <div key={t.id} className="bg-gray-50 dark:bg-slate-900 rounded-lg px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color ?? '#64748b' }} />
                    <span className="text-sm text-gray-800 dark:text-slate-200">{t.name}</span>
                    {t.format && <span className="text-xs text-gray-400 dark:text-slate-500">{t.format}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditTeam(t)} className="text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deleteTeam(t.id)} className="text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={openAddTeam}
              className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium transition-colors"
            >
              <Plus size={14} /> Lisää joukkue
            </button>
          </div>

          {/* Season management */}
          <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Kaudet</p>
            <div className="space-y-1.5 mb-2">
              {[...seasons].reverse().map((s) => (
                <div key={s} className="bg-gray-50 dark:bg-slate-900 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                  {editingSeason === s ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        autoFocus
                        value={editingSeasonDraft}
                        onChange={(e) => setEditingSeasonDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSeasonName(); if (e.key === 'Escape') setEditingSeason(null); }}
                        className="flex-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <Button size="sm" onClick={handleSaveSeasonName} disabled={!editingSeasonDraft.trim()}>Tallenna</Button>
                      <Button variant="secondary" size="sm" onClick={() => setEditingSeason(null)}>Peruuta</Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-gray-800 dark:text-slate-200">Kausi {s}</span>
                        <button
                          onClick={() => { setEditingSeason(s); setEditingSeasonDraft(s); setConfirmSeasonSwitch(null); setConfirmDeleteSeason(null); }}
                          className="text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        {seasons.length > 1 && (
                          <button
                            onClick={() => { setConfirmDeleteSeason(s); setConfirmSeasonSwitch(null); setEditingSeason(null); }}
                            className="text-gray-300 dark:text-slate-600 hover:text-red-400 transition-colors"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                      {confirmDeleteSeason === s ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-red-500 font-medium">Poistetaanko kausi?</span>
                          <Button variant="danger" size="sm" onClick={() => { removeSeason(s); setConfirmDeleteSeason(null); }}>Poista</Button>
                          <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteSeason(null)}>Peruuta</Button>
                        </div>
                      ) : s === activeSeason ? (
                        <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded-full flex-shrink-0">
                          Aktiivinen
                        </span>
                      ) : confirmSeasonSwitch === s ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-500 dark:text-slate-400">Vaihdetaanko?</span>
                          <Button size="sm" onClick={() => { setActiveSeason(s); setConfirmSeasonSwitch(null); }}>Kyllä</Button>
                          <Button variant="secondary" size="sm" onClick={() => setConfirmSeasonSwitch(null)}>Peruuta</Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setConfirmSeasonSwitch(s); setEditingSeason(null); }}
                          className="text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex-shrink-0"
                        >
                          Vaihda
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            {showNewSeasonInput ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newSeasonInput}
                  onChange={(e) => setNewSeasonInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSeason(); if (e.key === 'Escape') { setNewSeasonInput(''); setShowNewSeasonInput(false); } }}
                  placeholder="esim. 2027"
                  className="flex-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <Button size="sm" onClick={handleCreateSeason} disabled={!newSeasonInput.trim() || seasons.includes(newSeasonInput.trim())}>
                  Luo kausi
                </Button>
                <Button variant="secondary" size="sm" onClick={() => { setNewSeasonInput(''); setShowNewSeasonInput(false); }}>
                  Peruuta
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNewSeasonInput(true)}
                className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium transition-colors"
              >
                <Plus size={14} /> Lisää kausi
              </button>
            )}
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard className="break-inside-avoid mb-6" title="Valmentajat">
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


      <CollapsibleCard className="break-inside-avoid mb-6" title="Pelaajan tietojen näkyvyys">
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


      <CollapsibleCard className="break-inside-avoid mb-6" title="Data">
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

          {isHeadCoach && (
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Poista joukkue</p>
                <p className="text-xs text-red-400 dark:text-red-500">Poistaa joukkueen ja kaiken sen datan pysyvästi</p>
              </div>
              {clearConfirm ? (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600 font-medium">Oletko varma?</span>
                    <Button variant="danger" size="sm" onClick={deleteCurrentTeam}>Kyllä, poista</Button>
                    <Button variant="secondary" size="sm" onClick={() => { setClearConfirm(false); setDeleteError(''); }}>Peruuta</Button>
                  </div>
                  {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
                </div>
              ) : (
                <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setClearConfirm(true)}>
                  Poista
                </Button>
              )}
            </div>
          )}
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

    {/* Team add/edit modal */}
    {teamModal && (
      <Modal
        title={teamModal.mode === 'add' ? 'Lisää joukkue' : 'Muokkaa joukkuetta'}
        onClose={() => setTeamModal(null)}
      >
        <div className="space-y-4">
          <Input
            label="Nimi"
            autoFocus
            value={teamDraft.name}
            onChange={(e) => setTeamDraft({ ...teamDraft, name: e.target.value })}
            placeholder="esim. Valkoiset"
          />

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Väri</p>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setTeamDraft({ ...teamDraft, color: c })}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110 border-2"
                  style={{
                    backgroundColor: c,
                    borderColor: teamDraft.color === c ? c : 'transparent',
                    outline: teamDraft.color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Pelimuoto</p>
            <div className="flex gap-2">
              {(['5v5', '7v7', '8v8', '11v11'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTeamDraft({ ...teamDraft, format: f })}
                  className={`flex-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    teamDraft.format === f
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-brand-400'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-200 block mb-1">
              Kokoonpanon minimimäärä
            </label>
            <input
              type="number"
              min={3}
              max={15}
              value={teamDraft.minLineupSize}
              onChange={(e) => setTeamDraft({ ...teamDraft, minLineupSize: Math.max(3, Math.min(15, +e.target.value)) })}
              className="w-24 rounded-lg border border-gray-200 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-slate-100"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Varoitus jos kokoonpanossa alle tämän verran pelaajia</p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            {teamSaveConfirm && teamModal.mode === 'edit' ? (
              <>
                <span className="text-sm text-gray-500 dark:text-slate-400 self-center">Tallennetaanko muutokset?</span>
                <Button variant="secondary" onClick={() => setTeamSaveConfirm(false)}>Peruuta</Button>
                <Button onClick={saveTeamModal}>Kyllä, tallenna</Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setTeamModal(null)}>Peruuta</Button>
                <Button
                  onClick={() => teamModal.mode === 'edit' ? setTeamSaveConfirm(true) : saveTeamModal()}
                  disabled={!teamDraft.name.trim()}
                >
                  {teamModal.mode === 'add' ? 'Lisää joukkue' : 'Tallenna'}
                </Button>
              </>
            )}
          </div>
        </div>
      </Modal>
    )}
    </>
  );
}
