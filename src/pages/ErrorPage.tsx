import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

export function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  const is404 = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-500 dark:text-red-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {is404 ? 'Sivua ei löydy' : 'Jotain meni pieleen'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {is404
              ? 'Etsimääsi sivua ei ole olemassa tai se on siirretty.'
              : 'Sovelluksessa tapahtui odottamaton virhe. Yritä ladata sivu uudelleen.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
          >
            <Home size={15} /> Etusivulle
          </button>
          {!is404 && (
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <RotateCcw size={15} /> Lataa uudelleen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
