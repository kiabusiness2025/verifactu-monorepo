"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, isFirebaseConfigComplete, isFirebaseReady } from "../lib/firebase";
import { mintSessionCookie } from "../lib/serverSession";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isEmailVerified: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const hasSyncedSession = useRef(false);

  useEffect(() => {
    if (!isFirebaseConfigComplete || !auth || !isFirebaseReady) {
      console.warn("Auth deshabilitado: configura NEXT_PUBLIC_FIREBASE_* en Vercel/entorno.");
      setLoading(false);
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsEmailVerified(currentUser?.emailVerified || false);

      // Sync session cookie if user is authenticated and we haven't synced yet
      if (currentUser && !hasSyncedSession.current) {
        try {
          await mintSessionCookie(currentUser);
          hasSyncedSession.current = true;
        } catch (error) {
          console.error("Failed to sync session cookie:", error);
        }
      } else if (!currentUser) {
        hasSyncedSession.current = false;
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isEmailVerified }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

