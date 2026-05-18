import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
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
        const teams = await getTeamsForUser(firebaseUser.uid);
        setTeams(teams);
        if (teams.length > 0 && !activeTeamId) {
          setActiveTeamId(teams[0].id);
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
