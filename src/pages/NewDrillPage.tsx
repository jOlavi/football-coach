import { useRef, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, RotateCcw, RotateCw, Trash2,
  MousePointer, UserRound, Triangle,
  ArrowRight, ArrowRightFromLine, Spline, Square, Type,
} from 'lucide-react';
import { useTacticalBoard } from '../hooks/useTacticalBoard';
import type { ToolType, SizeKey, FieldType } from '../types';
import { useDrillStore } from '../store/useDrillStore';
import { saveDrill, updateDrill } from '../utils/drillStorage';

const TOOLS: { id: ToolType; icon: React.ReactNode; label: string }[] = [
  { id: 'select',   icon: <MousePointer size={18} />,        label: 'Valitse' },
  { id: 'player',   icon: <UserRound size={18} />,           label: 'Pelaaja' },
  { id: 'cone',     icon: <Triangle size={18} />,            label: 'Kartio' },
  { id: 'ball',     icon: (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="9" cy="9" r="7.5"/>
      <polygon points="9,6.3 11.57,8.17 10.59,11.18 7.41,11.18 6.43,8.17" fill="currentColor" stroke="none"/>
      <circle cx="9" cy="3.6" r="1.9" fill="currentColor" stroke="none"/>
      <circle cx="14.14" cy="7.33" r="1.9" fill="currentColor" stroke="none"/>
      <circle cx="12.17" cy="13.37" r="1.9" fill="currentColor" stroke="none"/>
      <circle cx="5.83" cy="13.37" r="1.9" fill="currentColor" stroke="none"/>
      <circle cx="3.86" cy="7.33" r="1.9" fill="currentColor" stroke="none"/>
    </svg>
  ), label: 'Pallo' },
  { id: 'goal',     icon: (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16 L2 5 L16 5 L16 16"/>
      <line x1="2" y1="5" x2="16" y2="5"/>
      <line x1="6.67" y1="5" x2="6.67" y2="16" strokeWidth="0.8" strokeOpacity="0.5"/>
      <line x1="11.33" y1="5" x2="11.33" y2="16" strokeWidth="0.8" strokeOpacity="0.5"/>
      <line x1="2" y1="9.67" x2="16" y2="9.67" strokeWidth="0.8" strokeOpacity="0.5"/>
      <line x1="2" y1="13.33" x2="16" y2="13.33" strokeWidth="0.8" strokeOpacity="0.5"/>
    </svg>
  ), label: 'Maali' },
  { id: 'arrow',    icon: <ArrowRight size={18} />,          label: 'Nuoli' },
  { id: 'dashed',   icon: <ArrowRightFromLine size={18} />,  label: 'Syöttö (katkoviiva)' },
  { id: 'curved',   icon: <Spline size={18} />,              label: 'Juoksurata (käyrä)' },
  { id: 'zone',     icon: <Square size={18} />,              label: 'Alue' },
  { id: 'text',     icon: <Type size={18} />,                label: 'Teksti' },
];

const COLORS = [
  '#22c55e', '#ef4444', '#3b82f6', '#eab308',
  '#f97316', '#a855f7', '#ffffff', '#1f2937',
];

const FIELD_LABELS: Record<FieldType, string> = {
  football:   'Jalkapallokenttä',
  floorball:  'Salibandykaukalo',
  basketball: 'Koripallokenttä',
  icehockey:  'Jääkiekkokaukalo',
  half:       'Puolikenttä',
  '5v5':      'Pienkenttä 5v5',
  penalty:    'Rangaistusalue',
  blank:      'Tyhjä kenttä',
};

const VISIBLE_FIELDS: FieldType[] = ['football', 'half', '5v5', 'penalty', 'blank'];

