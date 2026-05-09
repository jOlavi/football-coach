# Uusi Harjoite — Tactical Board / Drill Creator

**Date:** 2026-04-25  
**Status:** Approved

---

## Overview

Add a full-screen Tactical Board page (`/training/new-drill`) that opens when the user clicks the existing "Uusi harjoite" button in Training.tsx (Harjoitekirjasto tab). The page lets coaches draw drill diagrams on a sports field canvas, add metadata, and save the drill. Saved drills appear as thumbnail cards in the library view.

---

## Data Model

New types added to `src/types/index.ts`:

```ts
export type FieldType =
  | 'football'    // Full football pitch
  | 'floorball'   // Floorball rink
  | 'basketball'  // Basketball court
  | 'icehockey'   // Ice hockey rink
  | 'half'        // Half pitch
  | '5v5'         // Small-sided 5v5
  | 'penalty';    // Penalty area

export interface Drill {
  id: string;
  name: string;
  description: string;
  goals: string;
  duration: number;         // minutes
  repetitions: number;
  fieldType: FieldType;
  canvasDataUrl: string;    // base64 PNG today; swap for URL when Firebase lands
  createdAt: string;
}
```

---

## Storage Abstraction

`src/utils/drillStorage.ts` — thin async wrapper so components never call the store directly:

```ts
export async function saveDrill(drill: Omit<Drill, 'id' | 'createdAt'>): Promise<Drill>
export async function getDrills(): Promise<Drill[]>
export async function deleteDrill(id: string): Promise<void>
```

Today: delegates to `useDrillStore` (Zustand + localStorage persist).  
Later (Firebase): replace body of each function — zero component changes needed.

---

## Zustand Store

`src/store/useDrillStore.ts` — persisted to localStorage:

```ts
interface DrillStore {
  drills: Drill[];
  addDrill: (drill: Drill) => void;
  deleteDrill: (id: string) => void;
}
```

---

## Canvas Hook — `useTacticalBoard`

`src/hooks/useTacticalBoard.ts`

### Shape types (discriminated union)

```ts
type Shape =
  | { type: 'player';   id: string; x: number; y: number; color: string; size: SizeKey; number: number }
  | { type: 'opponent'; id: string; x: number; y: number; color: string; size: SizeKey }
  | { type: 'cone';     id: string; x: number; y: number; color: string; size: SizeKey }
  | { type: 'ball';     id: string; x: number; y: number; size: SizeKey }
  | { type: 'arrow';    id: string; points: [number, number][]; dashed: boolean; curved: boolean; color: string }
  | { type: 'zone';     id: string; x: number; y: number; w: number; h: number; color: string }
  | { type: 'text';     id: string; x: number; y: number; text: string; color: string; size: SizeKey };

type SizeKey = 'small' | 'normal' | 'large';
type ToolType = 'select' | 'player' | 'opponent' | 'cone' | 'ball' | 'arrow' | 'dashed' | 'curved' | 'zone' | 'text';
```

### Hook state & actions

```ts
// State (returned)
shapes: Shape[]
activeTool: ToolType
activeColor: string
activeSize: SizeKey
fieldType: FieldType
selectedId: string | null

// Actions
setTool(t: ToolType): void
setColor(c: string): void
setSize(s: SizeKey): void
setFieldType(f: FieldType): void
undo(): void
clearCanvas(): void
exportDataUrl(canvasRef: RefObject<HTMLCanvasElement>): string

// Pointer handlers (unified mouse + touch)
handlePointerDown(e: PointerEvent): void
handlePointerMove(e: PointerEvent): void
handlePointerUp(e: PointerEvent): void
```

### Render loop

`useEffect` on `[shapes, fieldType]` — redraws entire canvas:
1. Draw field template (pure Canvas 2D API, correct proportions per fieldType)
2. Iterate `shapes` array and draw each shape

### Undo

Before any state-mutating action, push a snapshot of `shapes` onto a `history` stack (max 50 entries). `undo()` pops the last snapshot and restores it.

