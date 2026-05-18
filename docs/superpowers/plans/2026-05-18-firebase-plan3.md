# Firebase Plan 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Firestore nested array errors, add Firebase Storage for drill images, write user profiles on login, and add coach management UI to Settings.

**Architecture:** Four sequential tasks. Task 1 (nested arrays fix) unblocks correct Firestore writes. Task 2 extends drill saving with async Storage image upload. Task 3 writes user profiles on login so coach names are available. Task 4 adds coach management UI in Settings using existing invitation infrastructure.

**Tech Stack:** Firebase 10.x (Firestore, Storage), React 18 + TypeScript + Zustand 5, Vite 5, Tailwind CSS v3.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/firestore/serialize.ts` | Create | serialize/deserialize sessions and drills for Firestore |
| `src/lib/firestore/teamData.ts` | Modify | remove generic constraint so serialized objects can be passed |
| `src/lib/firestore/userData.ts` | Modify | same + add getCoachProfiles |
| `src/store/useTrainingStore.ts` | Modify | wrap writes with serializeSession |
| `src/store/useDrillStore.ts` | Modify | wrap writes with serializeDrill + image upload |
| `src/components/data/DataLoader.tsx` | Modify | deserialize sessions and drills after fetching |
| `src/lib/migration.ts` | Modify | serialize sessions and drills in runMigration |
| `storage.rules` | Create | Firebase Storage security rules |
| `firebase.json` | Modify | add storage emulator on port 9199 |
| `src/lib/storage.ts` | Create | uploadDrillImage utility |
| `src/types/index.ts` | Modify | add imageUrl?: string to Drill |
| `src/pages/Training.tsx` | Modify | use imageUrl \|\| canvasDataUrl for drill thumbnails |
| `src/components/auth/AuthProvider.tsx` | Modify | write user profile to Firestore on login |
| `src/pages/Settings.tsx` | Modify | add Valmentajat coach management section |

---

## Task 1: Nested Arrays Serialization

Firestore rejects `string[][]` (GroupSet.playerIds) and `[number,number][]` (arrow shape points). Fix by JSON-stringifying the affected fields before Firestore writes and parsing on reads.

**Files:**
- Create: `src/lib/firestore/serialize.ts`
- Modify: `src/lib/firestore/teamData.ts`
- Modify: `src/lib/firestore/userData.ts`
- Modify: `src/store/useTrainingStore.ts`
- Modify: `src/store/useDrillStore.ts`
- Modify: `src/components/data/DataLoader.tsx`
- Modify: `src/lib/migration.ts`

- [ ] **Step 1: Create serialize.ts**

Create `src/lib/firestore/serialize.ts` with this exact content:

```typescript
import type { TrainingSession, Drill } from '../../types';

export function serializeSession(s: TrainingSession): { id: string } & Record<string, unknown> {
  const { groupSets, ...rest } = s;
  return {
    ...rest,
    groupSetsJson: groupSets != null ? JSON.stringify(groupSets) : null,
  };
}

export function deserializeSession(data: Record<string, unknown>): TrainingSession {
  const { groupSetsJson, ...rest } = data as { groupSetsJson?: string | null } & Record<string, unknown>;
  return {
    ...rest,
    groupSets: groupSetsJson ? JSON.parse(groupSetsJson) : undefined,
  } as TrainingSession;
}

export function serializeDrill(d: Drill): { id: string } & Record<string, unknown> {
  const { shapes, canvasDataUrl, ...rest } = d;
  return {
    ...rest,
    shapesJson: JSON.stringify(shapes),
  };
}

export function deserializeDrill(data: Record<string, unknown>): Drill {
  const { shapesJson, ...rest } = data as { shapesJson?: string } & Record<string, unknown>;
  return {
    ...rest,
    shapes: shapesJson ? JSON.parse(shapesJson) : [],
    canvasDataUrl: '',
  } as Drill;
}
```

- [ ] **Step 2: Update teamData.ts to accept serialized objects**

Replace `src/lib/firestore/teamData.ts` entirely:

```typescript
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function getSubcollection<T>(
  teamId: string,
  sub: string
): Promise<T[]> {
  const snap = await getDocs(collection(db, 'teams', teamId, sub));
  return snap.docs.map((d) => d.data() as T);
}

export function writeTeamDoc(
  teamId: string,
  sub: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: { id: string } & Record<string, any>
): void {
  setDoc(doc(db, 'teams', teamId, sub, data.id), data).catch(console.error);
}

