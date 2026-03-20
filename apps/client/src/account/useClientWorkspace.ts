'use client';

import * as React from 'react';
import { ClientUserProfile, saveClientUserProfile } from '../tenant/useCurrentTenant';

export type ClientMemberRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'VIEWER';

export type ClientInvitation = {
  id: string;
  email: string;
  role: ClientMemberRole;
  status: 'pending' | 'accepted';
  invitedAt: string;
};

export type ClientIntegration = {
  id: string;
  label: string;
  description: string;
  connected: boolean;
  connectedAt: string | null;
};

export type ClientSessionEntry = {
  id: string;
  deviceLabel: string;
  current: boolean;
  createdAt: string;
  lastSeenAt: string;
  email: string | null;
};

const MEMBERS_STORAGE_KEY = 'vf-client-members-by-tenant';
const INTEGRATIONS_STORAGE_KEY = 'vf-client-integrations-by-tenant';
const SESSIONS_STORAGE_KEY = 'vf-client-sessions';
const CURRENT_SESSION_STORAGE_KEY = 'vf-client-session-id';

type MembersByTenant = Record<string, ClientInvitation[]>;
type IntegrationsByTenant = Record<string, ClientIntegration[]>;

const DEFAULT_INTEGRATIONS: ClientIntegration[] = [
  {
    id: 'gmail',
    label: 'Gmail',
    description: 'Sincroniza correo para enviar y revisar comunicaciones con clientes.',
    connected: false,
    connectedAt: null,
  },
  {
    id: 'gdrive',
    label: 'Google Drive',
    description: 'Guarda documentos y justificantes de forma ordenada.',
    connected: false,
    connectedAt: null,
  },
  {
    id: 'gcalendar',
    label: 'Google Calendar',
    description: 'Muestra vencimientos y tareas contables en tu calendario.',
    connected: false,
    connectedAt: null,
  },
  {
    id: 'microsoft',
    label: 'Microsoft 365',
    description: 'Conecta tus herramientas de trabajo y correo corporativo.',
    connected: false,
    connectedAt: null,
  },
  {
    id: 'onedrive',
    label: 'OneDrive',
    description: 'Sube y consulta documentos desde tu espacio de archivos.',
    connected: false,
    connectedAt: null,
  },
  {
    id: 'accounting-api',
    label: 'Programa contable',
    description: 'Conecta tu software contable para sincronizar datos.',
    connected: false,
    connectedAt: null,
  },
];

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
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

