import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { getInvitationTeam, acceptInvitation } from '../lib/firestore/invitations';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import type { FirebaseTeam } from '../types';

const ERROR_MESSAGES = {
  not_found: 'Kutsu ei ole voimassa tai se on poistettu.',
  expired: 'Kutsu on vanhentunut. Pyydä valmentajaa lähettämään uusi kutsu.',
  used: 'Kutsu on jo käytetty.',
};

export function JoinTeam() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [team, setTeam] = useState<FirebaseTeam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.authLoading);
  const addTeam = useAuthStore((s) => s.addTeam);
  const setActiveTeamId = useAppStore((s) => s.setActiveTeamId);

  useEffect(() => {
    if (!token) { setError('Kutsukoodi puuttuu.'); setLoadingTeam(false); return; }
    getInvitationTeam(token).then((result) => {
      if (result.error) {
        setError(ERROR_MESSAGES[result.error]);
      } else {
        setTeam(result.team);
      }
      setLoadingTeam(false);
    });
  }, [token]);

  if (!authLoading && !user) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(`/join?token=${token}`)}`} replace />;
  }

  async function handleJoin() {
    if (!user || !team) return;
    setJoining(true);
    try {
      await acceptInvitation(token, user.uid);
      addTeam(team);
      setActiveTeamId(team.id);
      navigate('/');
    } catch {
      setError('Liittyminen epäonnistui. Yritä uudelleen.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <span className="text-5xl">⚽</span>
        {loadingTeam ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        ) : error ? (
          <div className="text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : team ? (
          <div className="text-center w-full">
            <p className="text-sm text-gray-500 dark:text-slate-400">Sinut on kutsuttu joukkueeseen</p>
            <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">{team.name}</p>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="mt-6 w-full py-2.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {joining ? 'Liitytään...' : 'Liity joukkueeseen valmentajaksi'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
