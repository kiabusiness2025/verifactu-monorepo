'use client';

import { useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getLandingUrl } from '@/lib/urls';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }).catch(() => undefined);

      window.location.href = getLandingUrl();
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = getLandingUrl();
    }
  };

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
  };
}
