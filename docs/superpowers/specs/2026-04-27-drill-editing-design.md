# Drill Editing — Design Spec

**Date:** 2026-04-27  
**Status:** Approved

## Overview

Enable coaches to edit drills they have created with `NewDrillPage`, including both the canvas drawing and all metadata fields. Uses Option A: store the raw shapes array alongside the PNG thumbnail so the canvas can be fully restored on edit.

## Data Model

### `Drill` type (`src/types/index.ts`)

Add `shapes: Shape[]` field. Existing drills without this field are treated as having an empty array (backwards-compatible).

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
  shapes: Shape[];       // NEW — raw shape data for canvas restoration
  createdAt: string;
}
```

`Shape` is imported from `src/hooks/useTacticalBoard.ts`.

### `useDrillStore` (`src/store/useDrillStore.ts`)

Add `updateDrill(id: string, patch: Partial<Drill>) => void` action.

### `drillStorage.ts` (`src/utils/drillStorage.ts`)

Add `updateDrill(id: string, patch: Partial<Omit<Drill, 'id' | 'createdAt'>>) => Promise<void>` that calls `useDrillStore.getState().updateDrill(id, patch)`.

Update `saveDrill` to accept and store `shapes` alongside existing fields.

## Hook — `useTacticalBoard`

Add `loadShapes(shapes: Shape[], fieldType: FieldType) => void` — sets both shapes state and fieldType in one call. Called once on mount in edit mode.

## Page — `NewDrillPage`

Generalize to handle create and edit via optional URL param.

- Route param: `id?` via `useParams<{ id?: string }>()`
- On mount in edit mode: load drill from store, pre-fill all form state, call `board.loadShapes(drill.shapes ?? [], drill.fieldType)`
- Save in create mode: calls `saveDrill(...)` → navigates to `/training?view=library`
- Save in edit mode: calls `updateDrill(id, ...)` → navigates to `/training?view=library`
- UI is identical in both modes; title bar label changes: "Uusi harjoite" vs "Muokkaa harjoitetta"; save button label: "Tallenna harjoite" vs "Tallenna muutokset"

## Routing

### `App.tsx`

Add route:
```
/training/drills/:id/edit  →  NewDrillPage
```

### `Layout.tsx`

Add dynamic title entry for `/training/drills/:id/edit` → "Muokkaa harjoitetta".

## UI — `Training.tsx`

Each drill card in the library view gets a pencil icon button next to the existing delete button. Clicking navigates to `/training/drills/${d.id}/edit`. Uses the same icon style as delete (`Pencil` from lucide-react, size 12).

## Data Flow

```
Create: NewDrillPage → saveDrill({ ...fields, shapes, canvasDataUrl }) → useDrillStore.addDrill
Edit:   Training.tsx → navigate(/training/drills/:id/edit)
        NewDrillPage mounts → load drill → loadShapes() + pre-fill form
        Save → updateDrill(id, { ...fields, shapes, canvasDataUrl }) → useDrillStore.updateDrill
```

## Backwards Compatibility

Existing drills in localStorage have no `shapes` field. The edit page treats `drill.shapes ?? []` as an empty array — the canvas starts blank but all metadata is pre-filled. The coach can redraw and save.

## Firebase Readiness

`shapes` is a plain JSON-serializable array of objects with primitive values. Maps cleanly to a Firestore document field. `canvasDataUrl` is a base64 string; if it approaches Firestore's 1 MB limit, it can be moved to Firebase Storage independently without changing the shapes design.
