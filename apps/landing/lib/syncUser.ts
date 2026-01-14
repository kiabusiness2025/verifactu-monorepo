/**
 * User Synchronization
 * Sincroniza usuarios de Firebase con PostgreSQL (Prisma) en apps/app
 * 
 * Este archivo maneja la comunicación con /api/auth/sync-user
 */

import type { User } from 'firebase/auth';

export interface SyncUserResponse {
  ok: boolean;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
  created?: boolean;
  error?: string;
}

/**
 * Sincronizar usuario de Firebase con PostgreSQL
 * Se llama después del registro o login
 */
export async function syncUserToDB(user: User): Promise<SyncUserResponse> {
  try {
    if (!user.email) {
      return {
        ok: false,
        error: 'User email is required',
      };
    }

    const response = await fetch('/api/auth/sync-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        emailVerified: user.emailVerified,
        provider: user.providerData[0]?.providerId || 'password',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[SYNC] Sync failed:', data.error);
      // No fallar el flujo si la sincronización falla
      // Solo loguearlo - el usuario sigue autenticado en Firebase
      return {
        ok: false,
        error: data.error || 'Sync failed',
      };
    }

    console.log('[SYNC] User synced successfully', {
      uid: user.uid,
      email: user.email,
      created: data.created,
    });

    return {
      ok: true,
      user: data.user,
      created: data.created,
    };
  } catch (error) {
    console.error('[SYNC] Error syncing user:', error);
    // No lanzar excepción - el usuario sigue autenticado
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sincronizar usuario silenciosamente sin bloquear el flujo
 * Útil para ejecutar en background después del login
 */
export async function syncUserSilent(user: User): Promise<void> {
  try {
    await syncUserToDB(user);
  } catch (error) {
    // Silently fail - no interrumpir la UX
    console.warn('[SYNC] Silent sync failed:', error);
  }
}
