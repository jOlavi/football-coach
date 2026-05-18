import {
  collection, doc, getDoc, getDocs,
  setDoc, updateDoc, arrayUnion, arrayRemove, query, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { FirebaseTeam } from '../../types';

export async function createTeam(
  teamData: Omit<FirebaseTeam, 'id'>,
  id: string
): Promise<FirebaseTeam> {
  const ref = doc(db, 'teams', id);
  await setDoc(ref, teamData);
  return { ...teamData, id };
}

export async function getTeamsForUser(userId: string): Promise<FirebaseTeam[]> {
  const q = query(collection(db, 'teams'), where('coaches', 'array-contains', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirebaseTeam));
}

export async function getTeam(teamId: string): Promise<FirebaseTeam | null> {
  const snap = await getDoc(doc(db, 'teams', teamId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FirebaseTeam;
}

export async function addCoachToTeam(teamId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId), { coaches: arrayUnion(userId) });
}

export async function removeCoachFromTeam(teamId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId), { coaches: arrayRemove(userId) });
}
