import { useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { getTeamsForUser } from '../../lib/firestore/teams';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';

interface AccessConfig {
  openRegistration: boolean;
  allowedEmails: string[];
}

async function checkAccess(email: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'appConfig', 'access'));
    if (!snap.exists()) return true; // no config = open
    const config = snap.data() as AccessConfig;
    if (config.openRegistration) return true;
    return (config.allowedEmails ?? []).includes(email);
  } catch {
    return true; // on error, don't lock out
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setTeams, setAuthLoading, setAccessDenied } = useAuthStore();
  const { setActiveTeamId } = useAppStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const allowed = await checkAccess(firebaseUser.email ?? '');
        if (!allowed) {
          await signOut(auth);
          setAccessDenied(true);
          setAuthLoading(false);
          return;
        }
        setAccessDenied(false);
        const user = {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          displayName: firebaseUser.displayName ?? '',
          photoURL: firebaseUser.photoURL,
        };
        setUser(user);
        setDoc(
          doc(db, 'users', firebaseUser.uid),
          { displayName: user.displayName, email: user.email, photoURL: user.photoURL },
          { merge: true }
        ).catch(console.error);
        try {
          const teams = await getTeamsForUser(firebaseUser.uid);
          setTeams(teams);
          const currentActiveId = useAppStore.getState().activeTeamId;
          if (currentActiveId && !teams.find((t) => t.id === currentActiveId)) {
            setActiveTeamId(null);
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
