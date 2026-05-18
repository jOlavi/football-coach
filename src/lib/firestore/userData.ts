import { collection, doc, getDocs, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
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

export async function getCoachProfiles(
  coachIds: string[]
): Promise<{ uid: string; displayName: string; email: string }[]> {
  const results = await Promise.all(
    coachIds.map((uid) => getDoc(doc(db, 'users', uid)))
  );
  return results
    .filter((snap) => snap.exists())
    .map((snap) => ({
      uid: snap.id,
      ...(snap.data() as { displayName: string; email: string }),
    }));
}

export function getActiveSport(): string {
  const { teams } = useAuthStore.getState();
  const { activeTeamId } = useAppStore.getState();
  return teams.find((t) => t.id === activeTeamId)?.sport ?? 'football';
}
