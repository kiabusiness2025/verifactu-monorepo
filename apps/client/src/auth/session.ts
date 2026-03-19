'use client';

import {
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import {
  createGoogleProvider,
  getFirebaseClientAuth,
  isFirebaseConfigComplete,
} from '../../lib/firebase';

const LOCAL_KEYS_TO_CLEAR = [
  'vf-client-tenants',
  'vf-client-active-tenant',
  'vf-client-user',
  'vf-client-members-by-tenant',
  'vf-client-integrations-by-tenant',
  'vf-client-sessions',
  'vf-client-session-id',
];

export type WorkspaceApiResponse = {
  ok: boolean;
  authenticated?: boolean;
  activeTenantId?: string | null;
  tenants?: Array<{ id: string; slug: string }>;
  error?: string;
};

async function postJson<T>(url: string, body?: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : null) ?? `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export async function loadWorkspace() {
  const response = await fetch('/api/workspace', { cache: 'no-store' });
  const data = (await response.json().catch(() => null)) as WorkspaceApiResponse | null;
  if (!response.ok || !data?.ok) {
    throw new Error(
      data && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'No se pudo cargar el workspace'
    );
  }

  return data;
}

export async function establishServerSession(user: User) {
  const idToken = await user.getIdToken(true);
  await postJson('/api/auth/session', { idToken, rememberDevice: true });

  const demoResult = await postJson<{ ok: boolean; tenantId?: string }>(
    '/api/provision/demo'
  ).catch(() => null);
  let workspace = await loadWorkspace();

  const targetTenantId = workspace.activeTenantId ?? demoResult?.tenantId ?? null;
  if (targetTenantId) {
    await postJson('/api/session/tenant-switch', { tenantId: targetTenantId });
    workspace = await loadWorkspace();
  }

  return workspace;
}

export async function signInWithGoogle() {
  if (!isFirebaseConfigComplete) {
    throw new Error('Faltan variables públicas de Firebase para usar acceso con Google.');
  }

  const auth = await getFirebaseClientAuth();
  if (!auth) {
    throw new Error('Firebase Auth no está disponible en este entorno.');
  }

  const provider = createGoogleProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    return establishServerSession(result.user);
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    const shouldRedirect =
      code === 'auth/popup-blocked' ||
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request';

    if (shouldRedirect) {
      await signInWithRedirect(auth, provider);
      return null;
    }

    throw error;
  }
}

export async function consumeRedirectSession() {
  if (!isFirebaseConfigComplete) {
    return null;
  }

  const auth = await getFirebaseClientAuth();
  if (!auth) {
    return null;
  }

  const result = await getRedirectResult(auth);
  if (!result?.user) {
    return null;
  }

  return establishServerSession(result.user);
}

function clearFallbackState() {
  if (typeof window === 'undefined') {
    return;
  }

  for (const key of LOCAL_KEYS_TO_CLEAR) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
}

export async function logoutClient() {
  const auth = await getFirebaseClientAuth().catch(() => null);
  if (auth) {
    await signOut(auth).catch(() => undefined);
  }

  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  clearFallbackState();
}
