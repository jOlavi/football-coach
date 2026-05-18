import {
  doc, setDoc, getDoc, updateDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { addCoachToTeam, getTeam } from './teams';
import type { FirebaseTeam } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export interface Invitation {
  teamId: string;
  createdBy: string;
  expiresAt: Timestamp;
  used: boolean;
}

export async function createInvitation(teamId: string, createdBy: string): Promise<string> {
  const token = uuidv4();
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000));
  await setDoc(doc(db, 'invitations', token), {
    teamId,
    createdBy,
    expiresAt,
    used: false,
  });
  return token;
}

export async function getInvitationTeam(token: string): Promise<{
  team: FirebaseTeam;
  error: null;
} | { team: null; error: 'not_found' | 'expired' | 'used' }> {
  const snap = await getDoc(doc(db, 'invitations', token));
  if (!snap.exists()) return { team: null, error: 'not_found' };
  const inv = snap.data() as Invitation;
  if (inv.used) return { team: null, error: 'used' };
  if (inv.expiresAt.toDate() < new Date()) return { team: null, error: 'expired' };
  const team = await getTeam(inv.teamId);
  if (!team) return { team: null, error: 'not_found' };
  return { team, error: null };
}

export async function acceptInvitation(token: string, userId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'invitations', token));
  if (!snap.exists()) throw new Error('Kutsu ei löydy');
  const inv = snap.data() as Invitation;
  await addCoachToTeam(inv.teamId, userId);
  await updateDoc(doc(db, 'invitations', token), { used: true });
}
