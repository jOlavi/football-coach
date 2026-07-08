import { useRef, useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
import {
  ArrowLeft, Save, RotateCcw, RotateCw, Trash2,
  MousePointer, UserRound, Triangle,
  ArrowRight, ArrowRightFromLine, Spline, Square, Type,
} from 'lucide-react';
import { useTacticalBoard } from '../hooks/useTacticalBoard';
import type { ToolType, SizeKey, FieldType, ExerciseCategory } from '../types';
import { useDrillStore } from '../store/useDrillStore';
import { saveDrill, updateDrill } from '../utils/drillStorage';

const TOOLS: { id: ToolType; icon: React.ReactNode; label: string }[] = [
  { id: 'select',   icon: <MousePointer size={17} />,        label: 'Valitse' },
  { id: 'player',   icon: <UserRound size={17} />,           label: 'Pelaaja' },
  { id: 'cone',     icon: <Triangle size={17} />,            label: 'Kartio' },
  { id: 'ball',     icon: (
    <svg width={17} height={17} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2">
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
    <svg width={17} height={17} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16 L2 5 L16 5 L16 16"/>
      <line x1="2" y1="5" x2="16" y2="5"/>
      <line x1="6.67" y1="5" x2="6.67" y2="16" strokeWidth="0.8" strokeOpacity="0.5"/>
      <line x1="11.33" y1="5" x2="11.33" y2="16" strokeWidth="0.8" strokeOpacity="0.5"/>
      <line x1="2" y1="9.67" x2="16" y2="9.67" strokeWidth="0.8" strokeOpacity="0.5"/>
      <line x1="2" y1="13.33" x2="16" y2="13.33" strokeWidth="0.8" strokeOpacity="0.5"/>
    </svg>
  ), label: 'Maali' },
  { id: 'arrow',    icon: <ArrowRight size={17} />,          label: 'Nuoli' },
  { id: 'dashed',   icon: <ArrowRightFromLine size={17} />,  label: 'Syöttö (katkoviiva)' },
  { id: 'curved',   icon: <Spline size={17} />,              label: 'Juoksurata (käyrä)' },
  { id: 'zone',     icon: <Square size={17} />,              label: 'Alue' },
  { id: 'text',     icon: <Type size={17} />,                label: 'Teksti' },
];

const COLORS = [
  '#22c55e', '#ef4444', '#3b82f6', '#eab308',
  '#f97316', '#a855f7', '#ffffff', '#1f2937',
];

const FIELD_LABELS: Record<FieldType, string> = {
  football:   'Koko kenttä',
  floorball:  'Salibandy',
  basketball: 'Koripallo',
  icehockey:  'Jääkiekko',
  half:       'Puolikenttä',
  '5v5':      'Pienkenttä',
  penalty:    'Rangaistus',
  blank:      'Tyhjä',
};

const VISIBLE_FIELDS: FieldType[] = ['football', 'half', '5v5', 'penalty', 'blank'];

const PRESET_TAGS = [
  'Lämmittely', '1v1', '2v1', '2v2', '3v2',
  'Syöttäminen', 'Laukaus', 'Puolustaminen',
  'Hyökkääminen', 'Maalivahti', 'Nopeus', 'Kondis', 'Yhteistyö', 'Koordinaatio',
];

const CATEGORY_LABELS: [ExerciseCategory, string][] = [
  ['warmup',    'Lämmittely'],
  ['technical', 'Tekninen'],
  ['tactical',  'Taktinen'],
  ['physical',  'Fyysinen'],
  ['game',      'Peli'],
];

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
  const [category, setCategory] = useState<ExerciseCategory>(drill?.category ?? 'tactical');
  const [tags, setTags] = useState<string[]>(drill?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [canvasHeight, setCanvasHeight] = useState<number | undefined>(undefined);
  const [isDirty, setIsDirty] = useState(false);
  const bypassBlockerRef = useRef(false);
  const [modalNeedsName, setModalNeedsName] = useState(false);

  function toggleTag(tag: string) {
    setIsDirty(true);
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  function addCustomTag() {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) return;
    setIsDirty(true);
    setTags((prev) => [...prev, t]);
    setTagInput('');
  }

  useEffect(() => {
    if (drillId && !drill) navigate('/training?view=library', { replace: true });
  }, [drillId, drill, navigate]);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (drillId && drill && !loadedRef.current) {
      loadedRef.current = true;
      board.loadShapes(drill.shapes ?? [], drill.fieldType);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!board.pendingTextPos) setTextInput('');
  }, [board.pendingTextPos]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCanvasHeight(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  async function handleSave() {
    if (!name.trim()) return;
    const canvasDataUrl = board.exportDataUrl();
    if (!canvasDataUrl) return;
    setSaving(true);
    try {
      if (drillId) {
        await updateDrill(drillId, {
          name: name.trim(), description, goals, duration, repetitions,
          category, tags, fieldType: board.fieldType,
          canvasDataUrl, shapes: board.shapes,
        });
      } else {
        await saveDrill({
          name: name.trim(), description, goals, duration, repetitions,
          category, tags, fieldType: board.fieldType,
          canvasDataUrl, shapes: board.shapes,
        });
      }
      flushSync(() => setIsDirty(false));
      bypassBlockerRef.current = true;
      navigate('/training?view=library');
    } finally {
      setSaving(false);
    }
  }

  const saveLabel = saving ? 'Tallennetaan…' : isEditing ? 'Tallenna muutokset' : 'Tallenna harjoite';

  const hasUnsavedWork =
    isDirty ||
    (!isEditing && (name.trim().length > 0 || board.shapes.length > 0)) ||
    (isEditing && board.shapes.length !== (drill?.shapes?.length ?? 0));

  const blocker = useBlocker(() => !bypassBlockerRef.current && hasUnsavedWork);

  useEffect(() => {
    if (blocker.state === 'blocked') setModalNeedsName(!name.trim());
  }, [blocker.state]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-3">

      {/* Top bar — field pills centered, back + save on sides */}
      <div className="flex gap-3 items-center">
        <div className="w-[100px] shrink-0 flex items-center">
          <button
            onClick={() => navigate('/training?view=library')}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft size={15} /> Takaisin
          </button>
        </div>
        <div className="flex-1 min-w-0 flex gap-1.5 flex-wrap justify-center">
          {VISIBLE_FIELDS.map((f) => (
            <button
              key={f}
              onClick={() => board.setFieldType(f)}
              className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                board.fieldType === f
                  ? 'bg-slate-600 text-white border-slate-600'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
              }`}
            >
              {FIELD_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="w-72 shrink-0 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} /> {saveLabel}
          </button>
        </div>
      </div>

      {/* Name input row — aligned above canvas only */}
      <div className="flex gap-3">
        <div className="w-[100px] shrink-0" />
        <div className="flex-1 min-w-0 flex justify-center px-4">
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
            placeholder="Harjoitteen nimi..."
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm font-semibold px-3 py-1.5 rounded-lg focus:outline-none focus:border-green-500 placeholder:text-slate-500 text-center"
          />
        </div>
        <div className="w-72 shrink-0" />
      </div>

      {/* Three-column layout */}
      <div className="flex gap-3 items-start">

        {/* ── Left toolbar — 2 columns ── */}
        <div className="shrink-0 self-start bg-slate-800 border border-slate-700 rounded-xl py-3 px-2 flex flex-col gap-1">

          {/* Tools grid: 2 columns */}
          <div className="grid grid-cols-2 gap-1">
            {TOOLS.map((t, i) => (
              <div key={t.id} className="relative group">
                {/* Separator spanning full width before arrows section */}
                {i === 5 && (
                  <div className="col-span-2 absolute -top-1 left-0 right-0" />
                )}
                <button
                  onClick={() => board.setTool(t.id)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    board.activeTool === t.id
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
                  }`}
                >
                  {t.icon}
                </button>
                <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-gray-900 border border-slate-700 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 z-50">
                  {t.label}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-700 my-1" />

          {/* Color swatches: 4 columns */}
          <div className="grid grid-cols-4 gap-1 px-0.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => board.setColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                  board.activeColor === c ? 'border-white scale-110' : 'border-slate-600'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>

          <div className="border-t border-slate-700 my-1" />

          {/* Size buttons: 3 columns */}
          <div className="grid grid-cols-3 gap-1">
            {(['small', 'normal', 'large'] as SizeKey[]).map((s) => (
              <button
                key={s}
                onClick={() => board.setSize(s)}
                className={`h-7 rounded text-xs font-bold transition-colors ${
                  board.activeSize === s
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700'
                }`}
              >
                {s === 'small' ? 'S' : s === 'normal' ? 'M' : 'L'}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-700 my-1" />

          {/* Undo + clear: 2 columns */}
          <div className="grid grid-cols-2 gap-1">
            <button onClick={board.undo} title="Kumoa" className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition-colors">
              <RotateCcw size={16} />
            </button>
            <button onClick={board.clearCanvas} title="Tyhjennä kenttä" className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>

        </div>

        {/* ── Canvas area ── */}
        <div className="flex-1 min-w-0 flex flex-col items-center gap-2">

          {/* Canvas */}
          <div className="relative w-full flex justify-center">
            <canvas
              ref={canvasRef}
              width={800}
              height={560}
              onPointerDown={board.handlePointerDown}
              onPointerMove={board.handlePointerMove}
              onPointerUp={board.handlePointerUp}
              className="rounded-xl shadow-lg cursor-crosshair touch-none"
              style={{ aspectRatio: '800/560', maxHeight: 'calc(100vh - 200px)', width: 'auto', maxWidth: '100%' }}
            />
            {board.pendingTextPos && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
                <form
                  onSubmit={(e) => { e.preventDefault(); board.commitText(textInput); }}
                  className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-4 flex flex-col gap-3 w-64"
                >
                  <label className="text-sm font-medium text-slate-200">Teksti kentälle</label>
                  <input
                    autoFocus
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Kirjoita teksti..."
                    className="border border-slate-600 bg-slate-900 text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
                  />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={board.cancelText} className="px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 rounded-lg transition-colors">
                      Peruuta
                    </button>
                    <button type="submit" disabled={!textInput.trim()} className="px-3 py-1.5 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50">
                      Lisää
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Selection toolbar */}
          {board.selectedShape && (() => {
            const sel = board.selectedShape;
            const hasSize = 'size' in sel;
            const hasColor = 'color' in sel;
            return (
              <div className="flex flex-wrap items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2">
                {hasSize && (
                  <>
                    {(['small', 'normal', 'large'] as SizeKey[]).map((s) => (
                      <button key={s} onClick={() => board.updateSelectedSize(s)}
                        className={`h-7 w-7 rounded text-xs font-bold transition-colors ${(sel as { size: SizeKey }).size === s ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
                        {s === 'small' ? 'S' : s === 'normal' ? 'M' : 'L'}
                      </button>
                    ))}
                    {hasColor && <div className="mx-1 h-5 w-px bg-slate-700" />}
                  </>
                )}
                {hasColor && COLORS.map((c) => (
                  <button key={c} onClick={() => board.updateSelectedColor(c)}
                    className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${(sel as { color: string }).color === c ? 'scale-110 border-white' : 'border-slate-600'}`}
                    style={{ background: c }} />
                ))}
                {sel.type === 'goal' && (
                  <>
                    <div className="mx-1 h-5 w-px bg-slate-700" />
                    <button onClick={() => board.updateSelectedRotation(-45)} title="Kierrä vasemmalle" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 transition-colors"><RotateCcw size={14} /></button>
                    <button onClick={() => board.updateSelectedRotation(45)} title="Kierrä oikealle" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 transition-colors"><RotateCw size={14} /></button>
                  </>
                )}
                <div className="mx-1 h-5 w-px bg-slate-700" />
                <button onClick={board.deleteSelected} title="Poista" className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-900/30 transition-colors"><Trash2 size={14} /></button>
              </div>
            );
          })()}
        </div>

        {/* ── Right info panel ── */}
        <div className="w-72 shrink-0 bg-[#111827] border border-slate-700 rounded-xl overflow-y-auto flex flex-col"
          style={{ height: canvasHeight ? `${canvasHeight}px` : undefined }}>
          <div className="p-5 flex flex-col gap-0">

            <h2 className="text-sm font-bold text-slate-100 mb-4">
              Harjoitteen <span className="text-green-400">tiedot</span>
            </h2>

            {/* Kategoria */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Perustiedot</p>
            <div className="relative mb-3">
              <span className="absolute left-3.5 top-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 pointer-events-none z-10">Kategoria</span>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value as ExerciseCategory); setIsDirty(true); }}
                className="w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm pt-6 pb-2 px-3.5 rounded-xl focus:outline-none focus:border-green-500 appearance-none cursor-pointer"
              >
                {CATEGORY_LABELS.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 mb-1">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 pointer-events-none z-10">Kesto (min)</span>
                <input type="number" min={1} max={120} value={duration}
                  onChange={(e) => { setDuration(Math.max(1, Number(e.target.value))); setIsDirty(true); }}
                  className="w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm pt-6 pb-2 px-3 rounded-xl focus:outline-none focus:border-green-500" />
              </div>
              <div className="relative flex-1">
                <span className="absolute left-3 top-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 pointer-events-none z-10">Toistot</span>
                <input type="number" min={1} max={20} value={repetitions}
                  onChange={(e) => { setRepetitions(Math.max(1, Number(e.target.value))); setIsDirty(true); }}
                  className="w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm pt-6 pb-2 px-3 rounded-xl focus:outline-none focus:border-green-500" />
              </div>
            </div>

            <div className="h-px bg-slate-700/60 my-4" />

            {/* Kuvaus */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Sisältö</p>
            <div className="relative mb-3">
              <span className="absolute left-3.5 top-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 pointer-events-none z-10">Kuvaus</span>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setIsDirty(true); }}
                placeholder="Mitä harjoitteessa tapahtuu..."
                rows={4}
                className="w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm pt-6 pb-2.5 px-3.5 rounded-xl focus:outline-none focus:border-green-500 resize-none placeholder:text-slate-600"
              />
            </div>
            <div className="relative mb-1">
              <span className="absolute left-3.5 top-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 pointer-events-none z-10">Valmennuspisteet</span>
              <textarea
                value={goals}
                onChange={(e) => { setGoals(e.target.value); setIsDirty(true); }}
                placeholder="Mitä pelaajat oppivat..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-600 text-slate-100 text-sm pt-6 pb-2.5 px-3.5 rounded-xl focus:outline-none focus:border-green-500 resize-none placeholder:text-slate-600"
              />
            </div>

            <div className="h-px bg-slate-700/60 my-4" />

            {/* Tagit */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Tagit</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_TAGS.map((t) => (
                <button key={t} type="button" onClick={() => toggleTag(t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    tags.includes(t)
                      ? 'bg-green-950 text-green-400 border-green-700'
                      : 'bg-slate-800 text-slate-400 border-slate-600 hover:border-slate-500 hover:text-slate-200'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
            {tags.filter((t) => !PRESET_TAGS.includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.filter((t) => !PRESET_TAGS.includes(t)).map((t) => (
                  <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-950 text-green-400 border border-green-700">
                    {t}
                    <button onClick={() => toggleTag(t)} className="hover:text-red-400 leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                placeholder="Oma tagi..."
                className="flex-1 bg-slate-800 border border-slate-600 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-green-500 placeholder:text-slate-600"
              />
              <button type="button" onClick={addCustomTag} disabled={!tagInput.trim()}
                className="px-2.5 py-2 text-xs font-semibold bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 disabled:opacity-40 transition-colors">
                + Lisää
              </button>
            </div>

            <div className="h-px bg-slate-700/60 my-4" />

            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={15} /> {saveLabel}
            </button>
          </div>
        </div>

      </div>

      {/* Unsaved changes confirmation modal */}
      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 w-[360px] flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">Tallentamattomat muutokset</h3>
              <p className="text-sm text-slate-400 mt-1">
                Harjoitteessa on tallentamattomia muutoksia. Haluatko poistua vai tallentaa ennen poistumista?
              </p>
            </div>

            {/* Name input — shown when name was missing at modal open */}
            {modalNeedsName && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Nimi puuttuu — tallentamiseen vaaditaan nimi
                </label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
                  placeholder="Harjoitteen nimi..."
                  className="w-full bg-slate-900 border border-amber-500/60 focus:border-amber-400 text-slate-100 text-sm px-3 py-2 rounded-xl focus:outline-none placeholder:text-slate-500"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={() => { bypassBlockerRef.current = true; handleSave(); }}
                disabled={!name.trim() || saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={14} /> {saving ? 'Tallennetaan…' : 'Tallenna ja poistu'}
              </button>
              <button
                onClick={() => blocker.proceed?.()}
                className="w-full px-4 py-2.5 text-sm font-semibold bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-xl transition-colors"
              >
                Poistu tallentamatta
              </button>
              <button
                onClick={() => blocker.reset?.()}
                className="w-full px-4 py-2.5 text-sm font-semibold text-slate-400 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Jatka muokkaamista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
