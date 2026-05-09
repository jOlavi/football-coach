# Ottelusuunnittelu UI Redesign

**Date:** 2026-04-20
**Status:** Approved

## Summary

Replace the current side-by-side availability/lineup list layout with a dual-panel drag-or-click player transfer UI. Left panel shows the full player pool; right panel shows the selected lineup. Both panels display players as card grids.

## Layout

### Match selector (unchanged)
Tab buttons at the top for switching between upcoming matches. No changes to this component.

### Two-panel layout
Side by side on desktop (`lg:grid-cols-2`), stacked on mobile.

---

## Left panel — "Pelaajat"

**Header:**
- Title: "Pelaajat (N)" where N = total active player count
- Availability summary line: e.g. "8 saatavilla · 2 ei vahvistettu · 1 poissa"

**Player card grid:**
- 4 columns desktop, 3 columns tablet, 2 columns mobile
- Each card contains:
  - Jersey number (large, top-left)
  - Player name
  - Position badge (`<Badge>`)
  - Games played % — e.g. "73% otteluista" — calculated as: completed matches where player is in lineup / total completed matches (matches with `result`)
  - Small colored availability dot (green = available, gray = unknown, red = unavailable)
  - Clicking the dot cycles: available → unknown → unavailable → available (writes to `match.availability`)

**Unavailable players:**
- Shown in the grid but at 50% opacity
- Not interactive for lineup transfer (click/drag disabled)
- Availability dot still clickable to change status

**Transfer interaction:**
- Click a non-unavailable card → moves player to right panel (adds to `match.lineup`)
- Drag a card to the right panel → same effect
- Cards already in lineup are visually indicated (subtle brand tint or checkmark) and clicking them removes from lineup

---

## Right panel — "Kokoonpano"

**Header:**
- Title: "Kokoonpano"
- Badge: "X valittu" — green if `match.lineup.length >= minLineupSize`, yellow otherwise

**Lineup card grid:**
- Same card style and grid columns as left panel
- Cards show same info: number, name, position, games played %

**Transfer interaction:**
- Click a card → returns player to left panel (removes from `match.lineup`)
- Drag a card back to left panel → same effect

**Empty state:**
- Dashed border area with text: "Vedä tai klikkaa pelaajia tähän."

---

## Data & State

No new stores or types required. All state uses existing fields:

| Data | Source |
|---|---|
| Player list | `usePlayerStore` — `players.filter(p => p.active)` |
| Availability | `match.availability: PlayerAvailability[]` |
| Lineup | `match.lineup: string[]` |
| Games played % | Computed inline from `useMatchStore` — completed matches (`m.result != null`) where `m.lineup.includes(playerId)` |
| Min lineup size | `useSettingsStore` — `settings.minLineupSize` |

Games played % formula:
```
const completed = matches.filter(m => m.result);
const played = completed.filter(m => m.lineup.includes(playerId)).length;
const pct = completed.length > 0 ? Math.round((played / completed.length) * 100) : 0;
```

---

## Out of scope

- Formation/position slots on a pitch graphic (future)
- Drag-and-drop ordering within the lineup panel (future)
- Availability notifications to parents (separate Communication page)
