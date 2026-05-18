import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { createTeam } from '../lib/firestore/teams';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { hasLocalStorageData } from '../lib/migration';

const SPORTS = [
  { value: 'football', label: 'Jalkapallo' },
  { value: 'floorball', label: 'Salibandy' },
  { value: 'other', label: 'Muu' },
];

export function CreateTeam() {
  const [name, setName] = useState('');
  const [sport, setSport] = useState('football');
  const [season, setSeason] = useState('2026');
  const [importData, setImportData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const teams = useAuthStore((s) => s.teams);
  const addTeam = useAuthStore((s) => s.addTeam);
  const { setActiveTeamId, setPendingImport } = useAppStore();

  const isFirstTeam = teams.length === 0;
  const hasExistingData = isFirstTeam && hasLocalStorageData();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) { setError('Anna joukkueen nimi'); return; }
    setLoading(true);
    setError(null);
    try {
      const id = uuidv4();
      const team = await createTeam({
        name: name.trim(),
        sport,
        season,
        headCoachId: user.uid,
        coaches: [user.uid],
      }, id);
      addTeam(team);
      setActiveTeamId(team.id);
      if (importData) setPendingImport(hasExistingData ? 'migrate' : 'seed');
      navigate('/');
    } catch {
      setError('Joukkueen luonti epäonnistui. Yritä uudelleen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-10 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">Luo joukkue</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Joukkueen nimi
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="esim. JJK U12"
              className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Laji
            </label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {SPORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Kausi
            </label>
            <input
              type="text"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              placeholder="2026"
              className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {isFirstTeam && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={importData}
                onChange={(e) => setImportData(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700 dark:text-slate-300">
                {hasExistingData
                  ? 'Tuo olemassa olevat pelaajat ja ottelut tähän joukkueeseen'
                  : 'Aloita esimerkkidatalla (demo-pelaajat ja ottelut)'}
              </span>
            </label>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Luodaan...' : 'Luo joukkue'}
          </button>
        </form>
      </div>
    </div>
  );
}
