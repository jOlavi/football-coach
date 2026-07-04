import { useNavigate } from 'react-router-dom';
import { X, Clock, Pencil, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../ui/Button';
import type { TrainingSession, ExerciseCategory } from '../../types';

const CAT_LABELS: Record<ExerciseCategory, string> = {
  warmup: 'Lämmittely',
  technical: 'Tekninen',
  tactical: 'Taktinen',
  physical: 'Fyysinen',
  game: 'Peli',
};

const CAT_COLORS: Record<ExerciseCategory, string> = {
  warmup: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  technical: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  tactical: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  physical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  game: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

interface Props {
  session: TrainingSession;
  onClose: () => void;
}

export function TrainingSessionModal({ session, onClose }: Props) {
  const navigate = useNavigate();
  const date = new Date(session.date + 'T12:00:00');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:p-4 bg-black/40" onClick={onClose}>
      <div
        className="relative bg-white dark:bg-slate-800 w-full sm:max-w-lg sm:mx-auto rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide font-medium">
              {format(date, 'dd.MM.yyyy')}
              {session.startTime && ` · klo ${session.startTime}`}
              {` · ${session.duration} min`}
            </p>
            <h2 className="font-semibold text-gray-900 dark:text-slate-100 mt-0.5 text-lg">{session.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Exercises */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          {session.exercises.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">Ei harjoitteita.</p>
          ) : (
            <div className="space-y-2">
              {session.exercises.map((ex, i) => (
                <div
                  key={ex.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-900 rounded-xl"
                >
                  <span className="text-xs font-bold text-gray-400 dark:text-slate-500 w-5 pt-0.5 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{ex.name}</p>
                      {ex.category && !ex.isTextSection && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${CAT_COLORS[ex.category]}`}>
                          {CAT_LABELS[ex.category]}
                        </span>
                      )}
                    </div>
                    {ex.description && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">{ex.description}</p>
                    )}
                  </div>
                  {!ex.isTextSection && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 flex-shrink-0">
                      <Clock size={11} />
                      {ex.duration} min
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {session.notes && (
            <p className="text-sm text-gray-600 dark:text-slate-300 italic mt-3 px-1">{session.notes}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500">
            <Dumbbell size={13} />
            {session.exercises.length} harjoitetta
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Sulje</Button>
            <Button icon={<Pencil size={13} />} onClick={() => { onClose(); navigate(`/training/${session.id}/edit`); }}>
              Muokkaa
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
