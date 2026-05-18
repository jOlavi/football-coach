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
