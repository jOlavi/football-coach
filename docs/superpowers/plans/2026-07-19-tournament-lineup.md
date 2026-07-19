# Turnauksen kokoonpanon hallinta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lisätään turnauksille kokoonpanon hallinta — pelaajien valinta sekä luonnin yhteydessä että jälkikäteen, sekä "Kokoonpano puuttuu" -indikaattori turnauslistauksessa.

**Architecture:** Uusi `TournamentLineupModal`-komponentti hoitaa pelaajavalinnan callback-pohjaisesti — sama modaali toimii sekä luontiflowssa (päivittää draft-statea) että listausnäkymässä (tallentaa suoraan storeen). Tournament-tyyppiä laajennetaan `lineup?: string[]` -kentällä.

**Tech Stack:** React 18, TypeScript, Zustand 5, Tailwind CSS v3, lucide-react

## Global Constraints

- Kaikki UI-teksti suomeksi
- Ei uusia dependencyjä
- `lineup` on optional — olemassa oleva tournament-data ei hajoa
- Haara: `feature/tournament-lineup` (luodaan `main`-haarasta)
- Käytä olemassa olevia UI-komponentteja: `<Modal>`, `<Button>`

---

### Task 1: Feature branch + tietomalli

**Files:**
- Modify: `src/types/index.ts` (Tournament-interface, rivi 63–84)

**Interfaces:**
- Produces: `Tournament.lineup?: string[]` — käytetään Tasks 2, 3, 4

- [ ] **Step 1: Luo feature branch**

```bash
git checkout main
git pull
git checkout -b feature/tournament-lineup
```

- [ ] **Step 2: Lisää `lineup` Tournament-interfaceen**

Tiedosto: `src/types/index.ts`. Etsi `export interface Tournament` ja lisää `lineup?: string[]` ennen `matches`-kenttää:

```ts
export interface Tournament {
  id: string;
  season?: string;
  name: string;
  date?: string;
  venue?: string;
  address?: string;
  notes?: string;
  ownTeamId?: string;
  level?: string;
  lineup?: string[];
  matches: TournamentMatch[];
  createdAt: string;
}
```

- [ ] **Step 3: Varmista build**

```bash
npm run build 2>&1 | grep -E "error TS|✓ built"
```

Odotettu: `✓ built in X.XXs`

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: lisää lineup-kenttä Tournament-tyyppiin"
```

---

### Task 2: TournamentLineupModal — uusi komponentti

**Files:**
- Create: `src/components/matches/TournamentLineupModal.tsx`

**Interfaces:**
- Consumes: `Tournament.lineup?: string[]` (Task 1), `usePlayerStore` (players, active, skillLevel, number, name), `useTeamStore` (teams, OwnTeam.level?: TeamLevel)
- Produces: `TournamentLineupModal` — exportattu komponentti, Props: `{ initialLineup: string[], ownTeamId?: string, onSave: (lineup: string[]) => void, onClose: () => void }`

- [ ] **Step 1: Luo komponentti**

Tiedosto: `src/components/matches/TournamentLineupModal.tsx`

```tsx
import { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTeamStore } from '../../store/useTeamStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface Props {
  initialLineup: string[];
  ownTeamId?: string;
  onSave: (lineup: string[]) => void;
  onClose: () => void;
}

