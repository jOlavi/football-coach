import { useState, useMemo } from 'react';
import { X, Plus } from 'lucide-react';
import type { Exercise, ExerciseCategory } from '../../types';
import { Badge } from '../ui/Badge';

const CAT_LABELS: Record<ExerciseCategory, string> = {
  warmup: 'Lämmittely', technical: 'Tekninen', tactical: 'Taktinen', physical: 'Fyysinen', game: 'Peli',
};
const CAT_COLORS: Record<ExerciseCategory, 'yellow' | 'blue' | 'purple' | 'red' | 'green'> = {
  warmup: 'yellow', technical: 'blue', tactical: 'purple', physical: 'red', game: 'green',
};
const CAT_EMOJIS: Record<ExerciseCategory, string> = {
  warmup: '🏃', technical: '🎯', tactical: '⚽', physical: '💪', game: '🏟️',
};
const FILTER_OPTIONS: Array<{ value: ExerciseCategory | 'all'; label: string }> = [
  { value: 'all', label: 'Kaikki' },
  { value: 'warmup', label: 'Lämmittely' },
  { value: 'technical', label: 'Tekninen' },
  { value: 'tactical', label: 'Taktinen' },
  { value: 'physical', label: 'Fyysinen' },
  { value: 'game', label: 'Peli' },
];

interface Props {
  items: Exercise[];
  onAdd: (exercise: Exercise) => void;
  onClose: () => void;
}

export function LibraryModal({ items, onAdd, onClose }: Props) {
  const [filter, setFilter] = useState<ExerciseCategory | 'all'>('all');
  const [detail, setDetail] = useState<Exercise | null>(null);

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((e) => e.category === filter)),
    [items, filter]
  );

  return (
    // Mobile: bottom sheet (items-end, no padding-x). Desktop: centered dialog (items-center, padding).
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-slate-800 w-full sm:max-w-3xl sm:mx-auto h-[85vh] sm:h-[80vh] flex flex-col shadow-2xl overflow-hidden rounded-t-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 sm:pt-4 pb-3 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <span className="text-base font-bold text-gray-900 dark:text-slate-100">Harjoitekirjasto</span>
          <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 flex-wrap px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 shrink-0">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                filter === f.value
                  ? 'bg-gray-900 dark:bg-slate-600 text-white border-gray-900 dark:border-slate-600'
                  : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:border-gray-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-y-auto flex-1 px-4 py-3 bg-gray-50 dark:bg-slate-900">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map((e) => (
              <div
                key={e.id}
                onClick={() => setDetail(e)}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col gap-2 hover:border-brand-300 hover:shadow-sm transition-all cursor-pointer"
              >
                {e.canvasDataUrl && (
                  <div className="w-full aspect-video rounded-lg overflow-hidden bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700">
                    <img src={e.canvasDataUrl} alt={e.name} className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{e.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge label={CAT_LABELS[e.category]} color={CAT_COLORS[e.category]} />
                    </div>
                  </div>
                </div>
                {e.description && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2">{e.description}</p>
                )}
                {e.goals && (
                  <p className="text-xs text-brand-700 bg-brand-50 dark:bg-slate-700 dark:text-brand-300 rounded px-2 py-1.5">🎯 {e.goals}</p>
                )}
                <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-50 dark:border-slate-700">
                  <span className="text-xs text-gray-400 dark:text-slate-500">⏱ {e.duration} min{e.playerCount ? ` · 👥 ${e.playerCount} pelaajaa` : ''}</span>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); onAdd(e); onClose(); }}
                    className="flex items-center justify-center w-7 h-7 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors"
                    title="Lisää suunnitelmaan"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-8 text-center text-sm text-gray-400 dark:text-slate-500">
                Ei harjoitteita tässä kategoriassa
              </div>
            )}
          </div>
        </div>

        {/* Detail popup — fixed overlay so it's not clipped by parent overflow-hidden */}
        {detail && (
          <div
            className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 sm:p-6"
            onClick={() => setDetail(null)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-y-auto max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image */}
              <div className="p-3">
                <div className="bg-gray-50 dark:bg-slate-900 w-full flex items-center justify-center rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  {detail.canvasDataUrl ? (
                    <img
                      src={detail.canvasDataUrl}
                      alt={detail.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-6xl">{CAT_EMOJIS[detail.category]}</span>
                  )}
                </div>
              </div>
              {/* Detail body */}
              <div className="p-4 flex flex-col gap-2">
                <div>
                  <div className="text-base font-bold text-gray-900 dark:text-slate-100 mb-1">{detail.name}</div>
                  <div className="flex items-center gap-2">
                    <Badge label={CAT_LABELS[detail.category]} color={CAT_COLORS[detail.category]} />
                    <span className="text-xs text-gray-400 dark:text-slate-500">{detail.duration} min</span>
                  </div>
                </div>
                {detail.description && (
                  <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">{detail.description}</p>
                )}
                {detail.goals && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 italic">{detail.goals}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { onAdd(detail); onClose(); }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
                  >
                    + Lisää suunnitelmaan
                  </button>
                  <button
                    onClick={() => setDetail(null)}
                    className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-200 dark:hover:bg-slate-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
