import { useState } from 'react';

import { format, addDays } from 'date-fns';
import { useTrainingStore } from '../../store/useTrainingStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

const WEEKDAYS = [
  { label: 'Ma', day: 1 },
  { label: 'Ti', day: 2 },
  { label: 'Ke', day: 3 },
  { label: 'To', day: 4 },
  { label: 'Pe', day: 5 },
  { label: 'La', day: 6 },
  { label: 'Su', day: 0 },
];

interface Props {
  initialDate?: Date;
  onClose: () => void;
}

export function TrainingAddModal({ initialDate, onClose }: Props) {
  const { addSession } = useTrainingStore();
  const startDate = initialDate ?? new Date();

  const [title, setTitle] = useState('');
  const [startDateStr, setStartDateStr] = useState(format(startDate, 'yyyy-MM-dd'));
  const [trainingTime, setTrainingTime] = useState('');
  const [duration, setDuration] = useState(90);
  const [error, setError] = useState('');

  const [recurrence, setRecurrence] = useState<'once' | 'repeat'>('once');
  const [repeatDays, setRepeatDays] = useState<number[]>([startDate.getDay()]);
  const [repeatUntil, setRepeatUntil] = useState('');

  function toggleRepeatDay(day: number) {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function getSessionDates(): Date[] {
    const base = new Date(startDateStr + 'T12:00:00');
    if (recurrence === 'once') return [base];
    if (!repeatUntil || repeatDays.length === 0) return [];
    const until = new Date(repeatUntil + 'T23:59:59');
    const dates: Date[] = [];
    let current = new Date(base);
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

  function handleSave() {
    if (!title.trim()) { setError('Otsikko vaaditaan'); return; }
    if (recurrence === 'repeat' && !repeatUntil) { setError('Valitse toistumisen lopetuspäivä'); return; }
    if (recurrence === 'repeat' && repeatDays.length === 0) { setError('Valitse vähintään yksi viikonpäivä'); return; }

    const dates = recurrence === 'once' ? [new Date(startDateStr + 'T12:00:00')] : getSessionDates();
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

  const field = 'w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <Modal title="Lisää harjoitus" onClose={onClose}>
      <div className="space-y-3">

        {/* Title */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400 block mb-1">Otsikko *</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(''); }}
            placeholder="esim. Tekninen harjoitus"
            className={field}
          />
        </div>

        {/* Date + time + duration */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 block mb-1">Päivämäärä</label>
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => {
                setStartDateStr(e.target.value);
                if (recurrence === 'repeat') {
                  const d = new Date(e.target.value + 'T12:00:00');
                  setRepeatDays([d.getDay()]);
                }
              }}
              className={field}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 block mb-1">Kellonaika</label>
            <input type="time" value={trainingTime} onChange={(e) => setTrainingTime(e.target.value)} className={field} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 block mb-1">Kesto (min)</label>
            <input
              type="number" min={15} max={240} step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={field}
            />
          </div>
        </div>

        {/* Recurrence toggle */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400 block mb-1">Toistuvuus</label>
          <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
            {(['once', 'repeat'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setRecurrence(v)}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  recurrence === v
                    ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                }`}
              >
                {v === 'once' ? 'Yksittäinen' : 'Toistuva'}
              </button>
            ))}
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
                min={startDateStr}
                onChange={(e) => { setRepeatUntil(e.target.value); setError(''); }}
                className={field}
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

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Peruuta</Button>
          <Button onClick={handleSave}>
            {recurrence === 'repeat' && sessionDates.length > 1
              ? `Luo ${sessionDates.length} treeniä`
              : 'Tallenna'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
