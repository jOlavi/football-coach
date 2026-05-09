# Drill Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow coaches to open a saved drill and edit both the canvas drawing and all metadata fields, with changes persisted to localStorage.

**Architecture:** Add `shapes: Shape[]` to the `Drill` type so the raw canvas state is stored alongside the PNG thumbnail. Move shared shape types to `types/index.ts` to avoid circular imports. Generalise `NewDrillPage` to detect an optional `:id` URL param — in edit mode it pre-fills the form and restores the canvas via a new `loadShapes` hook function. A new route `/training/drills/:id/edit` serves the edit flow; a pencil icon button on each drill card in `Training.tsx` navigates to it.

**Tech Stack:** React 18, TypeScript, Zustand 5, React Router v7, lucide-react, Tailwind CSS v3

---

## File Map

| File | Change |
|---|---|
| `src/types/index.ts` | Move `SizeKey`, `ToolType`, `Shape` here from hook; add `shapes: Shape[]` to `Drill` |
| `src/hooks/useTacticalBoard.ts` | Remove moved types; import from `../types`; add `loadShapes` |
| `src/store/useDrillStore.ts` | Add `updateDrill` action |
| `src/utils/drillStorage.ts` | Add `updateDrill`; update `saveDrill` to pass `shapes` |
| `src/pages/NewDrillPage.tsx` | Detect edit mode via `:id` param; load drill; save via `updateDrill` |
| `src/App.tsx` | Add `/training/drills/:id/edit` route |
| `src/components/layout/Layout.tsx` | Update title regex to distinguish drill edits from session edits |
| `src/pages/Training.tsx` | Add pencil edit button on each drill card |

---

## Task 1: Move shape types to `types/index.ts`

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/hooks/useTacticalBoard.ts`

Moving `SizeKey`, `ToolType`, and `Shape` out of the hook prevents a circular dependency when `Drill` stores `Shape[]` (the hook already imports `FieldType` from `types`).

- [ ] **Step 1: Add `SizeKey`, `ToolType`, and `Shape` to `src/types/index.ts`**

Append to the bottom of `src/types/index.ts` (after the `Drill` interface — you will add `shapes` to `Drill` in Task 2):

```typescript
export type SizeKey = 'small' | 'normal' | 'large';

export type ToolType =
  | 'select' | 'player' | 'opponent' | 'cone' | 'ball'
  | 'arrow' | 'dashed' | 'curved' | 'zone' | 'text';

export type Shape =
  | { type: 'player';   id: string; x: number; y: number; color: string; size: SizeKey; number: number }
  | { type: 'opponent'; id: string; x: number; y: number; color: string; size: SizeKey }
  | { type: 'cone';     id: string; x: number; y: number; color: string; size: SizeKey }
  | { type: 'ball';     id: string; x: number; y: number; size: SizeKey }
  | { type: 'arrow';    id: string; points: [number, number][]; dashed: boolean; curved: boolean; color: string }
  | { type: 'zone';     id: string; x: number; y: number; w: number; h: number; color: string }
  | { type: 'text';     id: string; x: number; y: number; text: string; color: string; size: SizeKey };
```

- [ ] **Step 2: Update `src/hooks/useTacticalBoard.ts` — remove the three type definitions and import them from `../types`**

Remove these lines near the top of the file:
```typescript
export type SizeKey = 'small' | 'normal' | 'large';
export type ToolType =
  | 'select' | 'player' | 'opponent' | 'cone' | 'ball'
  | 'arrow' | 'dashed' | 'curved' | 'zone' | 'text';

export type Shape =
  | { type: 'player';   id: string; x: number; y: number; color: string; size: SizeKey; number: number }
  | { type: 'opponent'; id: string; x: number; y: number; color: string; size: SizeKey }
  | { type: 'cone';     id: string; x: number; y: number; color: string; size: SizeKey }
  | { type: 'ball';     id: string; x: number; y: number; size: SizeKey }
  | { type: 'arrow';    id: string; points: [number, number][]; dashed: boolean; curved: boolean; color: string }
  | { type: 'zone';     id: string; x: number; y: number; w: number; h: number; color: string }
  | { type: 'text';     id: string; x: number; y: number; text: string; color: string; size: SizeKey };