function getCurrentSessionId() {
  if (typeof window === 'undefined') {
    return 'server-session';
  }

  const existing = window.sessionStorage.getItem(CURRENT_SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const next =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `session-${Date.now()}`;

  window.sessionStorage.setItem(CURRENT_SESSION_STORAGE_KEY, next);
  return next;
}

function getDeviceLabel() {
  if (typeof navigator === 'undefined') {
    return 'Dispositivo actual';
  }

  const agent = navigator.userAgent;
  const isMobile = /iphone|android|mobile/i.test(agent);
  const browser = /edg/i.test(agent)
    ? 'Edge'
    : /chrome/i.test(agent)
      ? 'Chrome'
      : /safari/i.test(agent)
        ? 'Safari'
        : /firefox/i.test(agent)
          ? 'Firefox'
          : 'Navegador';

  return `${isMobile ? 'Móvil' : 'Ordenador'} · ${browser}`;
}

function readMembersByTenant() {
  return readJson<MembersByTenant>(MEMBERS_STORAGE_KEY) ?? {};
}

function readIntegrationsByTenant() {
  return readJson<IntegrationsByTenant>(INTEGRATIONS_STORAGE_KEY) ?? {};
}

function getTenantIntegrations(tenantId: string) {
  const allIntegrations = readIntegrationsByTenant();
  return allIntegrations[tenantId] ?? DEFAULT_INTEGRATIONS;
}

function persistCurrentSession(email: string | null | undefined) {
  const sessionId = getCurrentSessionId();
  const now = new Date().toISOString();
  const storedSessions = readJson<ClientSessionEntry[]>(SESSIONS_STORAGE_KEY) ?? [];

  const nextSessions = storedSessions
    .filter((session) => session.id !== sessionId)
    .map((session) => ({ ...session, current: false }))
    .slice(0, 9);

  const currentSession: ClientSessionEntry = {
    id: sessionId,
    deviceLabel: getDeviceLabel(),
    current: true,
    createdAt: storedSessions.find((session) => session.id === sessionId)?.createdAt ?? now,
    lastSeenAt: now,
    email: email ?? null,
  };

  writeJson(SESSIONS_STORAGE_KEY, [currentSession, ...nextSessions]);
  return [currentSession, ...nextSessions];
}

export function useClientWorkspace(userProfile: ClientUserProfile | null, tenantId: string) {
  const [members, setMembers] = React.useState<ClientInvitation[]>(() => {
    const byTenant = readMembersByTenant();
    return byTenant[tenantId] ?? [];
  });
  const [integrations, setIntegrations] = React.useState<ClientIntegration[]>(() =>
    getTenantIntegrations(tenantId)
  );
  const [sessions, setSessions] = React.useState<ClientSessionEntry[]>(() =>
    persistCurrentSession(userProfile?.email)
  );

  React.useEffect(() => {
    const byTenant = readMembersByTenant();
    setMembers(byTenant[tenantId] ?? []);
    setIntegrations(getTenantIntegrations(tenantId));
  }, [tenantId]);

  React.useEffect(() => {
    setSessions(persistCurrentSession(userProfile?.email));
  }, [userProfile?.email]);

  const updateProfile = (updates: Partial<ClientUserProfile>) => {
    const nextProfile = saveClientUserProfile(updates);
    setSessions(persistCurrentSession(nextProfile?.email));
    return nextProfile;
  };

  const changeEmail = (email: string) =>
    updateProfile({ email, emailUpdatedAt: new Date().toISOString() });

  const changePassword = () => updateProfile({ passwordUpdatedAt: new Date().toISOString() });

  const inviteMember = (email: string, role: ClientMemberRole) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return null;
    }

    const byTenant = readMembersByTenant();
    const nextInvitation: ClientInvitation = {
      id: `invite-${Date.now()}`,
      email: normalizedEmail,
      role,
      status: 'pending',
      invitedAt: new Date().toISOString(),
    };

    const nextMembers = [nextInvitation, ...(byTenant[tenantId] ?? [])];
    byTenant[tenantId] = nextMembers;
    writeJson(MEMBERS_STORAGE_KEY, byTenant);
    setMembers(nextMembers);
    return nextInvitation;
  };

  const removeInvitation = (invitationId: string) => {
    const byTenant = readMembersByTenant();
    const nextMembers = (byTenant[tenantId] ?? []).filter((item) => item.id !== invitationId);
    byTenant[tenantId] = nextMembers;
    writeJson(MEMBERS_STORAGE_KEY, byTenant);
    setMembers(nextMembers);
  };

  const toggleIntegration = (integrationId: string) => {
    const byTenant = readIntegrationsByTenant();
    const nextIntegrations = getTenantIntegrations(tenantId).map((integration) =>
      integration.id === integrationId
        ? {
            ...integration,
            connected: !integration.connected,
            connectedAt: !integration.connected ? new Date().toISOString() : null,
          }
        : integration
    );

    byTenant[tenantId] = nextIntegrations;
    writeJson(INTEGRATIONS_STORAGE_KEY, byTenant);
    setIntegrations(nextIntegrations);
  };

  const closeSession = (sessionId: string) => {
    const currentSessionId = getCurrentSessionId();
    if (sessionId === currentSessionId) {
      return false;
    }

    const nextSessions = (readJson<ClientSessionEntry[]>(SESSIONS_STORAGE_KEY) ?? []).filter(
      (session) => session.id !== sessionId
    );
    writeJson(SESSIONS_STORAGE_KEY, nextSessions);
    setSessions(nextSessions);
    return true;
  };

  const closeOtherSessions = () => {
    const currentSessionId = getCurrentSessionId();
    const nextSessions = (readJson<ClientSessionEntry[]>(SESSIONS_STORAGE_KEY) ?? []).filter(
      (session) => session.id === currentSessionId
    );
    writeJson(SESSIONS_STORAGE_KEY, nextSessions);
    setSessions(nextSessions);
  };

  return {
    members,
    integrations,
    sessions,
    updateProfile,
    changeEmail,
    changePassword,
    inviteMember,
    removeInvitation,
    toggleIntegration,
    closeSession,
    closeOtherSessions,
  };
}
