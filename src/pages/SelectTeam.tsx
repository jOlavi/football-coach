import { useNavigate } from 'react-router-dom';
import { Plus, Users, Shield } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';

const SPORT_LABELS: Record<string, string> = {
  football: 'Jalkapallo',
  floorball: 'Salibandy',
  other: 'Muu',
};

export function SelectTeam() {
  const teams = useAuthStore((s) => s.teams);
  const authLoading = useAuthStore((s) => s.authLoading);
  const { setActiveTeamId } = useAppStore();
  const navigate = useNavigate();

  function handleSelect(teamId: string) {
    setActiveTeamId(teamId);
    navigate('/');
  }

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Valitse joukkue</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {teams.length > 0 ? `${teams.length} joukkue${teams.length !== 1 ? 'tta' : ''}` : 'Ei joukkueita'}
            </p>
          </div>
        </div>

        {teams.length > 0 ? (
          <div className="space-y-2 mb-4">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleSelect(team.id)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-slate-600 hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950 dark:hover:border-brand-500 transition-colors text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 dark:group-hover:bg-brand-900 transition-colors">
                  <Users size={16} className="text-gray-500 dark:text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">{team.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {SPORT_LABELS[team.sport] ?? team.sport} · {team.season}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 mb-4">
            <Users size={32} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-slate-400">Sinulla ei ole vielä joukkueita.</p>
          </div>
        )}

        <button
          onClick={() => navigate('/teams/new')}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-600 text-sm font-medium text-gray-500 dark:text-slate-400 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 dark:hover:text-brand-400 transition-colors"
        >
          <Plus size={16} />
          Luo uusi joukkue
        </button>
      </div>
    </div>
  );
}
