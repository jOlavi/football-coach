import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
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
          { displayName: user.displayName, email: user.email, photoURL: user.photoURL },
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
