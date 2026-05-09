# Training Groups, PDF & Dark Theme Design

## Goal

Move the team generator into the training session builder as a reusable group generator, add PDF export of saved sessions, and add a dark/light theme toggle in settings.

---

## Data Model

### New type: `GroupSet`

```ts
interface GroupSet {
  id: string;
  label: string;        // editable, defaults to "Ryhmäjako 1", "Ryhmäjako 2", etc.
  playerIds: string[][]; // outer array = groups, inner array = player IDs in that group
}
```

### Updated type: `TrainingSession`

Add optional field:
```ts
groupSets?: GroupSet[];
```

Existing sessions without `groupSets` are treated as having an empty array.

### Updated type: `AppSettings`

Add:
```ts
theme: 'light' | 'dark';  // default: 'light'
```

---

## Architecture

### Theme

- `tailwind.config.js`: set `darkMode: 'class'`
- `App.tsx`: `useEffect` watches `settings.theme`, toggles `dark` class on `document.documentElement`
- All UI components get `dark:` Tailwind variants
- Settings page gets a toggle: "Tumma teema"

### Joukkuegeneraattori removal

- Delete `src/pages/TeamGenerator.tsx`
- Remove the `/team-generator` route from `App.tsx`
- Remove the nav item from the sidebar/nav component
- `src/utils/teamGenerator.ts` is kept — it is reused by the new group generator

### Session builder changes

The existing training session builder modal (`showBuilder` state in `Training.tsx`) is restructured:

**Layout:** Two-column layout on desktop (left: compact info + exercises; right: groups panel). Single column on mobile.

**Left column:**
- Compact single-row info bar: title, date, start time, duration, notes — all inline, no stacked cards
- Exercises list (unchanged functionality, tighter styling)

**Right column — Ryhmät & Joukkueet:**
- "＋ Uusi jako" button adds a new `GroupSet` block
- Each block:
  - Editable title input (default: "Ryhmäjako N")
  - `+/−` counter for number of groups (min 2, no max enforced)
  - Player toggle chips: all active players shown, click to toggle off (absent). Toggled-off players shown with strikethrough, excluded from generation
  - Generated group cards: 2-col grid for 2 groups, 3-col for 3+
  - Each group card: colored top border, editable name input, list of player names
  - "↻ Arvo uudelleen" button reshuffles only that block
  - "✕" removes the block

**Group generation logic:** Add a new `generateNGroups(players: Player[], n: number, matchCounts: Record<string, number>): string[][]` function to `teamGenerator.ts`. It sorts players by skill (descending) then match count (ascending) — same logic as `generateBalancedTeams` — then distributes them round-robin across N groups. Returns an array of N player ID arrays. `generateBalancedTeams` is kept untouched. Group labels auto-assigned: "Ryhmä 1", "Ryhmä 2", ... — all editable.

**Saving:** `groupSets` snapshot is saved with the session. Reshuffling updates state but does not auto-save.

### PDF export

Triggered by a "📄 PDF" button shown on saved sessions (in the session detail / list view).

Uses `window.print()` in a new window (same pattern as existing `printSession()`).

**PDF document structure:**
1. **Header:** Team name (from settings), coach name, session title, date, start time, duration
2. **Exercises:** Numbered list. Each exercise shows: name, duration, category, description/notes. A placeholder image box (e.g. `[Kuva]` box, ~120×90px) is reserved on the right side of each exercise row for future image support.
3. **Group sets:** One section per `GroupSet`. Section heading = GroupSet label. Groups shown side by side (CSS columns). Each group: colored heading, player names listed.
4. **Notes:** Session notes block at the bottom.

Print CSS: white background, black text, no dark theme, `@media print` hides browser UI. Page breaks avoided mid-section where possible.

---

## Files Affected

| Action | File |
|--------|------|
| Modify | `src/types/index.ts` — add `GroupSet`, update `TrainingSession`, update `AppSettings` |
| Modify | `src/store/useSettingsStore.ts` — add `theme` field |
| Modify | `tailwind.config.js` — add `darkMode: 'class'` |
| Modify | `src/App.tsx` — theme sync effect, remove team-generator route |
| Modify | `src/pages/Training.tsx` — restructure builder, add groups panel, add PDF button |
| Modify | `src/components/ui/*.tsx` — add `dark:` variants to all UI components |
| Modify | `src/components/layout/Sidebar.tsx` — remove TeamGenerator nav item |
| Modify | `src/pages/Settings.tsx` — add theme toggle |
| Modify | `src/pages/Dashboard.tsx` — add `dark:` variants |
| Modify | `src/pages/Matches.tsx` — add `dark:` variants |
| Modify | `src/pages/MatchPlanning.tsx` — add `dark:` variants |
| Modify | `src/components/matchplanning/PlayerCard.tsx` — add `dark:` variants |
| Delete | `src/pages/TeamGenerator.tsx` |
| Keep   | `src/utils/teamGenerator.ts` — reused for group generation |

---

## What Is NOT in Scope

- Exercise images (placeholder space reserved in PDF, but no upload UI)
- Drag-to-reorder groups or players within groups
- Persisting which players were toggled off between generator uses
- Cloud sync or multi-device support
