'use client';

import * as React from 'react';

type RemoteWorkspaceResponse = {
  ok: boolean;
  authenticated?: boolean;
  user?: {
    name: string | null;
    email: string | null;
    photoUrl: string | null;
  };
  tenants?: Array<{
    id: string;
    slug: string;
    name: string;
    isDemo: boolean;
    createdAt: string;
    logoUrl?: string | null;
  }>;
  activeTenantId?: string | null;
  error?: string;
};

export type ClientTenant = {
  id: string;
  slug: string;
  name: string;
  isDemo: boolean;
  createdAt: string;
  logoUrl?: string | null;
};

export type ClientUserProfile = {
  name: string | null;
  email: string | null;
  photoUrl: string | null;
  phone?: string | null;
  position?: string | null;
  recoveryEmail?: string | null;
  passwordUpdatedAt?: string | null;
  emailUpdatedAt?: string | null;
};

const TENANTS_STORAGE_KEY = 'vf-client-tenants';
const ACTIVE_TENANT_STORAGE_KEY = 'vf-client-active-tenant';
const USER_STORAGE_KEY = 'vf-client-user';

const DEMO_TENANT: ClientTenant = {
  id: 'demo',
  slug: 'demo',
  name: 'Empresa Demo',
  isDemo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  logoUrl: null,
};

type ClientTenantState = {
  tenants: ClientTenant[];
  activeTenantId: string;
  userProfile: ClientUserProfile | null;
};

type WorkspaceSource = 'local' | 'remote';

type WorkspaceRuntimeState = ClientTenantState & {
  source: WorkspaceSource;
  authenticated: boolean;
  loading: boolean;
};

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function toTitleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'empresa'
  );
}

function readJson<T>(key: string): T | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(key, JSON.stringify(value));
}

function normalizeTenant(input: unknown): ClientTenant | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const candidate = input as Partial<ClientTenant>;
  const id =
    typeof candidate.id === 'string' && candidate.id.trim().length > 0 ? candidate.id : null;
  const name =
    typeof candidate.name === 'string' && candidate.name.trim().length > 0
      ? candidate.name.trim()
      : null;

  if (!id || !name) {
    return null;
  }

  const slugSource =
    typeof candidate.slug === 'string' && candidate.slug.trim().length > 0 ? candidate.slug : name;

  return {
    id,
    slug: slugify(slugSource),
    name,
    isDemo: Boolean(candidate.isDemo),
    logoUrl:
      typeof candidate.logoUrl === 'string' && candidate.logoUrl.trim().length > 0
        ? candidate.logoUrl.trim()
        : null,
    createdAt:
      typeof candidate.createdAt === 'string' && candidate.createdAt.length > 0
        ? candidate.createdAt
        : new Date().toISOString(),
  };
}

function normalizeTenants(input: unknown): ClientTenant[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const tenants: ClientTenant[] = [];

  for (const entry of input) {
    const tenant = normalizeTenant(entry);
    if (!tenant) {
      continue;
    }

    if (seenIds.has(tenant.id) || seenSlugs.has(tenant.slug)) {
      continue;
    }

    seenIds.add(tenant.id);
    seenSlugs.add(tenant.slug);
    tenants.push(tenant);
  }

  tenants.sort((left, right) => {
    if (left.isDemo && !right.isDemo) {
      return -1;
    }

    if (!left.isDemo && right.isDemo) {
      return 1;
    }

    return left.name.localeCompare(right.name, 'es', { sensitivity: 'base' });
  });

  return tenants;
}

function readFirebaseAuthProfile(): ClientUserProfile | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !key.startsWith('firebase:authUser:')) {
      continue;
    }

    const authUser = readJson<Record<string, unknown>>(key);
    if (!authUser) {
      continue;
    }

    const name = typeof authUser.displayName === 'string' ? authUser.displayName : null;
    const email = typeof authUser.email === 'string' ? authUser.email : null;
    const photoUrl = typeof authUser.photoURL === 'string' ? authUser.photoURL : null;

    if (name || email || photoUrl) {
      return { name, email, photoUrl };
    }
  }

  return null;
}

