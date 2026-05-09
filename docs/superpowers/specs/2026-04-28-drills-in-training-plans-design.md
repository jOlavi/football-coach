# Drills in Training Plans — Design Spec

**Date:** 2026-04-28  
**Status:** Approved

## Overview

Allow coaches to add their custom tactical drills (created via `NewDrillPage`) to training plans in `TrainingBuilder`. The drill's canvas image is stored as a snapshot with the session so PDFs always work — even if the drill is later edited or deleted. Opening an existing plan in edit mode refreshes the image from the current drill store before re-saving.

## Data Model

### `Exercise` type (`src/types/index.ts`)

Add two optional fields:

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
  canvasDataUrl?: string;   // NEW — snapshot of drill canvas image at time of adding
  drillId?: string;         // NEW — reference back to source Drill (for refresh on edit)
}
```

Existing exercises (built-in and custom) have neither field — fully backwards compatible. A drill-backed exercise has both.

**Firebase note:** When Firebase Storage is added, `canvasDataUrl` transitions from a base64 PNG string to a Firebase Storage URL. The structure remains the same; only the value type changes.

## TrainingBuilder Changes (`src/pages/TrainingBuilder.tsx`)

### Exercise picker — new "Omat harjoitteet" section

Below the existing exercise grid, add a new section that is only visible when `drills.length > 0`. It does not participate in the existing category filter. Each drill is shown as a compact card with:
- Thumbnail: `<img src={d.canvasDataUrl}>` at small fixed size (aspect-video)
- Drill name and duration

Clicking a drill card calls `addExercise` with an `Exercise` constructed as:
```typescript
{
  id: crypto.randomUUID(),
  name: d.name,
  category: 'tactical',          // default; not shown for drill exercises
  duration: d.duration,
  description: d.description,
  goals: d.goals,
  drillId: d.id,
  canvasDataUrl: d.canvasDataUrl, // snapshot at add time
}
```

### Edit mode — image refresh

In the existing `useEffect` that loads a session for editing (`if (!editId) return`), after `setExercises(s.exercises)`, add a step:

For each exercise in `s.exercises` that has a `drillId`, check if a drill with that ID still exists in `useDrillStore`. If it does, replace the exercise's `canvasDataUrl` with the drill's current `canvasDataUrl`. This means opening a plan in edit mode and saving picks up the latest drill image.

Drills that have been deleted keep their stored snapshot (no refresh).

### Data flow

```
User clicks drill card
  → addExercise({ ...drillFields, drillId, canvasDataUrl: snapshot })
  → exercise appears in plan list

User saves plan
  → exercises[] (with canvasDataUrl snapshots) stored in TrainingSession

User opens plan in edit mode
  → exercises loaded from store
  → for each exercise with drillId: if drill still exists, refresh canvasDataUrl
  → user edits and saves → new snapshot stored
```

## PDF Changes (`src/pages/Training.tsx` — `printSession`)

In the HTML template inside `printSession`, replace the image placeholder for each exercise:

**Current:**
```html
<div class="ex-image-placeholder">Kuva<br>tulossa</div>
```

**New logic:**
- If `e.canvasDataUrl` is present: render `<img src="${e.canvasDataUrl}" class="ex-drill-image" />`
- Otherwise: render the existing placeholder div

Add CSS for the image:
```css
.ex-drill-image { width: 120px; min-width: 120px; height: 90px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
```

The image occupies the same 120×90px slot as the existing placeholder, so layout is unchanged for all exercises.

## Backwards Compatibility

- Existing `TrainingSession` records with exercises that have no `canvasDataUrl` continue to render the "Kuva tulossa" placeholder in PDFs.
- Existing custom exercises remain unchanged.
- Built-in exercises are unaffected.

## Scope

This spec covers:
1. `Exercise` type extension (`canvasDataUrl?`, `drillId?`)
2. Drill picker section in `TrainingBuilder`
3. Edit-mode image refresh in `TrainingBuilder`
4. PDF image rendering in `Training.tsx`

Out of scope: category tagging of drills, filtering drills in the picker, re-ordering drills relative to built-in exercises in the same list.
