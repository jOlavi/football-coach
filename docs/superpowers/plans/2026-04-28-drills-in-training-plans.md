# Drills in Training Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow coaches to add their custom tactical drills to training plans, with the drill's canvas image stored as a snapshot so PDFs work even after the drill is edited or deleted.

**Architecture:** Add two optional fields (`canvasDataUrl?`, `drillId?`) to the `Exercise` type. In `TrainingBuilder`, show drills in a new "Omat harjoitteet" picker section and refresh drill images on edit-mode load. In `Training.tsx`, render the real image in the PDF when `canvasDataUrl` is present.

**Tech Stack:** React 18, TypeScript, Zustand 5, Tailwind CSS v3, Vite 5

---

## File Map

| File | Change |
|---|---|
| `src/types/index.ts` | Add `canvasDataUrl?` and `drillId?` to `Exercise` |
| `src/pages/TrainingBuilder.tsx` | Import `useDrillStore`; add drill picker section; refresh images in edit-mode `useEffect` |
| `src/pages/Training.tsx` | Add `.ex-drill-image` CSS; replace PDF placeholder with conditional `<img>` |

---

## Task 1: Extend the `Exercise` type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add `canvasDataUrl?` and `drillId?` to the `Exercise` interface**

Find the `Exercise` interface in `src/types/index.ts` and replace it with:

```typescript
export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  duration: number;
  description: string;
  goals?: string;
  tags?: string[];
  playerCount?: number;
  canvasDataUrl?: string;
  drillId?: string;
}
```

- [ ] **Step 2: Verify the build passes**

```bash
cd /Users/juhalaitinen/Koodaukset/AI-projects/football-coach
npm run build
```

Expected: clean build, no type errors. The new fields are optional so no existing call sites break.

---

## Task 2: Add drill picker and edit-mode image refresh to TrainingBuilder

**Files:**
- Modify: `src/pages/TrainingBuilder.tsx`

This task has three sub-changes: import the drill store, add the picker section, and update the edit-mode `useEffect`.

- [ ] **Step 1: Import `useDrillStore` at the top of `TrainingBuilder.tsx`**

Add to the existing imports (after the `useExerciseStore` import line):

```typescript
import { useDrillStore } from '../store/useDrillStore';
```

- [ ] **Step 2: Read drills from the store inside `TrainingBuilder`**

Add this line directly after the existing `const { exercises: custom } = useExerciseStore();` line:

```typescript
const drills = useDrillStore((s) => s.drills);
```

- [ ] **Step 3: Update the edit-mode `useEffect` to refresh drill images**

Find the `useEffect` that loads an existing session (it starts with `if (!editId) return;`). It currently contains this line:

```typescript
setExercises(s.exercises);
```

Replace that single line with:

```typescript
const drillMap = new Map(useDrillStore.getState().drills.map((d) => [d.id, d]));
setExercises(
  s.exercises.map((ex) => {
    if (!ex.drillId) return ex;
    const drill = drillMap.get(ex.drillId);
    return drill ? { ...ex, canvasDataUrl: drill.canvasDataUrl } : ex;
  })
);
```

This refreshes the `canvasDataUrl` for any exercise that was added from a drill — so editing a plan always picks up the drill's current image. Drills that have since been deleted keep their stored snapshot.

- [ ] **Step 4: Add the "Omat harjoitteet" drill picker section**

Find this block inside the exercise picker card (it ends the exercise grid and precedes the selected-exercises list):

```tsx
            </div>
            {exercises.length > 0 && (
```