function normalizeUserProfile(input: unknown): ClientUserProfile | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const candidate = input as Partial<ClientUserProfile>;
  const name =
    typeof candidate.name === 'string' && candidate.name.trim().length > 0
      ? candidate.name.trim()
      : null;
  const email =
    typeof candidate.email === 'string' && candidate.email.trim().length > 0
      ? candidate.email.trim()
      : null;
  const photoUrl =
    typeof candidate.photoUrl === 'string' && candidate.photoUrl.trim().length > 0
      ? candidate.photoUrl.trim()
      : null;
  const phone =
    typeof candidate.phone === 'string' && candidate.phone.trim().length > 0
      ? candidate.phone.trim()
      : null;
  const position =
    typeof candidate.position === 'string' && candidate.position.trim().length > 0
      ? candidate.position.trim()
      : null;
  const recoveryEmail =
    typeof candidate.recoveryEmail === 'string' && candidate.recoveryEmail.trim().length > 0
      ? candidate.recoveryEmail.trim()
      : null;
  const passwordUpdatedAt =
    typeof candidate.passwordUpdatedAt === 'string' && candidate.passwordUpdatedAt.length > 0
      ? candidate.passwordUpdatedAt
      : null;
  const emailUpdatedAt =
    typeof candidate.emailUpdatedAt === 'string' && candidate.emailUpdatedAt.length > 0
      ? candidate.emailUpdatedAt
      : null;

  if (!name && !email && !photoUrl && !phone && !position && !recoveryEmail) {
    return null;
  }

  return {
    name,
    email,
    photoUrl,
    phone,
    position,
    recoveryEmail,
    passwordUpdatedAt,
    emailUpdatedAt,
  };
}

function readStoredUserProfile() {
  return normalizeUserProfile(readJson<ClientUserProfile>(USER_STORAGE_KEY));
}

function getResolvedUserProfile() {
  return readFirebaseAuthProfile() ?? readStoredUserProfile();
}

function readTenants() {
  const storedTenants = normalizeTenants(readJson<ClientTenant[]>(TENANTS_STORAGE_KEY));
  return storedTenants.length > 0 ? storedTenants : [DEMO_TENANT];
}

function resolveActiveTenantId(tenants: ClientTenant[], routeTenantSlug?: string) {
  if (routeTenantSlug) {
    const routeTenant = tenants.find((tenant) => tenant.slug === routeTenantSlug);
    if (routeTenant) {
      return routeTenant.id;
    }
  }

  const storedActiveTenantId = readJson<string>(ACTIVE_TENANT_STORAGE_KEY);
  if (storedActiveTenantId && tenants.some((tenant) => tenant.id === storedActiveTenantId)) {
    return storedActiveTenantId;
  }

  return tenants[0]?.id ?? DEMO_TENANT.id;
}

function persistState(state: ClientTenantState) {
  writeJson(TENANTS_STORAGE_KEY, state.tenants);
  writeJson(ACTIVE_TENANT_STORAGE_KEY, state.activeTenantId);

  if (state.userProfile) {
    writeJson(USER_STORAGE_KEY, state.userProfile);
    return;
  }

  const storage = getStorage();
  storage?.removeItem(USER_STORAGE_KEY);
}

function buildState(routeTenantSlug?: string): ClientTenantState {
  const tenants = readTenants();
  const activeTenantId = resolveActiveTenantId(tenants, routeTenantSlug);
  const userProfile = getResolvedUserProfile();
  const state = { tenants, activeTenantId, userProfile };

  persistState(state);
  return state;
}

function buildRuntimeState(routeTenantSlug?: string): WorkspaceRuntimeState {
  const baseState = buildState(routeTenantSlug);
  return {
    ...baseState,
    source: 'local',
    authenticated: false,
    loading: true,
  };
}

function buildStateFromRemoteResponse(
  response: RemoteWorkspaceResponse
): WorkspaceRuntimeState | null {
  if (!response.ok || !response.authenticated || !response.user || !response.tenants?.length) {
    return null;
  }

  const tenants = normalizeTenants(response.tenants);
  const activeTenantId =
    (response.activeTenantId && tenants.some((tenant) => tenant.id === response.activeTenantId)
      ? response.activeTenantId
      : tenants[0]?.id) ?? DEMO_TENANT.id;

  const userProfile = normalizeUserProfile({
    name: response.user.name,
    email: response.user.email,
    photoUrl: response.user.photoUrl,
  });

  const nextState: ClientTenantState = {
    tenants,
    activeTenantId,
    userProfile,
  };

  persistState(nextState);

  return {
    ...nextState,
    source: 'remote',
    authenticated: true,
    loading: false,
  };
}

async function fetchRemoteWorkspace() {
  const response = await fetch('/api/workspace', { cache: 'no-store' });
  const data = (await response.json().catch(() => null)) as RemoteWorkspaceResponse | null;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? 'No se pudo cargar el workspace');
  }

  return data;
}

