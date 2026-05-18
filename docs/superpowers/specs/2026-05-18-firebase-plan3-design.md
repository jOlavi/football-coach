# Firebase Plan 3 Design: Nested Arrays Fix + Storage + Coach Management

**Goal:** Fix Firestore nested array errors, add Firebase Storage for drill images, write user profiles on login, and add coach management UI to Settings.

**Architecture:** Four sequential tasks, each building on the previous. Nested arrays fix unblocks correct Firestore writes for sessions and drills. Storage extends drill saving with async image upload. User profile write enables coach names in the management UI. Coach management UI uses existing invitation infrastructure.

**Tech Stack:** Firebase 10.x (Firestore, Storage), React 18 + TypeScript + Zustand 5, existing `invitations.ts` + `teams.ts` infrastructure.

---

## Task 1: Nested Arrays Fix

### Problem

Firestore does not support nested arrays. Two places in the data model hit this:

- `GroupSet.playerIds: string[][]` inside `TrainingSession.groupSets`
- Arrow shape `points: [number, number][]` inside `Drill.shapes`

### Solution

New file `src/lib/firestore/serialize.ts` exports four functions:

**`serializeSession(s: TrainingSession): Record<string, unknown> & { id: string }`**
- Spreads all session fields
- Replaces `groupSets: GroupSet[]` with `groupSetsJson: string` (`JSON.stringify(s.groupSets ?? null)`)
- Output has no `groupSets` field

**`deserializeSession(data: Record<string, unknown>): TrainingSession`**
- Spreads all data fields
- Parses `groupSetsJson` back to `groupSets` (`JSON.parse`)
- If `groupSetsJson` is null or missing, sets `groupSets: undefined`

**`serializeDrill(d: Drill): Record<string, unknown> & { id: string }`**
- Spreads all drill fields
- Replaces `shapes: Shape[]` with `shapesJson: string` (`JSON.stringify(d.shapes)`)
- Drops `canvasDataUrl` entirely (local-only, never stored in Firestore)
- Output has no `shapes` or `canvasDataUrl` field

**`deserializeDrill(data: Record<string, unknown>): Drill`**
- Spreads all data fields
- Parses `shapesJson` back to `shapes`
- Sets `canvasDataUrl: ''` (regenerated locally by canvas editor)
- If `shapesJson` is missing, sets `shapes: []`

### Type signature change

`writeTeamDoc` and `writeUserDoc` currently require `T extends { id: string }`. Relax to accept `{ id: string } & Record<string, unknown>` so serialized objects (which lose their TypeScript type) can be passed in.

### Usage

| Location | Change |
|---|---|
| `useTrainingStore.addSession` | wrap session with `serializeSession` before `writeTeamDoc` |
| `useTrainingStore.updateSession` | wrap updated session with `serializeSession` before `writeTeamDoc` |
| `useDrillStore.addDrill` | wrap drill with `serializeDrill` before `writeUserDoc` |
| `useDrillStore.updateDrill` | wrap updated drill with `serializeDrill` before `writeUserDoc` |
| `DataLoader` — sessions fetch | map results through `deserializeSession` before `setAll` |
| `DataLoader` — drills fetch | map results through `deserializeDrill` before `setAll` |
| `migration.ts` `runMigration` | wrap sessions with `serializeSession`, drills with `serializeDrill` before `setDoc` |

---

## Task 2: Firebase Storage for Drill Images

### New files