```

Add this import at the top of `src/hooks/useTacticalBoard.ts` (alongside the existing `FieldType` import):
```typescript
import type { FieldType, SizeKey, ToolType, Shape } from '../types';
```

The existing import line `import type { FieldType } from '../types';` becomes the line above.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/juhalaitinen/Koodaukset/AI-projects/football-coach
npm run build
```

Expected: build succeeds with no type errors. If you see "cannot find name 'Shape'" check you removed all three type definitions from the hook and added the import.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/hooks/useTacticalBoard.ts
git commit -m "refactor: move SizeKey, ToolType, Shape types to types/index.ts"
```

*(Skip git steps if no git repo — the project root has no `.git` directory.)*

---

## Task 2: Update `Drill` type and data layer

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/store/useDrillStore.ts`
- Modify: `src/utils/drillStorage.ts`

- [ ] **Step 1: Add `shapes` field to the `Drill` interface in `src/types/index.ts`**

Find the `Drill` interface and replace it with:
```typescript
export interface Drill {
  id: string;
  name: string;
  description: string;
  goals: string;
  duration: number;
  repetitions: number;
  fieldType: FieldType;
  canvasDataUrl: string;
  shapes: Shape[];
  createdAt: string;
}
```

`Shape` is already defined in the same file (added in Task 1), so no extra import is needed.

- [ ] **Step 2: Add `updateDrill` to `src/store/useDrillStore.ts`**

Replace the entire file with:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Drill } from '../types';

interface DrillStore {
  drills: Drill[];
  addDrill: (drill: Drill) => void;
  updateDrill: (id: string, patch: Partial<Drill>) => void;
  deleteDrill: (id: string) => void;
}