### Select tool

On `pointerdown`: hit-test all shapes (closest centroid within 20px threshold, or rect overlap for zones/arrows). Sets `selectedId`. On drag: move selected shape. `Delete`/`Backspace` key removes selected shape.

### Player numbering

Player shapes auto-number: next available integer starting from 1, reused when a player is removed.

### Touch support

All pointer handlers use `PointerEvent` (works for mouse and touch). `canvas.setPointerCapture()` on pointerdown for smooth drag on touch devices.

---

## Page Layout — `NewDrillPage.tsx`

Route: `/training/new-drill`

```
┌─────────────────────────────────────────────────────┐
│  ← Takaisin          [Tallenna harjoite]             │  ← top bar
├──────┬──────────────────────────────┬────────────────┤
│      │  [field type selector]       │  Nimi          │
│ tool │                              │  Kuvaus        │
│ bar  │        CANVAS                │  Tavoitteet    │
│      │                              │  Kesto / Toistot│
│      │                              │  Kenttätyyppi  │
│      │──────────────────────────────│                │
│      │  ● color  ○○○ size           │                │
│      │  [Kumoa]  [Tyhjennä]         │                │
└──────┴──────────────────────────────┴────────────────┘
```

- **Left toolbar** (~56px): icon buttons for each tool, active tool highlighted with `brand-600` ring
- **Center**: canvas fills available space; field template selector (dropdown or pills) above canvas
- **Right panel** (~280px): metadata form fields + save button
- **Top bar**: back button (navigate to `/training` without saving) + save button (also in right panel for convenience)

### Save flow

1. Validate: `name.trim()` must be non-empty
2. `canvas.toDataURL('image/png')` → base64 string
3. Call `drillStorage.saveDrill({ name, description, goals, duration, repetitions, fieldType, canvasDataUrl })`
4. Navigate to `/training`

Button shows "Tallennetaan…" (disabled) during the async call.

---

## Changes to Existing Files

### `src/pages/Training.tsx`

- In the library tab header: change `onClick={openCreateEx}` → `onClick={() => navigate('/training/new-drill')}` on the "Uusi harjoite" button
- Add a "Tallennetut harjoitteet" section above the exercise library grid, shown only when `useDrillStore` has drills:
  - Grid of cards: thumbnail `<img>`, name, duration badge, delete button
  - Visually separated with a heading and divider

### `src/App.tsx`

Add one route inside the existing layout:
```tsx
<Route path="training/new-drill" element={<NewDrillPage />} />
```

---

## Files Delivered

| File | Action |
|------|--------|
| `src/types/index.ts` | Add `FieldType`, `Drill` types |
| `src/store/useDrillStore.ts` | New — Zustand store with persist |
| `src/utils/drillStorage.ts` | New — async storage abstraction |
| `src/hooks/useTacticalBoard.ts` | New — canvas logic hook |
| `src/pages/NewDrillPage.tsx` | New — full tactical board page |
| `src/pages/Training.tsx` | Modify — button swap + drill thumbnail section |
| `src/App.tsx` | Modify — add route |

---

## Firebase Migration Path

When Firebase is ready:
1. Add Firebase SDK + config
2. Replace body of `drillStorage.ts` functions:
   - `saveDrill`: upload `canvasDataUrl` blob to Firebase Storage → get URL → write metadata to Firestore
   - `getDrills`: query Firestore collection
   - `deleteDrill`: delete Firestore doc + Storage file
3. Swap `canvasDataUrl` field on `Drill` to `canvasUrl: string`
4. No changes to components, hook, or store needed

---

## Constraints

- All UI text in Finnish
- TypeScript (`.tsx` / `.ts`) — no `.jsx`
- No new npm dependencies
- Follows existing patterns: Tailwind CSS, lucide-react icons, `brand-600` primary color, dark mode support
- `html2canvas` already installed but not needed — `canvas.toDataURL()` is sufficient
