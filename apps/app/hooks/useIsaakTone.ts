"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";

export type IsaakTone = "friendly" | "professional" | "minimal";

interface IsaakToneConfig {
  tone: IsaakTone;
  updateTone: (newTone: IsaakTone) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook para gestionar el tono de conversación de Isaak
 * 
 * Opciones:
 * - friendly: Emoticonos frecuentes, bromas, tono cercano (por defecto)
 * - professional: Formal pero claro, emoticonos ocasionales
 * - minimal: Ultra-breve, sin emoticonos
 */
export function useIsaakTone(): IsaakToneConfig {
  const { user } = useAuth();
  const [tone, setTone] = useState<IsaakTone>("friendly");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    fetchTone();
  }, [user]);

  const fetchTone = async () => {
    try {
      setIsLoading(true);
      
      // Obtener token de Firebase
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error("No hay token de autenticación");
      }
      
      const response = await fetch("/api/user/preferences", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Error al cargar preferencias");
      }

      const data = await response.json();
      setTone(data.isaak_tone || "friendly");
      setError(null);
    } catch (err) {
      console.error("Error fetching Isaak tone:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setTone("friendly"); // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  const updateTone = async (newTone: IsaakTone) => {
    try {
      setError(null);
      
      // Obtener token de Firebase
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error("No hay token de autenticación");
      }
      
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ isaak_tone: newTone }),
      });

      if (!response.ok) {
        throw new Error("Error al guardar preferencia");
      }

      setTone(newTone);
    } catch (err) {
      console.error("Error updating Isaak tone:", err);
      setError(err instanceof Error ? err.message : "Error al guardar");
      throw err; // Re-throw para que el componente pueda manejarlo
    }
  };

  return {
    tone,
    updateTone,
    isLoading,
    error,
  };
}