export const useDrillStore = create<DrillStore>()(
  persist(
    (set) => ({
      drills: [],
      addDrill: (drill) => set((s) => ({ drills: [...s.drills, drill] })),
      updateDrill: (id, patch) =>
        set((s) => ({ drills: s.drills.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      deleteDrill: (id) => set((s) => ({ drills: s.drills.filter((d) => d.id !== id) })),
    }),
    { name: 'drill-store' }
  )
);
```

- [ ] **Step 3: Update `src/utils/drillStorage.ts` — add `updateDrill`, keep `saveDrill` signature unchanged**

Replace the entire file with:
```typescript
import { useDrillStore } from '../store/useDrillStore';
import type { Drill } from '../types';

export async function saveDrill(data: Omit<Drill, 'id' | 'createdAt'>): Promise<Drill> {
  const drill: Drill = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  useDrillStore.getState().addDrill(drill);
  return drill;
}

export async function updateDrill(
  id: string,
  data: Partial<Omit<Drill, 'id' | 'createdAt'>>
): Promise<void> {
  useDrillStore.getState().updateDrill(id, data);
}

export async function getDrills(): Promise<Drill[]> {
  return useDrillStore.getState().drills;
}

export async function deleteDrill(id: string): Promise<void> {
  useDrillStore.getState().deleteDrill(id);
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build
```

Expected: build succeeds. If `shapes` causes errors on existing call sites, check that `saveDrill` callers now pass `shapes: board.shapes` — you'll add this in Task 4.

*Note: The build may fail at this point because `NewDrillPage` calls `saveDrill` without `shapes`. That is expected and will be fixed in Task 4. Check only that the store and storage files themselves have no type errors by inspecting the error messages.*

---

## Task 3: Add `loadShapes` to `useTacticalBoard`

**Files:**
- Modify: `src/hooks/useTacticalBoard.ts`

- [ ] **Step 1: Add the `loadShapes` callback inside `useTacticalBoard`**

After the `cancelText` callback (around line 475), add:

```typescript
const loadShapes = useCallback((newShapes: Shape[], newFieldType: FieldType) => {
  historyRef.current = [];
  setSelectedId(null);
  setFieldType(newFieldType);
  setShapes(newShapes);
}, []);
```

- [ ] **Step 2: Return `loadShapes` from the hook**

Find the return statement at the bottom of `useTacticalBoard` and add `loadShapes`:

```typescript
return {
  shapes, activeTool, activeColor, activeSize, fieldType, selectedId, pendingTextPos,
  setTool, setColor, setSize, setFieldType,
  undo, clearCanvas, exportDataUrl, loadShapes,
  commitText, cancelText,
  handlePointerDown, handlePointerMove, handlePointerUp,
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: build succeeds (or only fails on the `NewDrillPage` missing `shapes` in `saveDrill` — that is fixed next).

---

## Task 4: Generalise `NewDrillPage` for create and edit mode

**Files:**
- Modify: `src/pages/NewDrillPage.tsx`

The page reads an optional `:id` param. If present, it pre-fills form state from the stored drill and restores the canvas via `loadShapes`. On save it calls either `saveDrill` (create) or `updateDrill` (edit).

- [ ] **Step 1: Replace `src/pages/NewDrillPage.tsx` with the following**

```tsx
import { useRef, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, RotateCcw, Trash2,
  MousePointer, UserRound, X, Triangle, Circle,
  ArrowRight, ArrowRightFromLine, Spline, Square, Type,
} from 'lucide-react';
import { useTacticalBoard } from '../hooks/useTacticalBoard';
import type { ToolType, SizeKey } from '../types';
import { useDrillStore } from '../store/useDrillStore';
import { saveDrill, updateDrill } from '../utils/drillStorage';
import type { FieldType } from '../types';

const TOOLS: { id: ToolType; icon: React.ReactNode; label: string }[] = [
  { id: 'select',   icon: <MousePointer size={18} />,        label: 'Valitse' },
  { id: 'player',   icon: <UserRound size={18} />,           label: 'Pelaaja' },
  { id: 'opponent', icon: <X size={18} />,                   label: 'Vastustaja' },
  { id: 'cone',     icon: <Triangle size={18} />,            label: 'Kartio' },
  { id: 'ball',     icon: <Circle size={18} />,              label: 'Pallo' },
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
};

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

  // Load existing shapes once on mount when editing
  const loadedRef = useRef(false);
  useEffect(() => {
    if (drillId && drill && !loadedRef.current) {
      loadedRef.current = true;
      board.loadShapes(drill.shapes ?? [], drill.fieldType);
    }
  // board.loadShapes is stable (useCallback with no deps); drill is stable after first load
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
            <button
              key={t.id}
              onClick={() => board.setTool(t.id)}
              title={t.label}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                board.activeTool === t.id
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {t.icon}
            </button>
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
            {(Object.keys(FIELD_LABELS) as FieldType[]).map((f) => (
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: build succeeds with no type errors. The `shapes: board.shapes` fields are now passed in both `saveDrill` and `updateDrill` calls.

---

## Task 5: Add route, update Layout title, add edit button in Training

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Layout.tsx`
- Modify: `src/pages/Training.tsx`

- [ ] **Step 1: Add the edit route in `src/App.tsx`**

After the existing `/training/new-drill` route, add:
```tsx
<Route path="training/drills/:id/edit" element={<NewDrillPage />} />
```

The routes block should look like:
```tsx
<Route path="training" element={<Training />} />
<Route path="training/new" element={<TrainingBuilder />} />
<Route path="training/:id/edit" element={<TrainingBuilder />} />
<Route path="training/new-drill" element={<NewDrillPage />} />
<Route path="training/drills/:id/edit" element={<NewDrillPage />} />
```

- [ ] **Step 2: Update the title logic in `src/components/layout/Layout.tsx`**

The existing regex `/^\/training\/.+\/edit$/` matches both training session edits and drill edits, both showing "Muokkaa harjoitussuunnitelmaa". Update the fallback chain to distinguish them:

Replace the `title` assignment:
```typescript
const title = PAGE_TITLES[pathname]
  ?? (/^\/training\/.+\/edit$/.test(pathname) ? 'Muokkaa harjoitussuunnitelmaa' : 'Jalkapallovalmennin');
```

With:
```typescript
const title = PAGE_TITLES[pathname]
  ?? (/^\/training\/drills\/.+\/edit$/.test(pathname) ? 'Muokkaa harjoitetta'
    : /^\/training\/.+\/edit$/.test(pathname) ? 'Muokkaa harjoitussuunnitelmaa'
    : 'Jalkapallovalmennin');
```

- [ ] **Step 3: Add the edit button to drill cards in `src/pages/Training.tsx`**

In `Training.tsx`, add `Pencil` to the lucide-react import line:
```typescript
import { Plus, Pencil, Trash2, FileText, ChevronDown, ChevronUp, BookOpen, CalendarDays } from 'lucide-react';
```

(`Pencil` is already imported — confirm it's present, no change needed if so.)

Find the drill card section (the `{drills.map((d) => (` block). Replace the `<div className="p-2">` inner block so the bottom row shows both an edit and a delete button:

```tsx
<div className="p-2">
  <p className="font-medium text-sm text-gray-900 dark:text-slate-100 truncate">{d.name}</p>
  <div className="flex items-center justify-between mt-1">
    <span className="text-xs text-gray-400 dark:text-slate-500">{d.duration} min</span>
    <div className="flex gap-1">
      <button
        onClick={() => navigate(`/training/drills/${d.id}/edit`)}
        className="text-gray-400 dark:text-slate-500 hover:text-brand-600 transition-colors"
        title="Muokkaa harjoitetta"
      >
        <Pencil size={12} />
      </button>
      <button
        onClick={() => deleteDrill(d.id).catch(console.error)}
        className="text-gray-400 dark:text-slate-500 hover:text-red-500 transition-colors"
        title="Poista harjoite"
      >
        <Trash2 size={12} />
      </button>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Final build check**

```bash
npm run build
```

Expected: clean build, no type errors.

- [ ] **Step 5: Manual browser test**

```bash
npm run dev
```

1. Open `http://localhost:5173/training?view=library`
2. Create a new drill via "Uusi harjoite" — draw a few shapes, fill metadata, save
3. The drill appears in the library grid with a pencil icon next to the trash icon
4. Click the pencil icon — page title shows "Muokkaa harjoitetta", all form fields are pre-filled, canvas shows the saved shapes
5. Move a shape, change the name, click "Tallenna muutokset"
6. Library shows the updated thumbnail and updated name
7. Click pencil again — confirm the edited state persists (shapes restored correctly)
8. Verify old drills without `shapes` open with blank canvas but pre-filled metadata (backwards-compatible)

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task that implements it |
|---|---|
| Add `shapes: Shape[]` to `Drill` type | Task 2 Step 1 |
| Add `updateDrill` to store | Task 2 Step 2 |
| Add `updateDrill` to drillStorage | Task 2 Step 3 |
| Add `loadShapes` to hook | Task 3 |
| NewDrillPage detects edit mode via `:id` | Task 4 |
| Pre-fill form fields in edit mode | Task 4 (initial state from `drill?.x ?? default`) |
| Restore canvas via `loadShapes` on mount | Task 4 (loadedRef pattern) |
| Save calls `updateDrill` in edit mode | Task 4 |
| New route `/training/drills/:id/edit` | Task 5 Step 1 |
| Layout title for drill edit | Task 5 Step 2 |
| Pencil button on drill cards | Task 5 Step 3 |
| Backwards-compatible with old drills | `drill.shapes ?? []` in Task 4 |
| Firebase-ready (shapes as plain JSON) | Inherent in Shape type — no special handling needed |

**Circular dependency resolved:** `Shape` moved to `types/index.ts` in Task 1 before `Drill` references it in Task 2. `useTacticalBoard` imports from `types` not the other way around. ✓

**No placeholders:** All steps contain complete code. ✓

**Type consistency:**
- `board.shapes` — `shapes` is already returned from `useTacticalBoard` (confirmed in existing return statement)
- `board.loadShapes` — added to hook in Task 3, added to return in Task 3 Step 2
- `updateDrill(id, patch)` — defined in store Task 2 Step 2, in storage Task 2 Step 3, called in page Task 4 ✓
- `drill.shapes ?? []` — `shapes` is `Shape[]` on `Drill` (Task 2 Step 1), `??` handles old drills with no field ✓