Insert the following between those two lines (after the grid's closing `</div>`, before the `{exercises.length > 0` check):

```tsx
            {drills.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Omat harjoitteet
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {drills.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => addExercise({
                        id: d.id,
                        name: d.name,
                        category: 'tactical',
                        duration: d.duration,
                        description: d.description,
                        goals: d.goals || undefined,
                        drillId: d.id,
                        canvasDataUrl: d.canvasDataUrl,
                      })}
                      className="flex items-start gap-2 p-2.5 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <img
                        src={d.canvasDataUrl}
                        alt={d.name}
                        className="w-16 h-10 object-cover rounded shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm text-gray-900 dark:text-slate-100 block truncate">{d.name}</span>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{d.duration} min</p>
                      </div>
                      <Plus size={14} className="text-brand-500 mt-0.5 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
```

Note: `addExercise` in `TrainingBuilder` already calls `{ ...e, id: crypto.randomUUID() }` internally, so the `id: d.id` passed here gets overwritten with a fresh UUID — this is correct and consistent with how built-in exercises are added.

- [ ] **Step 5: Verify the build passes**

```bash
npm run build
```

Expected: clean build, no type errors.

---

## Task 3: Show drill images in the PDF

**Files:**
- Modify: `src/pages/Training.tsx`

- [ ] **Step 1: Add `.ex-drill-image` CSS to the print template**

In `printSession`, find the line that defines `.ex-image-placeholder` in the `<style>` block:

```
    .ex-image-placeholder { width: 120px; min-width: 120px; height: 90px; border: 2px dashed #d1d5db; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 11px; text-align: center; flex-shrink: 0; }
```

Add a new line immediately after it:

```
    .ex-drill-image { width: 120px; min-width: 120px; height: 90px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
```

The full style block around this area should look like:

```typescript
    .ex-image-placeholder { width: 120px; min-width: 120px; height: 90px; border: 2px dashed #d1d5db; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 11px; text-align: center; flex-shrink: 0; }
    .ex-drill-image { width: 120px; min-width: 120px; height: 90px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
```

- [ ] **Step 2: Replace the placeholder with a conditional image**

Find this line inside the `s.exercises.map(...)` template literal:

```
      <div class="ex-image-placeholder">Kuva<br>tulossa</div>
```

Replace it with:

```
      ${e.canvasDataUrl
        ? `<img src="${e.canvasDataUrl}" class="ex-drill-image" />`
        : `<div class="ex-image-placeholder">Kuva<br>tulossa</div>`}
```

The full exercise map block should now look like:

```typescript
  ${s.exercises.map((e, i) => `
    <div class="exercise">
      <div class="ex-content">
        <div class="ex-header">
          <span class="ex-name">${i + 1}. ${e.name}</span>
          <span class="ex-cat">${CAT_LABELS[e.category]}</span>
        </div>
        <div class="ex-desc">${e.description}</div>
        ${e.goals ? `<div class="ex-goals">🎯 ${e.goals}</div>` : ''}
        <div class="ex-dur">⏱ ${e.duration} min${e.playerCount ? ` · 👥 ${e.playerCount} pelaajaa` : ''}</div>
      </div>
      ${e.canvasDataUrl
        ? `<img src="${e.canvasDataUrl}" class="ex-drill-image" />`
        : `<div class="ex-image-placeholder">Kuva<br>tulossa</div>`}
    </div>`).join('')}
```

- [ ] **Step 3: Final build check**

```bash
npm run build
```

Expected: clean build, no type errors.

- [ ] **Step 4: Manual browser test**

```bash
npm run dev
```

1. Go to `/training/new-drill`, create a drill with some shapes, save it
2. Go to `/training/new`, open the exercise picker — confirm "Omat harjoitteet" section appears with the drill's thumbnail
3. Click the drill card — confirm it appears in the "Suunnitelma" list with the drill name
4. Save the training plan
5. On the Training page, expand the session and click the PDF print button — confirm the drill's canvas image renders in the exercise row (not the "Kuva tulossa" placeholder)
6. Edit the drill (change a shape), then open the training plan in edit mode — confirm the updated image is picked up when you re-save
7. Delete the drill, open the training session PDF — confirm the image is still there (snapshot preserved)
8. Confirm built-in exercises still show the "Kuva tulossa" placeholder in the PDF (no regression)

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| `canvasDataUrl?` added to `Exercise` | Task 1 |
| `drillId?` added to `Exercise` | Task 1 |
| Drill picker section in TrainingBuilder | Task 2 Step 4 |
| Only shown when `drills.length > 0` | Task 2 Step 4 (conditional render) |
| Clicking drill calls `addExercise` with snapshot | Task 2 Step 4 |
| `drillId` and `canvasDataUrl` set on exercise | Task 2 Step 4 |
| Edit-mode refresh from drill store | Task 2 Step 3 |
| Deleted drills keep snapshot (no crash) | Task 2 Step 3 (`drill ? ... : ex`) |
| PDF shows `<img>` when `canvasDataUrl` present | Task 3 Step 2 |
| PDF keeps placeholder for non-drill exercises | Task 3 Step 2 (else branch) |
| `.ex-drill-image` CSS matches placeholder dimensions | Task 3 Step 1 (120×90px) |

**Type consistency:** `canvasDataUrl` and `drillId` defined in Task 1, used in Task 2 Step 4 (picker) and Task 2 Step 3 (refresh). Field names are consistent throughout.

**No placeholders:** All steps contain complete code. ✓

**Backwards compatibility:** Both new fields are optional — existing exercises, sessions, and the built-in exercise list are unaffected. ✓
