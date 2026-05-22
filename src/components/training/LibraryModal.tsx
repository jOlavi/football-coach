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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((e) => e.category === filter)),
    [items, filter]
  );

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-t-2xl w-full max-h-[85vh] flex flex-col shadow-2xl"
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
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((e) => {
              const isExpanded = expandedId === e.id;
              return (
                <div
                  key={e.id}
                  onClick={() => toggle(e.id)}
                  className={`border rounded-xl overflow-hidden cursor-pointer transition-all ${
                    isExpanded
                      ? 'col-span-2 border-green-500 flex flex-row items-stretch'
                      : 'border-gray-200 dark:border-slate-600 flex flex-col hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  {/* Thumbnail */}
                  <div
                    className={`bg-gray-50 dark:bg-slate-900 flex items-center justify-center shrink-0 ${
                      isExpanded ? 'w-36 border-r border-gray-100 dark:border-slate-700' : 'w-full h-20 border-b border-gray-100 dark:border-slate-700'
                    }`}
                  >
                    {e.canvasDataUrl ? (
                      <img
                        src={e.canvasDataUrl}
                        alt={e.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className={isExpanded ? 'text-4xl' : 'text-3xl'}>{CAT_EMOJIS[e.category]}</span>
                    )}
                  </div>

                  {/* Collapsed info */}
                  {!isExpanded && (
                    <div className="p-2">
                      <div className="text-xs font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{e.name}</div>
                      <div className="flex items-center gap-1.5">
                        <Badge label={CAT_LABELS[e.category]} color={CAT_COLORS[e.category]} />
                        <span className="text-xs text-gray-400 dark:text-slate-500">{e.duration} min</span>
                      </div>
                    </div>
                  )}

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="flex-1 p-3 flex flex-col min-w-0" onClick={(ev) => ev.stopPropagation()}>
                      <div className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-1">{e.name}</div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Badge label={CAT_LABELS[e.category]} color={CAT_COLORS[e.category]} />
                        <span className="text-xs text-gray-400 dark:text-slate-500">{e.duration} min</span>
                      </div>
                      {e.description && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed flex-1 mb-2">{e.description}</p>
                      )}
                      {e.goals && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 italic mb-2">{e.goals}</p>
                      )}
                      <div className="flex gap-2 mt-auto">
                        <button
                          onClick={(ev) => { ev.stopPropagation(); onAdd(e); onClose(); }}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg py-2 transition-colors"
                        >
                          + Lisää suunnitelmaan
                        </button>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setExpandedId(null); }}
                          className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 text-xs font-semibold rounded-lg px-3 py-2 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-2 py-8 text-center text-sm text-gray-400 dark:text-slate-500">
                Ei harjoitteita tässä kategoriassa
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