export function removeTeamDoc(
  teamId: string,
  sub: string,
  id: string
): void {
  deleteDoc(doc(db, 'teams', teamId, sub, id)).catch(console.error);
}
```

- [ ] **Step 3: Update userData.ts to accept serialized objects**

Replace the `writeUserDoc` function signature in `src/lib/firestore/userData.ts`:

```typescript
import { collection, doc, getDocs, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';

export async function getUserSubcollection<T>(
  userId: string,
  sport: string,
  sub: string
): Promise<T[]> {
  const snap = await getDocs(
    collection(db, 'users', userId, 'sports', sport, sub)
  );
  return snap.docs.map((d) => d.data() as T);
}

export function writeUserDoc(
  userId: string,
  sport: string,
  sub: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: { id: string } & Record<string, any>
): void {
  setDoc(doc(db, 'users', userId, 'sports', sport, sub, data.id), data).catch(
    console.error
  );
}

export function removeUserDoc(
  userId: string,
  sport: string,
  sub: string,
  id: string
): void {
  deleteDoc(doc(db, 'users', userId, 'sports', sport, sub, id)).catch(
    console.error
  );
}

export function getActiveSport(): string {
  const { teams } = useAuthStore.getState();
  const { activeTeamId } = useAppStore.getState();
  return teams.find((t) => t.id === activeTeamId)?.sport ?? 'football';
}
```

- [ ] **Step 4: Update useTrainingStore.ts to serialize before writes**

Replace `src/store/useTrainingStore.ts` entirely:

```typescript
import { create } from 'zustand';
import type { TrainingSession } from '../types';
import { useAppStore } from './useAppStore';
import { writeTeamDoc, removeTeamDoc } from '../lib/firestore/teamData';
import { serializeSession } from '../lib/firestore/serialize';

interface TrainingStore {
  sessions: TrainingSession[];
  setAll: (sessions: TrainingSession[]) => void;
  addSession: (session: TrainingSession) => void;
  updateSession: (id: string, updates: Partial<TrainingSession>) => void;
  deleteSession: (id: string) => void;
  getSession: (id: string) => TrainingSession | undefined;
}

export const useTrainingStore = create<TrainingStore>()((set, get) => ({
  sessions: [],
  setAll: (sessions) => set({ sessions }),
  addSession: (session) => {
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) writeTeamDoc(activeTeamId, 'trainingSessions', serializeSession(session));
    set((s) => ({ sessions: [...s.sessions, session] }));
  },
  updateSession: (id, updates) => {
    const session = get().sessions.find((t) => t.id === id);
    if (!session) return;
    const updated = { ...session, ...updates };
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) writeTeamDoc(activeTeamId, 'trainingSessions', serializeSession(updated));
    set((s) => ({ sessions: s.sessions.map((t) => (t.id === id ? updated : t)) }));
  },
  deleteSession: (id) => {
    const { activeTeamId } = useAppStore.getState();
    if (activeTeamId) removeTeamDoc(activeTeamId, 'trainingSessions', id);
    set((s) => ({ sessions: s.sessions.filter((t) => t.id !== id) }));
  },
  getSession: (id) => get().sessions.find((t) => t.id === id),
}));
```

- [ ] **Step 5: Update useDrillStore.ts to serialize before writes**

Replace `src/store/useDrillStore.ts` entirely (image upload will be added in Task 2; for now just add serialization):

```typescript
import { create } from 'zustand';
import type { Drill } from '../types';
import { useAuthStore } from './useAuthStore';
import { writeUserDoc, removeUserDoc, getActiveSport } from '../lib/firestore/userData';
import { serializeDrill } from '../lib/firestore/serialize';

interface DrillStore {
  drills: Drill[];
  setAll: (drills: Drill[]) => void;
  addDrill: (drill: Drill) => void;
  updateDrill: (id: string, patch: Partial<Omit<Drill, 'id' | 'createdAt'>>) => void;
  deleteDrill: (id: string) => void;
}

