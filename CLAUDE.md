# Football Coach — CLAUDE.md

Jalkapallovalmentajan web-työkalu. React-pohjainen kojelauta nuorisojoukkueiden valmentajille.

## Kehityskomennot

```bash
npm run dev       # Kehityspalvelin (http://localhost:5173)
npm run build     # Tuotantokäännös (tsc + vite)
npm run lint      # ESLint-tarkistus
npm run preview   # Esikatsele tuotantokäännöstä
```

> **Node-versio:** v20.10.0 — käytä Vite 5:ttä (ei uusinta). Vite 9+ vaatii Node ≥ 20.19.

## Teknologiapino

| Kerros | Teknologia |
|---|---|
| UI-framework | React 18 + TypeScript |
| Bundler | Vite 5 |
| Tyylittely | Tailwind CSS v3 |
| Tila | Zustand 5 + `persist` (localStorage) |
| Reititys | React Router v7 |
| Kaaviot | Recharts |
| Ikonit | lucide-react |
| Päivämäärät | date-fns |
| PDF | Selaimen `window.print()` uudessa välilehdessä |

**Ei backendiä** — kaikki data tallennetaan localStorageen. Yhteyskatkot tai usean laitteen synkronointi eivät ole tuettuja.

## Hakemistorakenne

```
src/
  types/index.ts          # Kaikki TypeScript-tyypit
  store/
    usePlayerStore.ts     # Pelaajat (Zustand + persist)
    useMatchStore.ts      # Ottelut (Zustand + persist)
    useTrainingStore.ts   # Harjoitukset (Zustand + persist) — addSession, updateSession, deleteSession, getSession
    useExerciseStore.ts   # Oma harjoitekirjasto (Zustand + persist)
    useSettingsStore.ts   # Sovelluksen asetukset (Zustand + persist)
  utils/
    stats.ts              # Tilastolaskennat (maalit, osallistuminen jne.)
    teamGenerator.ts      # generateBalancedTeams, generateNGroups (randomize-parametri), getMatchCountsForPlayers
    messageTemplates.ts   # Viestipohjat vanhemmille
    seedData.ts           # 24 demo-pelaajaa (etunimet, p1–p24) ja 5 ottelua
  components/
    layout/
      Sidebar.tsx         # Vasen navigaatio
      Layout.tsx          # Sivupalkki + header + <Outlet>; dynaamiset reittiotsikot (mm. /training/:id/edit)
    ui/
      Card.tsx            # Card + StatCard
      Button.tsx          # Variantit: primary/secondary/danger/ghost
      Badge.tsx           # Värilliset merkintäpillerit
      Modal.tsx           # Overlay-modaali
      Input.tsx           # Input, Select, Textarea
    matchplanning/
      PlayerCard.tsx      # Pelaaja-kortti saatavuus- ja kokoonpanonäkymään
  pages/
    Dashboard.tsx         # Etusivu — tilastokortit, tulevat ottelut, muistutukset
    Players.tsx           # Pelaajahallinta — kortit/lista-vaihto, lisää/muokkaa
    Matches.tsx           # Otteluhallinta — tulevat + tulokset, tuloskirjaus
    MatchPlanning.tsx     # Saatavuus + kokoonpanon valinta per ottelu; korttimainen otteluvalitsin
    TeamGenerator.tsx     # Tasapainoinen joukkuegeneraattori (5v5/7v7/11v11)
    Statistics.tsx        # Kaaviot — maalit, tulokset, esiintymiset, maalitykkit
    Training.tsx          # Harjoitussuunnitelmaluettelo + PDF-tulostus + harjoitekirjasto
    TrainingBuilder.tsx   # Harjoitussuunnitelman luonti/muokkaus (oma sivu, ei overlay)
    NewDrillPage.tsx      # Taktisen harjoitteen luonti/muokkaus — kanvas + metatiedot; tunnistaa muokkaustilan :id-parametrilla
    Communication.tsx     # Viestipohjat vanhemmille, automaattitäyttö
    Reminders.tsx         # Automaattiset muistutukset (kokoonpano jne.)
    Settings.tsx          # Sovelluksen asetukset
```

## Reitit (App.tsx)

```
/                     → Dashboard
/players              → Players
/matches              → Matches
/planning             → MatchPlanning
/statistics           → Statistics
/training             → Training
/training/new         → TrainingBuilder (uusi)
/training/:id/edit    → TrainingBuilder (muokkaus — lataa olemassa olevan session)
/training/new-drill             → NewDrillPage (uusi harjoite)
/training/drills/:id/edit       → NewDrillPage (muokkaus — lataa olemassa olevan harjoitteen)
/communication        → Communication
/reminders            → Reminders
/settings             → Settings
```