export function TournamentLineupModal({ initialLineup, ownTeamId, onSave, onClose }: Props) {
  const players = usePlayerStore((s) => s.players);
  const teams = useTeamStore((s) => s.teams);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialLineup));

  const team = ownTeamId ? teams.find((t) => t.id === ownTeamId) : null;

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (!p.active) return false;
      if (team?.level === 'taso1') return p.skillLevel === 1 || p.skillLevel === 3;
      if (team?.level === 'taso2') return p.skillLevel === 2 || p.skillLevel === 3;
      return true;
    });
  }, [players, team]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Modal title="Kokoonpano" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-gray-400 dark:text-slate-500">
          Valittu {selected.size} / {filteredPlayers.length} pelaajaa
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filteredPlayers.map((p) => {
            const isSelected = selected.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                  isSelected
                    ? 'bg-green-50 border-green-400 dark:bg-green-900/20 dark:border-green-600'
                    : 'bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                }`}
              >
                <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {p.number}
                </span>
                <span className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                  {p.name}
                </span>
                {isSelected && (
                  <Check size={12} className="absolute top-1.5 right-1.5 text-green-500" />
                )}
              </button>
            );
          })}
        </div>
        {filteredPlayers.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
            Ei pelaajia. Lisää pelaajia ensin Pelaajat-sivulla.
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Peruuta</Button>
          <Button onClick={() => onSave(Array.from(selected))}>
            Tallenna ({selected.size})
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Varmista build**

```bash
npm run build 2>&1 | grep -E "error TS|✓ built"
```

Odotettu: `✓ built in X.XXs`

- [ ] **Step 3: Commit**

```bash
git add src/components/matches/TournamentLineupModal.tsx
git commit -m "feat: lisää TournamentLineupModal pelaajavalinnan"
```

---

### Task 3: TournamentFormModal — lineup luontiflowssa

**Files:**
- Modify: `src/components/matches/TournamentFormModal.tsx`

**Interfaces:**
- Consumes: `TournamentLineupModal` (Task 2) — `{ initialLineup, ownTeamId, onSave, onClose }`
- Consumes: `Tournament.lineup?: string[]` (Task 1)

- [ ] **Step 1: Lisää TournamentLineupModal-import**

Tiedosto: `src/components/matches/TournamentFormModal.tsx`, importtien joukkoon:

```ts
import { TournamentLineupModal } from './TournamentLineupModal';
```

- [ ] **Step 2: Lisää lineup- ja showLineupModal-state**

Heti olemassa olevien `useState`-rivien jälkeen (rivin 48 jälkeen, ennen `function handleSave`):

```ts
const [lineup, setLineup] = useState<string[]>(() => editing?.lineup ?? []);
const [showLineupModal, setShowLineupModal] = useState(false);
```

- [ ] **Step 3: Päivitä handleSave välittämään lineup**

Nykyinen `handleSave` (rivi 50–61). Muuta `addTournament`- ja `updateTournament`-kutsut sisältämään `lineup`:

```ts
function handleSave() {
  if (!draft.name.trim()) return;
  const savedMatches: TournamentMatch[] = draftMatches
    .filter((m) => m.opponent.trim())
    .map((m) => ({ id: m.id, time: m.time || undefined, field: m.field || undefined, opponent: m.opponent, location: m.location }));
  if (editing) {
    updateTournament(editing.id, { ...draft, lineup, matches: savedMatches });
  } else {
    addTournament({ ...draft, lineup, matches: savedMatches, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  }
  onClose();
}
```

- [ ] **Step 4: Lisää Kokoonpano-osio lomakkeeseen**

Tiedosto: `src/components/matches/TournamentFormModal.tsx`. Lisää `<Textarea label="Muistiinpanot" .../>` -rivin (rivi 120) JÄLKEEN, ennen sulkevaa `</div>` (rivi 122):

```tsx
<div>
  <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Kokoonpano</p>
  <Button variant="secondary" size="sm" onClick={() => setShowLineupModal(true)}>
    {lineup.length > 0 ? `Muokkaa kokoonpanoa (${lineup.length})` : 'Lisää kokoonpano'}
  </Button>
</div>
```

- [ ] **Step 5: Renderöi TournamentLineupModal**

Lisää modaalin sulkevan `</Modal>`-tagin JÄLKEEN (rivin 190 jälkeen):

```tsx
{showLineupModal && (
  <TournamentLineupModal
    initialLineup={lineup}
    ownTeamId={draft.ownTeamId}
    onSave={(ids) => { setLineup(ids); setShowLineupModal(false); }}
    onClose={() => setShowLineupModal(false)}
  />
)}
```

- [ ] **Step 6: Varmista build**

```bash
npm run build 2>&1 | grep -E "error TS|✓ built"
```

Odotettu: `✓ built in X.XXs`

- [ ] **Step 7: Testaa selaimessa**

```bash
npm run dev
```

- Turnaukset → "Luo turnaus" → lomakkeessa näkyy "Lisää kokoonpano" -nappi
- Klikkaa nappia → pelaajavalinnan modaali avautuu
- Valitse pelaajia → "Tallenna (X)" → modaali sulkeutuu, nappi muuttuu "Muokkaa kokoonpanoa (X)"
- "Luo turnaus" → tarkista DevToolsista/localStorage että `lineup`-kenttä tallentui

- [ ] **Step 8: Commit**

```bash
git add src/components/matches/TournamentFormModal.tsx
git commit -m "feat: lisää kokoonpanon hallinta turnauksen luontilomakkeeseen"
```

---

### Task 4: Matches.tsx — "Kokoonpano puuttuu" ja hallintanappi

**Files:**
- Modify: `src/pages/Matches.tsx`

**Interfaces:**
- Consumes: `TournamentLineupModal` (Task 2) — `{ initialLineup, ownTeamId, onSave, onClose }`
- Consumes: `Tournament.lineup?: string[]` (Task 1)
- Consumes: `updateTournament` from `useTournamentStore`

- [ ] **Step 1: Lisää importit**

Tiedosto: `src/pages/Matches.tsx`.

Lisää `Users` lucide-importtiin (rivi 9, jossa `Plus, Pencil, Trash2, ...`):

```ts
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  ClipboardList, PlayCircle, Trophy, X, MoreVertical, Users,
} from "lucide-react";
```

Lisää `TournamentLineupModal`-import muiden komponentti-importtien joukkoon:

```ts
import { TournamentLineupModal } from "../components/matches/TournamentLineupModal";
```

- [ ] **Step 2: Lisää `updateTournament` destructuraukseen**

Rivi 51. Muuta:

```ts
const { deleteTournament, addTournamentMatch, updateTournamentMatch, removeTournamentMatch, updateTournament } = useTournamentStore();
```

- [ ] **Step 3: Lisää `lineupTournamentId` state**

Muiden useState-rivien joukkoon (n. rivi 82):

```ts
const [lineupTournamentId, setLineupTournamentId] = useState<string | null>(null);
```

- [ ] **Step 4: Lisää "Kokoonpano puuttuu" -indikaattori ja hallintanappi laajennettuun turnausriviin**

Tiedosto: `src/pages/Matches.tsx`, rivi 521. Laajennetun turnausrivin body-div alkaa:
```tsx
{!isCollapsed && <div className="bg-gray-50 dark:bg-slate-900 border-t ...">
```

Lisää heti tämän divin sisälle ENSIMMÄISEKSI elementiksi (ennen `{(t.matches ?? []).length === 0 && ...}`):

```tsx
{!t.lineup?.length && (
  <div className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2.5 mb-2">
    <Users size={16} className="text-yellow-600 flex-shrink-0" />
    <div>
      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Kokoonpano puuttuu</p>
      <p className="text-xs text-yellow-600 dark:text-yellow-400">Lisää pelaajat turnaukseen</p>
    </div>
  </div>
)}
```

Lisää sitten "Lisää ottelu" -napin (`<div className="pt-1">`) sisälle, sen JÄLKEEN (rivi 582 jälkeen):

```tsx
<div className="pt-1 flex flex-wrap gap-2">
  <Button variant="secondary" size="sm" icon={<Plus size={13} />}
    onClick={() => addTournamentMatch(t.id, { id: crypto.randomUUID(), opponent: 'Uusi ottelu' })}>
    Lisää ottelu
  </Button>
  <Button
    variant="secondary"
    size="sm"
    icon={<Users size={13} />}
    onClick={() => setLineupTournamentId(t.id)}
  >
    {t.lineup?.length ? `Muokkaa kokoonpanoa (${t.lineup.length})` : 'Lisää kokoonpano'}
  </Button>
</div>
```

Huom: korvaa olemassa oleva `<div className="pt-1">` + sen sisältö tällä uudella versiolla.

- [ ] **Step 5: Renderöi TournamentLineupModal**

Lisää komponenttipuun loppuun (ennen viimeistä sulkevaa `</div>`, muiden modaalien kuten `confirmDeleteTournamentId`-modaalin viereen):

```tsx
{lineupTournamentId && (() => {
  const lt = tournaments.find((x) => x.id === lineupTournamentId);
  if (!lt) return null;
  return (
    <TournamentLineupModal
      initialLineup={lt.lineup ?? []}
      ownTeamId={lt.ownTeamId}
      onSave={(ids) => {
        updateTournament(lineupTournamentId, { lineup: ids });
        setLineupTournamentId(null);
      }}
      onClose={() => setLineupTournamentId(null)}
    />
  );
})()}
```

- [ ] **Step 6: Varmista build**

```bash
npm run build 2>&1 | grep -E "error TS|✓ built"
```

Odotettu: `✓ built in X.XXs`

- [ ] **Step 7: Testaa selaimessa kaikki skenaariot**

```bash
npm run dev
```

- Turnaukset → luo turnaus ilman kokoonpanoa → laajenna → "Kokoonpano puuttuu" -varoitus näkyy
- Klikkaa "Lisää kokoonpano" → modaali avautuu kaikkien aktiivisten pelaajien kanssa
- Valitse pelaajia → tallenna → varoitus katoaa, nappi muuttuu "Muokkaa kokoonpanoa (X)"
- Avaa uudelleen "Muokkaa kokoonpanoa" → aiemmin valitut ovat esivalittuna
- Luo turnaus johon on valittu Taso 1 -joukkue → "Lisää kokoonpano" → vain Taso 1 -pelaajat näkyvät

- [ ] **Step 8: Commit**

```bash
git add src/pages/Matches.tsx
git commit -m "feat: lisää kokoonpanon hallinta ja puuttuu-indikaattori turnauslistaukseen"
```

---

### Task 5: Lint-tarkistus

- [ ] **Step 1: Aja lint**

```bash
npm run lint 2>&1 | grep -E "error|✖"
```

Odotettu: 0 virheitä (varoitukset pre-existing ovat ok).

- [ ] **Step 2: Lopullinen build**

```bash
npm run build 2>&1 | grep -E "error TS|✓ built"
```

Odotettu: `✓ built in X.XXs`

- [ ] **Step 3: Valmis**

Haara `feature/tournament-lineup` on valmis mergettäväksi.