export const useDrillStore = create<DrillStore>()((set, get) => ({
  drills: [],
  setAll: (drills) => set({ drills }),
  addDrill: (drill) => {
    const { user } = useAuthStore.getState();
    const sport = getActiveSport();
    if (user) writeUserDoc(user.uid, sport, 'drills', serializeDrill(drill));
    set((s) => ({ drills: [...s.drills, drill] }));
  },
  updateDrill: (id, patch) => {
    const drill = get().drills.find((d) => d.id === id);
    if (!drill) return;
    const updated = { ...drill, ...patch };
    const { user } = useAuthStore.getState();
    const sport = getActiveSport();
    if (user) writeUserDoc(user.uid, sport, 'drills', serializeDrill(updated));
    set((s) => ({ drills: s.drills.map((d) => (d.id === id ? updated : d)) }));
  },
  deleteDrill: (id) => {
    const { user } = useAuthStore.getState();
    const sport = getActiveSport();
    if (user) removeUserDoc(user.uid, sport, 'drills', id);
    set((s) => ({ drills: s.drills.filter((d) => d.id !== id) }));
  },
}));
```

- [ ] **Step 6: Update DataLoader.tsx to deserialize on read**

Replace the `Promise.all` block and subsequent `setAll` calls in `src/components/data/DataLoader.tsx`. The full file:

```typescript
import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useMatchStore } from '../../store/useMatchStore';
import { useTeamStore } from '../../store/useTeamStore';
import { useTrainingStore } from '../../store/useTrainingStore';
import { useExerciseStore } from '../../store/useExerciseStore';
import { useDrillStore } from '../../store/useDrillStore';
import { getSubcollection } from '../../lib/firestore/teamData';
import { getUserSubcollection } from '../../lib/firestore/userData';
import { deserializeSession, deserializeDrill } from '../../lib/firestore/serialize';
import { runMigration, runSeed } from '../../lib/migration';
import type { Player, Match, OwnTeam, Exercise } from '../../types';

function clearAllStores() {
  usePlayerStore.getState().setAll([]);
  useMatchStore.getState().setAll([]);
  useTeamStore.getState().setAll([]);
  useTrainingStore.getState().setAll([]);
  useExerciseStore.getState().setAll([]);
  useDrillStore.getState().setAll([]);
}

export function DataLoader() {
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  const user = useAuthStore((s) => s.user);
  const teams = useAuthStore((s) => s.teams);

  useEffect(() => {
    if (!activeTeamId || !user) {
      clearAllStores();
      return;
    }

    const teamId = activeTeamId;
    const uid = user.uid;
    const sport = teams.find((t) => t.id === teamId)?.sport ?? 'football';

    async function loadData() {
      clearAllStores();

      const { pendingImport, setPendingImport } = useAppStore.getState();
      if (pendingImport === 'migrate') {
        await runMigration(teamId, uid, sport);
        setPendingImport(null);
      } else if (pendingImport === 'seed') {
        await runSeed(teamId, uid, sport);
        setPendingImport(null);
      }

      const [players, matches, ownTeams, rawSessions, exercises, rawDrills] =
        await Promise.all([
          getSubcollection<Player>(teamId, 'players'),
          getSubcollection<Match>(teamId, 'matches'),
          getSubcollection<OwnTeam>(teamId, 'ownTeams'),
          getSubcollection<Record<string, unknown>>(teamId, 'trainingSessions'),
          getUserSubcollection<Exercise>(uid, sport, 'exercises'),
          getUserSubcollection<Record<string, unknown>>(uid, sport, 'drills'),
        ]);

      usePlayerStore.getState().setAll(players);
      useMatchStore.getState().setAll(matches);
      useTeamStore.getState().setAll(ownTeams);
      useTrainingStore.getState().setAll(rawSessions.map(deserializeSession));
      useExerciseStore.getState().setAll(exercises);
      useDrillStore.getState().setAll(rawDrills.map(deserializeDrill));
    }

    loadData().catch(console.error);
  }, [activeTeamId, user?.uid, teams]);

  return null;
}
```

- [ ] **Step 7: Update migration.ts to serialize sessions and drills**

Replace `src/lib/migration.ts` entirely:

```typescript
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SEED_PLAYERS, SEED_TEAMS, SEED_MATCHES } from '../utils/seedData';
import { serializeSession, serializeDrill } from './firestore/serialize';
import type { Player, Match, OwnTeam, TrainingSession, Exercise, Drill } from '../types';

export interface LocalStorageSnapshot {
  players: Player[];
  matches: Match[];
  ownTeams: OwnTeam[];
  sessions: TrainingSession[];
  exercises: Exercise[];
  drills: Drill[];
}

function readStore<T>(key: string, field: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed?.state?.[field] ?? [];
  } catch {
    return [];
  }
}

