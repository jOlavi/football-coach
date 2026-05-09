# Match Planning UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current availability/lineup list layout with a dual-panel drag-or-click player transfer UI where the left panel is a player pool and the right panel is the selected lineup.

**Architecture:** A new `PlayerCard` component handles the card UI and drag initiation. `MatchPlanning.tsx` is rewritten to host two drop-zone panels — pool (left) and lineup (right) — that share state via the existing `useMatchStore`. Players move between panels via click or HTML5 drag-and-drop. No new stores or types are needed.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, Zustand (existing stores), lucide-react, date-fns

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/components/matchplanning/PlayerCard.tsx` | Card UI for a single player: number, name, position, games-played %, availability dot, drag/click transfer |
| Modify | `src/pages/MatchPlanning.tsx` | Page rewrite: match selector, two-panel layout, drop zone logic |

---

## Task 1: Create `PlayerCard` component

**Files:**
- Create: `src/components/matchplanning/PlayerCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
import type { Player, AvailabilityStatus } from '../../types';
import { Badge } from '../ui/Badge';

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: 'MV',
  defender: 'PU',
  midfielder: 'KK',
  forward: 'HY',
};

const AVAILABILITY_NEXT: Record<AvailabilityStatus, AvailabilityStatus> = {
  available: 'unavailable',
  unavailable: 'unknown',
  unknown: 'available',
};

const BORDER_COLOR: Record<AvailabilityStatus, string> = {
  available: 'border-l-green-400',
  unavailable: 'border-l-red-400',
  unknown: 'border-l-gray-300',
};

const DOT_COLOR: Record<AvailabilityStatus, string> = {
  available: 'bg-green-500',
  unavailable: 'bg-red-500',
  unknown: 'bg-gray-400',
};

interface PlayerCardProps {
  player: Player;
  gamesPlayedPct: number;
  availability: AvailabilityStatus;
  onAvailabilityChange: (status: AvailabilityStatus) => void;
  onTransfer: () => void;
}

