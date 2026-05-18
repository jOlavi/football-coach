import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../lib/auth';
import { useAuthStore } from '../store/useAuthStore';

export function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      setUser(user);
      navigate('/');
    } catch {
      setError('Kirjautuminen epäonnistui. Yritä uudelleen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <span className="text-5xl">⚽</span>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Jalkapallovalmennin</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Kirjaudu sisään jatkaaksesi</p>
        </div>
        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex items-center gap-3 w-full justify-center px-5 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          {loading ? 'Kirjaudutaan...' : 'Kirjaudu sisään Google-tilillä'}
        </button>
      </div>
    </div>
  );
}
