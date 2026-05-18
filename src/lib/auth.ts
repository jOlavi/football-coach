import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import type { FirebaseUser } from '../types';

export async function signInWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  const { uid, email, displayName, photoURL } = result.user;
  await setDoc(doc(db, 'users', uid), {
    email,
    displayName,
    photoURL,
    lastSeen: serverTimestamp(),
  }, { merge: true });
  return { uid, email: email ?? '', displayName: displayName ?? '', photoURL };
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