export function readLocalStorageSnapshot(): LocalStorageSnapshot {
  return {
    players: readStore<Player>('football-players', 'players'),
    matches: readStore<Match>('football-matches', 'matches'),
    ownTeams: readStore<OwnTeam>('football-teams', 'teams'),
    sessions: readStore<TrainingSession>('football-training', 'sessions'),
    exercises: readStore<Exercise>('football-exercises', 'exercises'),
    drills: readStore<Drill>('drill-store', 'drills'),
  };
}

export function hasLocalStorageData(): boolean {
  const snap = readLocalStorageSnapshot();
  return snap.players.length > 0 || snap.matches.length > 0;
}

export async function runMigration(
  teamId: string,
  userId: string,
  sport: string
): Promise<void> {
  const snap = readLocalStorageSnapshot();
  const writes: Promise<void>[] = [];

  snap.players.forEach((p) =>
    writes.push(setDoc(doc(db, 'teams', teamId, 'players', p.id), p))
  );
  snap.matches.forEach((m) =>
    writes.push(setDoc(doc(db, 'teams', teamId, 'matches', m.id), m))
  );
  snap.ownTeams.forEach((t) =>
    writes.push(setDoc(doc(db, 'teams', teamId, 'ownTeams', t.id), t))
  );
  snap.sessions.forEach((s) =>
    writes.push(setDoc(doc(db, 'teams', teamId, 'trainingSessions', s.id), serializeSession(s)))
  );
  snap.exercises.forEach((e) =>
    writes.push(setDoc(doc(db, 'users', userId, 'sports', sport, 'exercises', e.id), e))
  );
  snap.drills.forEach((d) =>
    writes.push(setDoc(doc(db, 'users', userId, 'sports', sport, 'drills', d.id), serializeDrill(d)))
  );

  await Promise.all(writes);
}

export async function runSeed(
  teamId: string,
  _userId: string,
  _sport: string
): Promise<void> {
  const writes: Promise<void>[] = [];

  SEED_PLAYERS.forEach((p) =>
    writes.push(setDoc(doc(db, 'teams', teamId, 'players', p.id), p))
  );
  SEED_TEAMS.forEach((t) =>
    writes.push(setDoc(doc(db, 'teams', teamId, 'ownTeams', t.id), t))
  );
  SEED_MATCHES.forEach((m) =>
    writes.push(setDoc(doc(db, 'teams', teamId, 'matches', m.id), m))
  );

  await Promise.all(writes);
}
```

- [ ] **Step 8: Build and verify**

```bash
npm run build
```

Expected: no TypeScript errors. If you see errors about `setDoc` argument types in `migration.ts`, add `as any` cast: `setDoc(ref, serializeSession(s) as any)`.

- [ ] **Step 9: Manual test — create a training session with groups**

Start the emulator and dev server, log in, create a team, go to Training → create a new session → add a group set with players. Save. Check the Firestore emulator UI at `http://127.0.0.1:4000/firestore` — the session document should have `groupSetsJson` field (a JSON string) instead of `groupSets`.

- [ ] **Step 10: Commit**

```bash
git add src/lib/firestore/serialize.ts src/lib/firestore/teamData.ts src/lib/firestore/userData.ts src/store/useTrainingStore.ts src/store/useDrillStore.ts src/components/data/DataLoader.tsx src/lib/migration.ts
git commit -m "fix: serialize nested arrays before Firestore writes

GroupSet.playerIds (string[][]) and Drill shapes (arrow points) are
nested arrays which Firestore rejects. Serialize groupSets and shapes
as JSON strings before writing, deserialize on read.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Firebase Storage for Drill Images

Upload drill canvas images to Firebase Storage after saving. Display stored images as thumbnails in the drill library.

**Files:**
- Create: `storage.rules`
- Modify: `firebase.json`
- Create: `src/lib/storage.ts`
- Modify: `src/types/index.ts`
- Modify: `src/store/useDrillStore.ts`
- Modify: `src/pages/Training.tsx`

- [ ] **Step 1: Create storage.rules**

Create `storage.rules` in the project root:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /drills/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

- [ ] **Step 2: Add storage emulator to firebase.json**

Replace `firebase.json` entirely:

```json
{
  "firestore": {
    "database": "(default)",
    "location": "europe-north1",
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true
    },
    "singleProjectMode": true
  }
}
```

- [ ] **Step 3: Restart the emulator**

Stop the current emulator with Ctrl+C (this exports data), then restart:

```bash
npx firebase emulators:start --import ./emulator-data --export-on-exit ./emulator-data
```

The Emulator UI at `http://127.0.0.1:4000` should now show a Storage tab.

