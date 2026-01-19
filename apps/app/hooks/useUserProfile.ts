"use client";

import { useEffect, useState } from "react";

export type UserProfile = {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  photoURL?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type UseUserProfileState = {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
};

export function useUserProfile(): UseUserProfileState {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/user/profile", { credentials: "include" });
        if (!res.ok) {
          if (res.status === 401 || res.status === 404) {
            if (active) setProfile(null);
            return;
          }
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "No se pudo cargar el perfil");
        }

        const data = await res.json().catch(() => null);
        if (active) {
          setProfile(data?.user ?? null);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  return { profile, loading, error };
}