## Tietomalli (tärkeimmät tyypit)

```typescript
Player {
  id, name, number, position, skillLevel(1–5),
  dateOfBirth, parentName, parentContact,
  active, createdAt
  // registrationComplete poistettu
}

Match {
  id, date, opponent, level, location, venue,
  format?, lineup[], availability[], lineupConfirmed?, result?, notes, createdAt
}

TrainingSession {
  id, date, startTime?, title, duration,
  exercises[], notes, groupSets?, createdAt
}

Exercise { id, name, category, duration, description, goals?, tags?, playerCount? }

Drill {
  id, name, description, goals, duration, repetitions,
  fieldType: FieldType, canvasDataUrl: string, shapes: Shape[], createdAt
  // shapes: Shape[] — tallennettu kanvaksen tila; mahdollistaa harjoitteen muokkauksen
  // canvasDataUrl — PNG-esikatselukuva kirjastoa varten
}

GroupSet {
  id, label, playerIds[][], groupNames[],
  playerColors?: Record<string, string>   // pelaajan värimerkintä (red/yellow/green/blue)
}
```

Kaikki tyypit löytyvät tiedostosta `src/types/index.ts`.

## TrainingBuilder — tärkeät yksityiskohdat

- Käyttää `useParams<{ id? }>()` — jos `id` on annettu, lataa session `getSession(id)` ja tallentaa `updateSession`-funktiolla
- `GroupSetDraft`-rajapinta sisältää `movedPlayerIds: Set<string>` ja `playerColors: Record<string, string>` (ei tallennu storeen sellaisenaan)
- `sessionPlayerIds` — yhteinen pelaajapohja kaikille ryhmäjaoille
- Harjoitejärjestystä voi muuttaa ylös/alas-painikkeilla ja raahaamalla (HTML5 drag-and-drop, `dataTransfer`)
- Keston valintalista (45–120 min) tai manuaalinen syöttö; loppuaika lasketaan `addMinutes(startTime, duration)`
- Lyhytnimet ryhmissä: `shortName(name)` → "Etunimi S."

## Arkkitehtuuriperiaatteet

- **Ei backendiä** — uusi toiminnallisuus käyttää localStoragea Zustand `persist`-middlewaren kautta
- **Uusi sivu** → lisää Zustand-store (tarvittaessa) + sivukomponentti + reitti `App.tsx`-tiedostoon + otsikko `Layout.tsx`-tiedostoon
- **Kieli on suomi** — kaikki käyttöliittymätekstit kirjoitetaan suomeksi
- **Yksinkertaisuus ensin** — kohdeyleisö on nuorisojoukkueiden valmentajat kentän laidalla, ei kehittäjät
- **Zustand-selektorit**: älä käytä `.filter()` suoraan selektorissa — se luo uuden viitteen joka renderöinnissä → käytä `useMemo`

## UI-käytännöt

- Käytä `<Card>` / `<StatCard>` korttisisältöön
- Käytä `<Button variant="...">` — älä käytä tavallisia `<button>`-elementtejä toimintopainikkeissa
- Käytä `<Badge>` tila-indikaattoreihin (pelipaikka, taso jne.)
- Modaalit: `<Modal title="..." onClose={...}>` — laaja-modaali: `wide` prop
- Lomakekentät: `<Input>`, `<Select>`, `<Textarea>` — kaikki tukevat `label` ja `error` propeja
- Värimaailma: `brand-600` = pääväri (vihreä), Tailwindin vakiovärit muuhun
- Kuvakkeet: lucide-react, koko `size={15–18}` painikkeissa, `size={18}` tilastokorteissa

## Demo-data

`src/utils/seedData.ts` sisältää 24 pelaajaa (etunimet: Aaro, Allan, Alva … Patrik, ID:t p1–p24) ja 5 ottelua. Data ladataan `App.tsx`:n `SeedLoader`-komponentissa **vain jos store on tyhjä**. Koska data on localStoragessa, uusi seed-data näkyy vain tyhjentämällä localStorage tai käyttämällä uutta selainta.

## Tunnetut rajoitukset / TODO

- [ ] Firebase-backend monilaitteistukea varten
- [ ] WhatsApp/SMS-integraatio viestintäsivulle
- [ ] Kausiarkisto (useat kaudet / joukkueet)
- [ ] PWA-tuki mobiililaitteille