- [ ] **Step 4: Create src/lib/storage.ts**

```typescript
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadDrillImage(
  userId: string,
  drillId: string,
  dataUrl: string
): Promise<string> {
  const storageRef = ref(storage, `drills/${userId}/${drillId}.png`);
  await uploadString(storageRef, dataUrl, 'data_url');
  return getDownloadURL(storageRef);
}
```

- [ ] **Step 5: Add imageUrl to Drill type**

In `src/types/index.ts`, add `imageUrl?: string` to the `Drill` interface:

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
  shapes: Shape[];
  tags?: string[];
  imageUrl?: string;
  createdAt: string;
}
```

- [ ] **Step 6: Update useDrillStore.ts to upload image after write**

Replace `src/store/useDrillStore.ts` entirely:

```typescript
import { create } from 'zustand';
import type { Drill } from '../types';
import { useAuthStore } from './useAuthStore';
import { writeUserDoc, removeUserDoc, getActiveSport } from '../lib/firestore/userData';
import { serializeDrill } from '../lib/firestore/serialize';
import { uploadDrillImage } from '../lib/storage';

interface DrillStore {
  drills: Drill[];
  setAll: (drills: Drill[]) => void;
  addDrill: (drill: Drill) => void;
  updateDrill: (id: string, patch: Partial<Omit<Drill, 'id' | 'createdAt'>>) => void;
  deleteDrill: (id: string) => void;
}

export const useDrillStore = create<DrillStore>()((set, get) => ({
  drills: [],
  setAll: (drills) => set({ drills }),
  addDrill: (drill) => {
    const { user } = useAuthStore.getState();
    const sport = getActiveSport();
    if (user) {
      writeUserDoc(user.uid, sport, 'drills', serializeDrill(drill));
      if (drill.canvasDataUrl) {
        const uid = user.uid;
        uploadDrillImage(uid, drill.id, drill.canvasDataUrl)
          .then((imageUrl) => {
            writeUserDoc(uid, sport, 'drills', serializeDrill({ ...drill, imageUrl }));
            set((s) => ({
              drills: s.drills.map((d) => (d.id === drill.id ? { ...d, imageUrl } : d)),
            }));
          })
          .catch(console.error);
      }
    }
    set((s) => ({ drills: [...s.drills, drill] }));
  },
  updateDrill: (id, patch) => {
    const drill = get().drills.find((d) => d.id === id);
    if (!drill) return;
    const updated = { ...drill, ...patch };
    const { user } = useAuthStore.getState();
    const sport = getActiveSport();
    if (user) {
      writeUserDoc(user.uid, sport, 'drills', serializeDrill(updated));
      if (patch.canvasDataUrl) {
        const uid = user.uid;
        uploadDrillImage(uid, id, patch.canvasDataUrl)
          .then((imageUrl) => {
            writeUserDoc(uid, sport, 'drills', serializeDrill({ ...updated, imageUrl }));
            set((s) => ({
              drills: s.drills.map((d) => (d.id === id ? { ...d, imageUrl } : d)),
            }));
          })
          .catch(console.error);
      }
    }
    set((s) => ({ drills: s.drills.map((d) => (d.id === id ? updated : d)) }));
  },
  deleteDrill: (id) => {
    const { user } = useAuthStore.getState();
    const sport = getActiveSport();
    if (user) removeUserDoc(user.uid, sport, 'drills', id);
    set((s) => ({ drills: s.drills.filter((d) => d.id !== id) }));
  },
}));
```

- [ ] **Step 7: Update Training.tsx drill thumbnails to use imageUrl**

In `src/pages/Training.tsx`, find the drill card image at approximately line 471 (inside the `drills.map` block) and replace:

```tsx
<img
  src={d.canvasDataUrl}
  alt={d.name}
  className="w-full aspect-video object-cover"
