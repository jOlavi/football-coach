import { useState } from 'react';
import { X, Dumbbell, Calendar, Trophy } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useTrainingStore } from '../../store/useTrainingStore';

interface Props {
  date: Date;
  onClose: () => void;
  onAddMatch: (date: Date) => void;
  onAddTournament: (date: Date) => void;
}

const WEEKDAYS: { label: string; day: number }[] = [
  { label: 'Ma', day: 1 },
  { label: 'Ti', day: 2 },
  { label: 'Ke', day: 3 },
  { label: 'To', day: 4 },
  { label: 'Pe', day: 5 },
  { label: 'La', day: 6 },
  { label: 'Su', day: 0 },
];

export function CalendarAddModal({ date, onClose, onAddMatch, onAddTournament }: Props) {
  const { addSession } = useTrainingStore();

  const [showTraining, setShowTraining] = useState(false);
  const [title, setTitle] = useState('');
  const [trainingTime, setTrainingTime] = useState('');
  const [duration, setDuration] = useState(90);
  const [error, setError] = useState('');

  const [recurrence, setRecurrence] = useState<'once' | 'repeat'>('once');
  const [repeatDays, setRepeatDays] = useState<number[]>([date.getDay()]);
  const [repeatUntil, setRepeatUntil] = useState('');

  const dateStr = format(date, 'yyyy-MM-dd');

  function toggleRepeatDay(day: number) {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function getSessionDates(): Date[] {
    if (recurrence === 'once') return [date];
    if (!repeatUntil || repeatDays.length === 0) return [];
    const until = new Date(repeatUntil + 'T23:59:59');
    const dates: Date[] = [];
    let current = new Date(date);
    while (current <= until) {
      if (repeatDays.includes(current.getDay())) {
        dates.push(new Date(current));
      }
      current = addDays(current, 1);
    }
    return dates;
  }

  const sessionDates = recurrence === 'repeat' && repeatUntil && repeatDays.length > 0
    ? getSessionDates()
    : [];

  function handleSaveTraining() {
    if (!title.trim()) { setError('Otsikko vaaditaan'); return; }
    if (recurrence === 'repeat' && !repeatUntil) { setError('Valitse toistumisen lopetuspäivä'); return; }
    if (recurrence === 'repeat' && repeatDays.length === 0) { setError('Valitse vähintään yksi viikonpäivä'); return; }

    const dates = recurrence === 'once' ? [date] : getSessionDates();
    dates.forEach((d) => {
      addSession({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        date: format(d, 'yyyy-MM-dd'),
        startTime: trainingTime || undefined,
        title: title.trim(),
        duration,
        exercises: [],
        notes: '',
      });
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:p-4 bg-black/40" onClick={onClose}>
      <div
        className="relative bg-white dark:bg-slate-800 w-full sm:max-w-md sm:mx-auto rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide font-medium">
              {format(date, 'dd.MM.yyyy')}
            </p>
            <h2 className="font-semibold text-gray-900 dark:text-slate-100 mt-0.5">
              {showTraining ? 'Uusi harjoitus' : 'Lisää tapahtuma'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-6">
          {/* Type selection */}
          {!showTraining && (
            <div className="grid grid-cols-3 gap-3 mt-2">
              <button
                onClick={() => { onAddMatch(date); onClose(); }}
                className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 text-brand-600 bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800"
              >
                <Calendar size={22} />
                <span className="text-sm font-semibold">Ottelu</span>
              </button>
              <button
                onClick={() => setShowTraining(true)}
                className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
              >
                <Dumbbell size={22} />
                <span className="text-sm font-semibold">Harjoitus</span>
              </button>
              <button
                onClick={() => { onAddTournament(date); onClose(); }}
                className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 text-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
              >
                <Trophy size={22} />
                <span className="text-sm font-semibold">Turnaus</span>
              </button>
            </div>
          )}

          {/* Training form */}
          {showTraining && (
            <div className="space-y-3 mt-2">

              {/* Title */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400 block mb-1">Otsikko *</label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setError(''); }}
                  placeholder="esim. Tekninen harjoitus"
                  className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Time + duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400 block mb-1">Kellonaika</label>
                  <input
                    type="time"
                    value={trainingTime}
                    onChange={(e) => setTrainingTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400 block mb-1">Kesto (min)</label>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    step={15}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Recurrence toggle */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400 block mb-1">Toistuvuus</label>
                <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
                  <button
                    onClick={() => setRecurrence('once')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      recurrence === 'once'
                        ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 shadow-sm'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                    }`}
                  >
                    Yksittäinen
                  </button>
                  <button
                    onClick={() => setRecurrence('repeat')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      recurrence === 'repeat'
                        ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 shadow-sm'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                    }`}
                  >
                    Toistuva
                  </button>
                </div>
              </div>

              {/* Recurrence options */}
              {recurrence === 'repeat' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-slate-400 block mb-1">Viikonpäivät</label>
                    <div className="flex gap-1">
                      {WEEKDAYS.map(({ label, day }) => (
                        <button
                          key={day}
                          onClick={() => toggleRepeatDay(day)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            repeatDays.includes(day)
                              ? 'bg-brand-600 text-white'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-slate-400 block mb-1">Toista saakka *</label>
                    <input
                      type="date"
                      value={repeatUntil}
                      min={dateStr}
                      onChange={(e) => { setRepeatUntil(e.target.value); setError(''); }}
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  {sessionDates.length > 0 && (
                    <p className="text-xs font-medium text-brand-600 dark:text-brand-400">
                      Luodaan {sessionDates.length} treeniä
                    </p>
                  )}
                </>
              )}

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowTraining(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Takaisin
                </button>
                <button
                  onClick={handleSaveTraining}
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
                >
                  {recurrence === 'repeat' && sessionDates.length > 1
                    ? `Luo ${sessionDates.length} treeniä`
                    : 'Tallenna'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