function deriveDisplayName(profile: ClientUserProfile | null) {
  if (profile?.name && profile.name.trim().length > 0) {
    return profile.name.trim().split(/\s+/)[0];
  }

  if (profile?.email) {
    const localPart = profile.email.split('@')[0] ?? 'Usuario';
    return toTitleCase(localPart.replace(/[._-]+/g, ' '));
  }

  return 'Usuario';
}

function uniqueSlug(baseSlug: string, tenants: ClientTenant[]) {
  if (!tenants.some((tenant) => tenant.slug === baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  let candidate = `${baseSlug}-${suffix}`;
  while (tenants.some((tenant) => tenant.slug === candidate)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return candidate;
}

export function saveClientUserProfile(profile: Partial<ClientUserProfile>) {
  const nextProfile = normalizeUserProfile({
    ...(readStoredUserProfile() ?? {}),
    ...profile,
  });
  if (!nextProfile) {
    return null;
  }

  writeJson(USER_STORAGE_KEY, nextProfile);
  return nextProfile;
}

export function getDefaultClientTenantSlug() {
  const state = buildState();
  return (
    state.tenants.find((tenant) => tenant.id === state.activeTenantId)?.slug ?? DEMO_TENANT.slug
  );
}

export function useCurrentTenant(routeTenantSlug?: string) {
  const [state, setState] = React.useState<WorkspaceRuntimeState>(() =>
    buildRuntimeState(routeTenantSlug)
  );

  const refreshWorkspace = React.useCallback(async () => {
    try {
      const remoteWorkspace = await fetchRemoteWorkspace();
      const remoteState = buildStateFromRemoteResponse(remoteWorkspace);
      if (remoteState) {
        setState(remoteState);
        return remoteState;
      }

      setState((previous) => ({
        ...previous,
        authenticated: false,
        loading: false,
      }));
      return null;
    } catch {
      setState((previous) => ({
        ...previous,
        loading: false,
      }));
      return null;
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    const initialLocalState = buildRuntimeState(routeTenantSlug);
    setState(initialLocalState);

    refreshWorkspace().then((remoteState) => {
      if (!isMounted || !remoteState) {
        return;
      }

      if (
        routeTenantSlug &&
        remoteState.tenants.some((tenant) => tenant.slug === routeTenantSlug)
      ) {
        setState((previous) => ({
          ...remoteState,
          activeTenantId:
            remoteState.tenants.find((tenant) => tenant.slug === routeTenantSlug)?.id ??
            remoteState.activeTenantId,
        }));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [refreshWorkspace, routeTenantSlug]);

  const currentTenant =
    state.tenants.find((tenant) => tenant.id === state.activeTenantId) ??
    state.tenants[0] ??
    DEMO_TENANT;

  const setActiveTenant = async (tenantIdOrSlug: string) => {
    const nextTenant = state.tenants.find(
      (tenant) => tenant.id === tenantIdOrSlug || tenant.slug === tenantIdOrSlug
    );

    if (!nextTenant) {
      return null;
    }

    if (state.source === 'remote' && state.authenticated) {
      const response = await fetch('/api/session/tenant-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: nextTenant.id }),
      });

      if (!response.ok) {
        throw new Error('No se pudo cambiar de empresa');
      }

      const refreshed = await refreshWorkspace();
      return refreshed?.tenants.find((tenant) => tenant.id === nextTenant.id) ?? nextTenant;
    }

    setState((previous) => {
      const nextState: WorkspaceRuntimeState = {
        ...previous,
        activeTenantId: nextTenant.id,
      };
      persistState(nextState);
      return nextState;
    });

    return nextTenant;
  };

  const createManualTenant = async (companyName: string) => {
    const normalizedName = companyName.trim();
    if (!normalizedName) {
      return null;
    }

    if (state.source === 'remote' && state.authenticated) {
      const response = await fetch('/api/workspace/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: normalizedName }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo crear la empresa');
      }

      const refreshed = await refreshWorkspace();
      return refreshed?.tenants.find((tenant) => tenant.id === payload?.tenantId) ?? null;
    }

    const createdTenant: ClientTenant = {
      id: `tenant-${Date.now()}`,
      slug: uniqueSlug(slugify(normalizedName), state.tenants),
      name: normalizedName,
      isDemo: false,
      createdAt: new Date().toISOString(),
    };

    const nextState: WorkspaceRuntimeState = {
      ...state,
      tenants: normalizeTenants([...state.tenants, createdTenant]),
      activeTenantId: createdTenant.id,
    };

    setState(nextState);
    persistState(nextState);
    return createdTenant;
  };

  const removeTenant = async (tenantIdOrSlug: string) => {
    if (state.source === 'remote' && state.authenticated) {
      const tenantToRemove = state.tenants.find(
        (tenant) => tenant.id === tenantIdOrSlug || tenant.slug === tenantIdOrSlug
      );

      if (!tenantToRemove) {
        return { ok: false, error: 'Empresa no encontrada.' };
      }

      const response = await fetch(`/api/workspace/tenants/${tenantToRemove.id}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return { ok: false, error: payload?.error ?? 'No se pudo eliminar la empresa.' };
      }

      const refreshed = await refreshWorkspace();
      return {
        ok: true,
        nextTenantSlug: refreshed?.tenants.find((tenant) => tenant.id === refreshed.activeTenantId)
          ?.slug,
      };
    }

    const tenantToRemove = state.tenants.find(
      (tenant) => tenant.id === tenantIdOrSlug || tenant.slug === tenantIdOrSlug
    );

    if (!tenantToRemove) {
      return { ok: false, error: 'Empresa no encontrada.' };
    }

    if (state.tenants.length === 1) {
      return { ok: false, error: 'Necesitas al menos una empresa visible.' };
    }

    const nextTenants = state.tenants.filter((tenant) => tenant.id !== tenantToRemove.id);
    const nextActiveTenant =
      state.activeTenantId === tenantToRemove.id
        ? (nextTenants[0] ?? DEMO_TENANT)
        : (state.tenants.find((tenant) => tenant.id === state.activeTenantId) ??
          nextTenants[0] ??
          DEMO_TENANT);

    const nextState: WorkspaceRuntimeState = {
      ...state,
      tenants: nextTenants,
      activeTenantId: nextActiveTenant.id,
    };

    setState(nextState);
    persistState(nextState);

    return { ok: true, nextTenantSlug: nextActiveTenant.slug };
  };

  const refreshUserProfile = () => {
    setState((previous) => {
      const nextState: WorkspaceRuntimeState = {
        ...previous,
        userProfile: getResolvedUserProfile(),
      };
      persistState(nextState);
      return nextState;
    });
  };

  const updateTenant = async (
    tenantIdOrSlug: string,
    updates: Partial<Pick<ClientTenant, 'name' | 'logoUrl'>>
  ) => {
    if (state.source === 'remote' && state.authenticated) {
      const tenantToUpdate = state.tenants.find(
        (tenant) => tenant.id === tenantIdOrSlug || tenant.slug === tenantIdOrSlug
      );

      if (!tenantToUpdate) {
        return null;
      }

      const response = await fetch(`/api/workspace/tenants/${tenantToUpdate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: typeof updates.name === 'string' ? updates.name.trim() : undefined,
          logoUrl: updates.logoUrl,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo actualizar la empresa');
      }

      const refreshed = await refreshWorkspace();
      return refreshed?.tenants.find((tenant) => tenant.id === tenantToUpdate.id) ?? null;
    }

    const tenantToUpdate = state.tenants.find(
      (tenant) => tenant.id === tenantIdOrSlug || tenant.slug === tenantIdOrSlug
    );
    if (!tenantToUpdate) {
      return null;
    }

    const normalized = normalizeTenant({
      ...tenantToUpdate,
      ...updates,
      slug: tenantToUpdate.slug,
    });
    if (!normalized) {
      return null;
    }

    const nextTenants = state.tenants.map((tenant) =>
      tenant.id === tenantToUpdate.id ? normalized : tenant
    );

    const nextState: WorkspaceRuntimeState = {
      ...state,
      tenants: normalizeTenants(nextTenants),
    };

    setState(nextState);
    persistState(nextState);
    return normalized;
  };

  return {
    currentTenant,
    tenantId: currentTenant.id,
    tenantSlug: currentTenant.slug,
    demoMode: currentTenant.isDemo,
    tenants: state.tenants,
    userProfile: state.userProfile,
    displayName: deriveDisplayName(state.userProfile),
    hasDemoTenant: state.tenants.some((tenant) => tenant.isDemo),
    loading: state.loading,
    isAuthenticated: state.authenticated,
    source: state.source,
    setActiveTenant,
    createManualTenant,
    removeTenant,
    updateTenant,
    refreshUserProfile,
    refreshWorkspace,
  };
}