**`storage.rules`**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /drills/{userId}/{drillId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**`src/lib/storage.ts`**
- Exports `uploadDrillImage(userId: string, drillId: string, dataUrl: string): Promise<string>`
- Converts base64 data URL to Blob
- Uploads to `drills/{userId}/{drillId}.png` with `contentType: 'image/png'`
- Returns `getDownloadURL(ref)`

### Modified files

**`firebase.json`** — add storage emulator:
```json
"storage": { "port": 9199, "rules": "storage.rules" }
```

**`src/lib/firebase.ts`** — initialize Storage:
```typescript
import { getStorage, connectStorageEmulator } from 'firebase/storage';
export const storage = getStorage(app);
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}
```

**`src/types/index.ts`** — add to `Drill`:
```typescript
imageUrl?: string;
```

**`useDrillStore`** — after Firestore write succeeds, upload image in background:
```
addDrill(drill):
  1. writeUserDoc(..., serializeDrill(drill))       // Firestore write, no canvasDataUrl
  2. set store (drill visible immediately, no imageUrl yet)
  3. if drill.canvasDataUrl:
       uploadDrillImage(userId, drill.id, drill.canvasDataUrl)
         .then(imageUrl => {
           writeUserDoc(..., { ...serializeDrill(drill), imageUrl })
           update store: set imageUrl on this drill
         })
         .catch(console.error)
```
Same pattern for `updateDrill`.

**Drill list UI** (wherever drills are rendered in Training/drill library) — show thumbnail:
```tsx
{drill.imageUrl
  ? <img src={drill.imageUrl} className="w-16 h-12 object-cover rounded" />
  : <div className="w-16 h-12 bg-gray-100 dark:bg-slate-700 rounded flex items-center justify-center">
      <LayoutGrid size={18} className="text-gray-400" />
    </div>
}
```

### Data persistence

Both Firestore documents and Storage files are exported on emulator shutdown (`--export-on-exit ./emulator-data`). Always stop emulator with Ctrl+C to persist data.

---

## Task 3: User Profile on Login

**`AuthProvider.tsx`** — after `setUser(user)`, fire-and-forget profile write:

```typescript
setDoc(
  doc(db, 'users', firebaseUser.uid),
  { displayName: user.displayName, email: user.email, photoURL: user.photoURL },
  { merge: true }
).catch(console.error);
```

`merge: true` ensures only provided fields are updated. Existing security rule (`allow write: if request.auth.uid == userId`) already covers this write.

---

## Task 4: Coach Management in Settings

### New function in `src/lib/firestore/userData.ts`

**`getCoachProfiles(coachIds: string[]): Promise<{ uid: string; displayName: string; email: string }[]>`**
- Fetches `users/{uid}` for each coachId in parallel (`Promise.all`)
- Returns only docs that exist, with `uid` added from the document ID

### `Settings.tsx` changes

New collapsible section "Valmentajat" added at the top of the page.

**Data loading:**
```typescript
const teams = useAuthStore((s) => s.teams);
const activeTeamId = useAppStore((s) => s.activeTeamId);
const user = useAuthStore((s) => s.user);
const team = teams.find((t) => t.id === activeTeamId);
const isHeadCoach = team?.headCoachId === user?.uid;
```
On mount (and when `team?.coaches` changes): call `getCoachProfiles(team.coaches)`, store in local state.

**Coach list UI:**
- Each row: avatar initial circle + display name + email + head coach badge (if `headCoachId`)
- Head coach sees "Poista" button on every row except their own
- Clicking "Poista" switches that row to inline confirmation state:
  - Shows "Vahvistetaanko poisto?" text + "Kyllä" (confirm) + "Peruuta" (cancel) buttons
  - "Kyllä" calls `removeCoachFromTeam(teamId, coachId)`, then removes from local coach list
  - "Peruuta" returns row to normal state
- Only one row can be in confirmation state at a time

**Invite link UI (head coach only):**
- "Luo kutsulink" button calls `createInvitation(teamId, user.uid)`
- On success: shows invite URL in a read-only text input with a "Kopioi" (Copy) button
- URL format: `${window.location.origin}/join?token=${token}`
- Invite link stays visible until page reload or new link is generated

---

## Security Rules — no changes needed

Existing rules already cover all new operations:
- `users/{userId}` write on login — covered by `allow write: if request.auth.uid == userId`
- Storage reads — new `storage.rules` file
- `invitations` create — covered by existing `allow create: if isCoach(teamId)`
- `teams` update (removeCoachFromTeam uses `updateDoc`) — covered by `allow update: if isCoach(teamId)`