export function PlayerCard({
  player,
  gamesPlayedPct,
  availability,
  onAvailabilityChange,
  onTransfer,
}: PlayerCardProps) {
  const unavailable = availability === 'unavailable';

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('text/plain', player.id);
  }

  return (
    <div
      draggable={!unavailable}
      onDragStart={handleDragStart}
      onClick={unavailable ? undefined : onTransfer}
      className={`border-l-4 ${BORDER_COLOR[availability]} bg-white rounded-lg p-3 shadow-sm select-none transition-all ${
        unavailable
          ? 'opacity-40 cursor-not-allowed'
          : 'cursor-pointer hover:shadow-md active:scale-95'
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-xl font-bold text-gray-700">#{player.number}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAvailabilityChange(AVAILABILITY_NEXT[availability]);
          }}
          className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${DOT_COLOR[availability]}`}
          title="Vaihda saatavuus"
        />
      </div>
      <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{player.name}</p>
      <div className="flex items-center justify-between mt-2">
        <Badge label={POSITION_LABELS[player.position] ?? player.position} color="gray" />
        <span className="text-xs text-gray-400">{gamesPlayedPct}%</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Check TypeScript — run**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors in `PlayerCard.tsx`. (Ignore any unrelated errors from unchanged files.)

- [ ] **Step 3: Commit**

```bash
git add src/components/matchplanning/PlayerCard.tsx
git commit -m "feat: add PlayerCard component for match planning UI"
```

---

## Task 2: Rewrite `MatchPlanning.tsx`

**Files:**
- Modify: `src/pages/MatchPlanning.tsx`

- [ ] **Step 1: Replace the entire file contents**

```tsx
import { useState } from 'react';
import { useMatchStore } from '../store/useMatchStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { PlayerCard } from '../components/matchplanning/PlayerCard';
import { getPlayerParticipation } from '../utils/stats';
import { format } from 'date-fns';
import type { AvailabilityStatus } from '../types';

export function MatchPlanning() {
  const { matches, updateMatch } = useMatchStore();
  const players = usePlayerStore((s) => s.players);
  const minLineupSize = useSettingsStore((s) => s.settings.minLineupSize);

  const upcoming = matches
    .filter((m) => !m.result)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const [selectedMatchId, setSelectedMatchId] = useState<string>(upcoming[0]?.id ?? '');
  const match = matches.find((m) => m.id === selectedMatchId);
  const activePlayers = players.filter((p) => p.active);

  function getAvailability(playerId: string): AvailabilityStatus {
    return match?.availability.find((a) => a.playerId === playerId)?.status ?? 'unknown';
  }

  function setAvailability(playerId: string, status: AvailabilityStatus) {
    if (!match) return;
    const existing = match.availability.filter((a) => a.playerId !== playerId);
    updateMatch(match.id, { availability: [...existing, { playerId, status }] });
  }

  function toggleLineup(playerId: string) {
    if (!match) return;
    const inLineup = match.lineup.includes(playerId);
    const lineup = inLineup
      ? match.lineup.filter((id) => id !== playerId)
      : [...match.lineup, playerId];
    updateMatch(match.id, { lineup });
  }

  function handlePoolDrop(e: React.DragEvent) {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('text/plain');
    if (playerId && match?.lineup.includes(playerId)) toggleLineup(playerId);
  }

  function handleLineupDrop(e: React.DragEvent) {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('text/plain');
    if (playerId && !match?.lineup.includes(playerId) && getAvailability(playerId) !== 'unavailable') {
      toggleLineup(playerId);
    }
  }

  if (upcoming.length === 0) {
    return (
      <Card>
        <p className="text-center text-gray-400 py-12">Ei tulevia otteluita. Lisää ensin ottelu.</p>
      </Card>
    );
  }

  const poolPlayers = activePlayers
    .filter((p) => !match?.lineup.includes(p.id))
    .sort((a, b) => {
      const order: Record<AvailabilityStatus, number> = { available: 0, unknown: 1, unavailable: 2 };
      return order[getAvailability(a.id)] - order[getAvailability(b.id)];
    });

  const lineupPlayers = activePlayers.filter((p) => match?.lineup.includes(p.id));

  const availableCount = activePlayers.filter((p) => getAvailability(p.id) === 'available').length;
  const unknownCount = activePlayers.filter((p) => getAvailability(p.id) === 'unknown').length;
  const unavailableCount = activePlayers.filter((p) => getAvailability(p.id) === 'unavailable').length;

  return (
    <div className="space-y-5">
      {/* Match selector */}
      <div className="flex flex-wrap gap-2">
        {upcoming.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMatchId(m.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              m.id === selectedMatchId
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300'
            }`}
          >
            {format(new Date(m.date), 'dd.MM')} vs {m.opponent}
          </button>
        ))}
      </div>

      {match && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left — Player pool */}
          <div>
            <div className="mb-3">
              <h2 className="font-semibold text-gray-900">Pelaajat ({activePlayers.length})</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {availableCount} saatavilla · {unknownCount} ei vahvistettu · {unavailableCount} poissa
              </p>
            </div>
            <div
              onDrop={handlePoolDrop}
              onDragOver={(e) => e.preventDefault()}
              className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-h-32"
            >
              {poolPlayers.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  gamesPlayedPct={getPlayerParticipation(p.id, matches)}
                  availability={getAvailability(p.id)}
                  onAvailabilityChange={(status) => setAvailability(p.id, status)}
                  onTransfer={() => toggleLineup(p.id)}
                />
              ))}
            </div>
          </div>

          {/* Right — Lineup */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Kokoonpano</h2>
              <Badge
                label={`${match.lineup.length} valittu`}
                color={match.lineup.length >= minLineupSize ? 'green' : 'yellow'}
              />
            </div>
            <div
              onDrop={handleLineupDrop}
              onDragOver={(e) => e.preventDefault()}
              className="min-h-32 rounded-xl"
            >
              {lineupPlayers.length === 0 ? (
                <div className="h-32 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center">
                  <p className="text-sm text-gray-400">Vedä tai klikkaa pelaajia tähän.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {lineupPlayers.map((p) => (
                    <PlayerCard
                      key={p.id}
                      player={p}
                      gamesPlayedPct={getPlayerParticipation(p.id, matches)}
                      availability={getAvailability(p.id)}
                      onAvailabilityChange={(status) => setAvailability(p.id, status)}
                      onTransfer={() => toggleLineup(p.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Start the dev server and verify visually**

```bash
npm run dev
```

Open http://localhost:5173 and navigate to Ottelusuunnittelu. Verify:
- Match selector tabs appear at top
- Player pool shows cards in a 2–3 column grid
- Each card shows jersey number, name, position badge (MV/PU/KK/HY), games-played %, and a colored dot
- Clicking a non-unavailable player card moves it to the right panel
- Clicking a card in the right panel moves it back to the left pool
- Unavailable players appear greyed out and are not clickable for transfer
- Clicking the colored dot cycles availability (green → red → gray → green)
- Lineup badge turns green when lineup count ≥ minLineupSize
- Empty lineup panel shows the dashed border with "Vedä tai klikkaa pelaajia tähän."
- Drag-and-drop works: drag a card from pool to lineup and back

- [ ] **Step 3: Run TypeScript build**

```bash
npm run build 2>&1 | head -40
```

Expected: exits with code 0, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/MatchPlanning.tsx
git commit -m "feat: redesign Ottelusuunnittelu as dual-panel drag-or-click transfer UI"
```
