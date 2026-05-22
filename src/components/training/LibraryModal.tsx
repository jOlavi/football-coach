import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="relative bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 dark:border-slate-700 shrink-0">
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
        <div className="overflow-y-auto flex-1 px-4 py-3">
          <div className="grid grid-cols-4 gap-2">
            {filtered.map((e) => (
              <div
                key={e.id}
                onClick={() => setDetail(e)}
                className="border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden cursor-pointer flex flex-col hover:border-gray-400 dark:hover:border-slate-400 transition-colors"
              >
                {/* Thumbnail */}
                <div
                  className="bg-gray-50 dark:bg-slate-900 w-full flex items-center justify-center border-b border-gray-100 dark:border-slate-700"
                  style={{ aspectRatio: '3/4' }}
                >
                  {e.canvasDataUrl ? (
                    <img
                      src={e.canvasDataUrl}
                      alt={e.name}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-3xl">{CAT_EMOJIS[e.category]}</span>
                  )}
                </div>
                {/* Info */}
                <div className="p-1.5">
                  <div className="text-xs font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2 leading-tight">{e.name}</div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge label={CAT_LABELS[e.category]} color={CAT_COLORS[e.category]} />
                    <span className="text-xs text-gray-400 dark:text-slate-500">{e.duration} min</span>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-4 py-8 text-center text-sm text-gray-400 dark:text-slate-500">
                Ei harjoitteita tässä kategoriassa
              </div>
            )}
          </div>
        </div>

        {/* Detail popup — overlays the modal content */}
        {detail && (
          <div
            className="absolute inset-0 bg-black/40 flex items-center justify-center p-6 rounded-2xl"
            onClick={() => setDetail(null)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image */}
              <div className="bg-gray-50 dark:bg-slate-900 w-full flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
                {detail.canvasDataUrl ? (
                  <img
                    src={detail.canvasDataUrl}
                    alt={detail.name}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <span className="text-6xl">{CAT_EMOJIS[detail.category]}</span>
                )}
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