export function NewDrillPage() {
  const navigate = useNavigate();
  const { id: drillId } = useParams<{ id?: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const board = useTacticalBoard(canvasRef);

  const drill = useDrillStore((s) =>
    drillId ? s.drills.find((d) => d.id === drillId) : undefined
  );
  const isEditing = Boolean(drillId);

  const [name, setName] = useState(drill?.name ?? '');
  const [description, setDescription] = useState(drill?.description ?? '');
  const [goals, setGoals] = useState(drill?.goals ?? '');
  const [duration, setDuration] = useState(drill?.duration ?? 15);
  const [repetitions, setRepetitions] = useState(drill?.repetitions ?? 1);
  const [saving, setSaving] = useState(false);
  const [textInput, setTextInput] = useState('');

  // Redirect if drill ID given but not found in store
  useEffect(() => {
    if (drillId && !drill) navigate('/training?view=library', { replace: true });
  }, [drillId, drill, navigate]);

  // Load existing shapes once on mount when editing
  const loadedRef = useRef(false);
  useEffect(() => {
    if (drillId && drill && !loadedRef.current) {
      loadedRef.current = true;
      board.loadShapes(drill.shapes ?? [], drill.fieldType);
    }
  // board.loadShapes is stable (useCallback with no deps)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!board.pendingTextPos) setTextInput('');
  }, [board.pendingTextPos]);

  async function handleSave() {
    if (!name.trim()) return;
    const canvasDataUrl = board.exportDataUrl();
    if (!canvasDataUrl) return;
    setSaving(true);
    try {
      if (drillId) {
        await updateDrill(drillId, {
          name: name.trim(),
          description,
          goals,
          duration,
          repetitions,
          fieldType: board.fieldType,
          canvasDataUrl,
          shapes: board.shapes,
        });
      } else {
        await saveDrill({
          name: name.trim(),
          description,
          goals,
          duration,
          repetitions,
          fieldType: board.fieldType,
          canvasDataUrl,
          shapes: board.shapes,
        });
      }
      navigate('/training?view=library');
    } finally {
      setSaving(false);
    }
  }

  const saveLabel = saving
    ? 'Tallennetaan…'
    : isEditing ? 'Tallenna muutokset' : 'Tallenna harjoite';

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/training?view=library')}
          className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft size={16} /> Takaisin
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={14} /> {saveLabel}
        </button>
      </div>

      {/* Main three-column layout */}
      <div className="flex gap-4 items-start">

        {/* Left toolbar */}
        <div className="w-14 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col items-center py-3 gap-1 shrink-0">
          {TOOLS.map((t) => (
            <div key={t.id} className="relative group">
              <button
                onClick={() => board.setTool(t.id)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  board.activeTool === t.id
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                {t.icon}
              </button>
              <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-700 z-50">
                {t.label}
              </span>
            </div>
          ))}

          <div className="w-8 border-t border-gray-200 dark:border-slate-700 my-1" />

          {/* Color swatches — 2 columns */}
          <div className="grid grid-cols-2 gap-1 px-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => board.setColor(c)}
                title={c}
                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                  board.activeColor === c
                    ? 'border-brand-500 scale-110'
                    : 'border-gray-300 dark:border-slate-600'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>

          <div className="w-8 border-t border-gray-200 dark:border-slate-700 my-1" />

          {/* Size buttons */}
          {(['small', 'normal', 'large'] as SizeKey[]).map((s) => (
            <button
              key={s}
              onClick={() => board.setSize(s)}
              title={s === 'small' ? 'Pieni' : s === 'normal' ? 'Normaali' : 'Suuri'}
              className={`w-10 h-7 rounded text-xs font-bold transition-colors ${
                board.activeSize === s
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {s === 'small' ? 'S' : s === 'normal' ? 'M' : 'L'}
            </button>
          ))}

          <div className="w-8 border-t border-gray-200 dark:border-slate-700 my-1" />

          <button
            onClick={board.undo}
            title="Kumoa"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={board.clearCanvas}
            title="Tyhjennä kenttä"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Canvas area */}
        <div className="flex-1 flex flex-col items-center gap-3 min-w-0">
          {/* Field type selector */}
          <div className="flex flex-wrap gap-1.5 justify-center w-full">
            {VISIBLE_FIELDS.map((f) => (
              <button
                key={f}
                onClick={() => board.setFieldType(f)}
                className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                  board.fieldType === f
                    ? 'bg-gray-800 dark:bg-slate-600 text-white border-gray-800 dark:border-slate-600'
                    : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
                }`}
              >
                {FIELD_LABELS[f]}
              </button>
            ))}
          </div>

          <div className="relative w-full">
            {/* Floating selection toolbar */}
            {board.selectedShape && (() => {
              const sel = board.selectedShape;
              const hasSize = 'size' in sel;
              const hasColor = 'color' in sel;
              return (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  {hasSize && (
                    <>
                      {(['small', 'normal', 'large'] as SizeKey[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => board.updateSelectedSize(s)}
                          className={`h-7 w-7 rounded text-xs font-bold transition-colors ${
                            (sel as { size: SizeKey }).size === s
                              ? 'bg-brand-600 text-white'
                              : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700'
                          }`}
                        >
                          {s === 'small' ? 'S' : s === 'normal' ? 'M' : 'L'}
                        </button>
                      ))}
                      {hasColor && <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-slate-700" />}
                    </>
                  )}
                  {hasColor && (
                    <>
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => board.updateSelectedColor(c)}
                          className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
                            (sel as { color: string }).color === c
                              ? 'scale-110 border-brand-500'
                              : 'border-gray-300 dark:border-slate-600'
                          }`}
                          style={{ background: c }}
                        />
                      ))}
                    </>
                  )}
                  {sel.type === 'goal' && (
                    <>
                      <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-slate-700" />
                      <button
                        onClick={() => board.updateSelectedRotation(-45)}
                        title="Kierrä vasemmalle"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        onClick={() => board.updateSelectedRotation(45)}
                        title="Kierrä oikealle"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
                      >
                        <RotateCw size={14} />
                      </button>
                    </>
                  )}
                  <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-slate-700" />
                  <button
                    onClick={board.deleteSelected}
                    title="Poista"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })()}
            <canvas
              ref={canvasRef}
              width={800}
              height={560}
              onPointerDown={board.handlePointerDown}
              onPointerMove={board.handlePointerMove}
              onPointerUp={board.handlePointerUp}
              className="w-full rounded-xl shadow-lg cursor-crosshair touch-none"
              style={{ aspectRatio: '800/560' }}
            />
            {board.pendingTextPos && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
                <form
                  onSubmit={(e) => { e.preventDefault(); board.commitText(textInput); }}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-4 flex flex-col gap-3 w-64"
                >
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-200">Teksti kentälle</label>
                  <input
                    autoFocus
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Kirjoita teksti..."
                    className="border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={board.cancelText}
                      className="px-3 py-1.5 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Peruuta
                    </button>
                    <button
                      type="submit"
                      disabled={!textInput.trim()}
                      className="px-3 py-1.5 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      Lisää
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — metadata form */}
        <div className="w-72 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col gap-4 shrink-0">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
              Nimi <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="esim. 2v1 hyökkäys"
              className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Kuvaus</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Lyhyt kuvaus harjoitteesta..."
              className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Valmennuspisteet</label>
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              rows={3}
              placeholder="Mitä harjoitteella tavoitellaan..."
              className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Kesto (min)</label>
              <input
                type="number"
                min={1}
                max={120}
                value={duration}
                onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
                className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Toistot</label>
              <input
                type="number"
                min={1}
                max={20}
                value={repetitions}
                onChange={(e) => setRepetitions(Math.max(1, Number(e.target.value)))}
                className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="mt-auto pt-3 border-t border-gray-100 dark:border-slate-700">
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={15} /> {saveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