/>
```

With:

```tsx
{(d.imageUrl || d.canvasDataUrl) ? (
  <img
    src={d.imageUrl || d.canvasDataUrl}
    alt={d.name}
    className="w-full aspect-video object-cover"
  />
) : (
  <div className="w-full aspect-video bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
    <BookOpen size={24} className="text-gray-300 dark:text-slate-600" />
  </div>
)}
```

`BookOpen` is already imported at the top of `Training.tsx`.

Also find the preview modal image at approximately line 906 and replace:

```tsx
src={previewDrill.canvasDataUrl}
```

With:

```tsx
src={previewDrill.imageUrl || previewDrill.canvasDataUrl}
```

- [ ] **Step 8: Build and verify**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 9: Manual test — save a drill and check Storage**

In the app: go to Training → create a new tactical drill, draw something on the canvas, save. After saving, wait 2-3 seconds for the image upload. Check `http://127.0.0.1:4000/storage` in the Emulator UI — you should see a file at `drills/{userId}/{drillId}.png`. The drill card in the library should show the canvas image.

- [ ] **Step 10: Commit**

```bash
git add storage.rules firebase.json src/lib/storage.ts src/types/index.ts src/store/useDrillStore.ts src/pages/Training.tsx
git commit -m "feat: add Firebase Storage for drill canvas images

Upload canvasDataUrl to Storage after Firestore write. Store download
URL as imageUrl on the drill document. Display imageUrl in drill list
and preview modal with placeholder icon fallback.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: User Profile Write on Login

Write the user's display name, email, and photo to Firestore on every sign-in so other coaches can see their name.

**Files:**
- Modify: `src/components/auth/AuthProvider.tsx`

- [ ] **Step 1: Update AuthProvider.tsx**

Replace `src/components/auth/AuthProvider.tsx` entirely:

```typescript
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { getTeamsForUser } from '../../lib/firestore/teams';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setTeams, setAuthLoading } = useAuthStore();
  const { activeTeamId, setActiveTeamId } = useAppStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          displayName: firebaseUser.displayName ?? '',
          photoURL: firebaseUser.photoURL,
        };
        setUser(user);

        setDoc(
          doc(db, 'users', firebaseUser.uid),
          {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          },
          { merge: true }
        ).catch(console.error);

        try {
          const teams = await getTeamsForUser(firebaseUser.uid);
          setTeams(teams);
          if (teams.length > 0 && !activeTeamId) {
            setActiveTeamId(teams[0].id);
          }
        } catch (err) {
          console.error('Failed to load teams:', err);
          setTeams([]);
        }
      } else {
        setUser(null);
        setTeams([]);
        setActiveTeamId(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  return <>{children}</>;
}
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Manual test — verify user document is written**

Log in with Google. Check `http://127.0.0.1:4000/firestore` → `users` collection → your user document. It should have `displayName`, `email`, `photoURL` fields.

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/AuthProvider.tsx
git commit -m "feat: write user profile to Firestore on login

Enables coach management UI to display coach names. Uses merge:true
so only provided fields are updated.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Coach Management in Settings

Add a "Valmentajat" section to Settings showing the coach list with inline remove confirmation and an invite link generator.

**Files:**
- Modify: `src/lib/firestore/userData.ts`
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Add getCoachProfiles to userData.ts**

Add this function at the end of `src/lib/firestore/userData.ts` (after `getActiveSport`):

```typescript
export async function getCoachProfiles(
  coachIds: string[]
): Promise<{ uid: string; displayName: string; email: string }[]> {
  const results = await Promise.all(
    coachIds.map(async (uid) => {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        uid,
        displayName: (data.displayName as string) ?? '',
        email: (data.email as string) ?? '',
      };
    })
  );
  return results.filter(
    (r): r is { uid: string; displayName: string; email: string } => r !== null
  );
}
```

Make sure `getDoc` is already imported at the top of the file. The full import line should be:

```typescript
import { collection, doc, getDocs, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
```

- [ ] **Step 2: Build userData.ts changes**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Add Valmentajat section to Settings.tsx**

At the top of `src/pages/Settings.tsx`, add these imports to the existing import block:

```typescript
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { getCoachProfiles } from '../lib/firestore/userData';
import { createInvitation } from '../lib/firestore/invitations';
import { removeCoachFromTeam } from '../lib/firestore/teams';
```

Note: `useState` and `useEffect` are already imported from React — check and merge with existing React import if needed.

- [ ] **Step 4: Add CoachManagement component to Settings.tsx**

Add this component function before the `export function Settings()` declaration in `src/pages/Settings.tsx`:

```typescript
function CoachManagement() {
  const user = useAuthStore((s) => s.user);
  const teams = useAuthStore((s) => s.teams);
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  const team = teams.find((t) => t.id === activeTeamId) ?? null;
  const isHeadCoach = team?.headCoachId === user?.uid;

  const [coaches, setCoaches] = useState<{ uid: string; displayName: string; email: string }[]>([]);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!team?.coaches?.length) { setCoaches([]); return; }
    getCoachProfiles(team.coaches).then(setCoaches).catch(console.error);
  }, [team?.coaches?.join(',')]);

  async function handleRemove(coachId: string) {
    if (!team) return;
    try {
      await removeCoachFromTeam(team.id, coachId);
      setCoaches((prev) => prev.filter((c) => c.uid !== coachId));
    } catch {
      // ignore
    }
    setConfirmRemove(null);
  }

  async function handleCreateInvite() {
    if (!team || !user) return;
    setInviteLoading(true);
    try {
      const token = await createInvitation(team.id, user.uid);
      setInviteUrl(`${window.location.origin}/join?token=${token}`);
    } catch {
      // ignore
    } finally {
      setInviteLoading(false);
    }
  }

  function handleCopy() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <CollapsibleCard title="Valmentajat">
      <div className="space-y-1">
        {coaches.map((coach) => (
          <div
            key={coach.uid}
            className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-sm font-semibold text-brand-700 dark:text-brand-300 shrink-0">
                {(coach.displayName || coach.email || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                  {coach.displayName || 'Nimetön'}
                  {coach.uid === team?.headCoachId && (
                    <span className="ml-2 text-xs font-normal text-brand-600 dark:text-brand-400">
                      (päävalmentaja)
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{coach.email}</p>
              </div>
            </div>

            {isHeadCoach && coach.uid !== user?.uid && (
              confirmRemove === coach.uid ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500 dark:text-slate-400">Vahvistetaanko poisto?</span>
                  <Button variant="danger" size="sm" onClick={() => handleRemove(coach.uid)}>
                    Kyllä
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmRemove(null)}>
                    Peruuta
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setConfirmRemove(coach.uid)}>
                  Poista
                </Button>
              )
            )}
          </div>
        ))}
      </div>

      {isHeadCoach && (
        <div className="mt-4 space-y-2">
          <Button variant="secondary" onClick={handleCreateInvite} disabled={inviteLoading}>
            {inviteLoading ? 'Luodaan...' : 'Luo kutsulink'}
          </Button>
          {inviteUrl && (
            <div className="flex gap-2 mt-2">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-1.5 text-xs text-gray-700 dark:text-slate-300 focus:outline-none"
              />
              <Button variant="secondary" size="sm" onClick={handleCopy}>
                {copied ? 'Kopioitu!' : 'Kopioi'}
              </Button>
            </div>
          )}
        </div>
      )}
    </CollapsibleCard>
  );
}
```

- [ ] **Step 5: Render CoachManagement at the top of the Settings page**

In `src/pages/Settings.tsx`, find the `export function Settings()` component and add `<CoachManagement />` as the first item in the returned JSX, before the existing `CollapsibleCard` sections:

```tsx
export function Settings() {
  // ... existing state and handlers ...

  return (
    <div className="space-y-4">
      <CoachManagement />
      {/* existing CollapsibleCard sections below */}
```

- [ ] **Step 6: Build and verify**

```bash
npm run build
```

Expected: no TypeScript errors. If `useState`/`useEffect` are already imported in the file and you get a duplicate import error, merge them into the existing React import.

- [ ] **Step 7: Manual test — coach list and invite flow**

1. Log in, go to Settings. The "Valmentajat" section should show your own name and email with the "(päävalmentaja)" badge.
2. Click "Luo kutsulink". An invite URL should appear with a copy button.
3. Copy the URL and open it in a new browser tab (or incognito). It should show the JoinTeam page with the team name.
4. Log in with a different Google account and accept the invitation. Go back to Settings in the original window and refresh — the new coach should appear in the list.
5. Click "Poista" on the new coach — the row should change to show "Vahvistetaanko poisto?" with Kyllä/Peruuta buttons. Click Peruuta — row returns to normal. Click Poista again, then Kyllä — the coach is removed from the list.

- [ ] **Step 8: Commit**

```bash
git add src/lib/firestore/userData.ts src/pages/Settings.tsx
git commit -m "feat: add coach management UI to Settings

Shows coach list with names fetched from users collection. Head coach
can generate invite links and remove other coaches with inline
confirmation step.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
