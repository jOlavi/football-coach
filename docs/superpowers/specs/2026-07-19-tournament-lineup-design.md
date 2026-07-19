# Design: Turnauksen kokoonpanon hallinta

**Päivämäärä:** 2026-07-19
**Haara:** feature/tournament-lineup (luodaan main-haarasta)

---

## Tavoite

Käyttäjä voi lisätä pelaajat turnaukseen sekä luonnin yhteydessä että jälkikäteen. Turnauslistauksessa näkyy "Kokoonpano puuttuu" -indikaattori ja hallinnointipainike.

---

## Tietomalli

### `src/types/index.ts` — Tournament-interface

Lisätään yksi kenttä:

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
  lineup?: string[];   // ← UUSI: pelaaja-ID:t
  matches: TournamentMatch[];
  createdAt: string;
}
```

`lineup` on optional — olemassa oleva data ei hajoa. `useTournamentStore.updateTournament` osaa jo tallentaa osittaiset päivitykset, ei store-muutoksia tarvita.

---

## Uusi komponentti: `TournamentLineupModal`

**Tiedosto:** `src/components/matches/TournamentLineupModal.tsx`

### Props

```ts
interface Props {
  initialLineup: string[];            // nykyinen valinta ([] jos ei asetettu)
  ownTeamId?: string;                 // pelaajien suodatus tiimitason mukaan
  onSave: (lineup: string[]) => void; // callback — kutsuja päättää mitä tehdään
  onClose: () => void;
}
```

### Toiminta

- Lukee pelaajat `usePlayerStore` — näyttää vain `active === true` pelaajat
- Jos `ownTeamId` on asetettu, hae joukkue `useTeamStore`:sta ja suodata `OwnTeam.level`:n perusteella:
  - `taso1` → `skillLevel === 1 || skillLevel === 3`
  - `taso2` → `skillLevel === 2 || skillLevel === 3`
  - muuten kaikki aktiiviset
- Sisäinen tila: `selected: Set<string>`, alustetaan `initialLineup`:sta
- Klikkaus toggleaa pelaajan sisään/ulos

### Ulkoasu

- `<Modal title="Kokoonpano" onClose={onClose}>` — käyttää olemassa olevaa Modal-komponenttia
- Otsikkorivin alapuolella: `"Valittu X / Y pelaajaa"` (pieni teksti, harmaa)
- Pelaajagrid: `grid grid-cols-2 sm:grid-cols-3 gap-2`
- Pelaaja-kortti:
  - Valitsematon: `bg-white border border-gray-200 rounded-xl px-3 py-2.5`
  - Valittu: `bg-green-50 border-green-400 rounded-xl px-3 py-2.5`
  - Sisältö: numero-badge (pyöreä, brand-väri) + pelaajan nimi (truncate)
  - Valittu-tila: pieni vihreä checkmark oikeassa yläkulmassa
- Footer: `Peruuta` + `Tallenna (X)` -napit

---

## Muutos: `TournamentFormModal`

**Tiedosto:** `src/components/matches/TournamentFormModal.tsx`

- Lisää `lineup: string[]` draft-stateen (`useState<string[]>`)
- Editointitilassa alustetaan `editing.lineup ?? []`
- Lisää tila: `showLineupModal: boolean`
- Lomakkeen alaosaan (ennen Muistiinpanot-kenttää tai sen jälkeen, ennen Tallenna-nappeja):

```tsx
<div>
  <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Kokoonpano</p>
  <Button variant="secondary" size="sm" onClick={() => setShowLineupModal(true)}>
    {lineup.length > 0 ? `Muokkaa kokoonpanoa (${lineup.length})` : 'Lisää kokoonpano'}
  </Button>
</div>
```

- `handleSave()` välittää `lineup` mukaan: `addTournament({ ...draft, lineup, matches: ... })`
- `TournamentLineupModal` renderöidään modaalin sisään (sisäkkäinen modaali):

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

---

## Muutos: `Matches.tsx` — turnausrivin laajennettu näkymä

**Tiedosto:** `src/pages/Matches.tsx`

Laajennetun turnausrivin body-osioon (`.bg-gray-50` -div, jossa jo "Lisää ottelu" -nappi):

### 1. "Kokoonpano puuttuu" -indikaattori

Renderöidään kun `!t.lineup?.length`:

```tsx
{!t.lineup?.length && (
  <div className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2.5">
    <Users size={16} className="text-yellow-600 flex-shrink-0" />
    <div>
      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Kokoonpano puuttuu</p>
      <p className="text-xs text-yellow-600 dark:text-yellow-400">Lisää pelaajat turnaukseen</p>
    </div>
  </div>
)}
```

### 2. Kokoonpanon hallintapainike

Aina näkyvissä laajennettuna (kokoonpanon yli tai alla):

```tsx
<div className="flex items-center gap-3 flex-wrap">
  <Button
    variant="secondary"
    size="sm"
    icon={<Users size={13} />}
    onClick={() => setLineupTournamentId(t.id)}
  >
    {t.lineup?.length
      ? `Muokkaa kokoonpanoa (${t.lineup.length})`
      : 'Lisää kokoonpano'}
  </Button>
</div>
```

### 3. State ja modaali

- Lisää state: `lineupTournamentId: string | null`
- Renderöi `TournamentLineupModal` kun `lineupTournamentId` on asetettu:

```tsx
{lineupTournamentId && (() => {
  const t = tournaments.find((x) => x.id === lineupTournamentId);
  if (!t) return null;
  return (
    <TournamentLineupModal
      initialLineup={t.lineup ?? []}
      ownTeamId={t.ownTeamId}
      onSave={(ids) => {
        updateTournament(lineupTournamentId, { lineup: ids });
        setLineupTournamentId(null);
      }}
      onClose={() => setLineupTournamentId(null)}
    />
  );
})()}
```

---

## Ei-kuulu-scopeen

- Saatavuuden merkitseminen per pelaaja turnauksessa (vain valinta: mukana / ei mukana)
- Kokoonpanon näyttäminen turnauksen otteluissa erikseen
- PDF-tulostus turnauskokoonpanosta

---

## Testattavaa

1. Uusi turnaus → "Lisää kokoonpano" avaa modaalin → valitaan pelaajat → tallennetaan → listalla näkyy "Kokoonpano (X pelaajaa)"
2. Turnauksen muokkaus → olemassa oleva kokoonpano esivalittu modaalissa
3. Turnauslista → laajennettu turnaus ilman kokoonpanoa → "Kokoonpano puuttuu" -varoitus näkyy
4. Turnauslista → "Lisää kokoonpano" → valitaan pelaajat → tallennetaan → varoitus katoaa
5. Turnaus jonka `ownTeamId` osoittaa Taso 1 -joukkueeseen → modaalissa vain taso 1 -pelaajat
6. Turnaus ilman joukkuetta → modaalissa kaikki aktiiviset pelaajat
