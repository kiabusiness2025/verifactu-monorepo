'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, RefreshCcw, TriangleAlert } from 'lucide-react';
import { StatusBadge } from '@verifactu/ui';
import type {
  AccessRequestDTO,
  AccountingStatusResponse,
  ClaimCaseDTO,
  ClaimResolutionDTO,
  MembershipDTO,
  MembershipRole,
  MembershipSide,
  RecipientDTO,
  RecipientType,
} from '@verifactu/integrations/holded/contracts';
import {
  getHoldedConnectionBadge,
  getHoldedConnectionStatusLabel,
  getHoldedGovernanceBadges,
  getHoldedStatusBanners,
  type HoldedUiBadge,
  type HoldedUiBanner,
} from '@verifactu/integrations/holded/uiState';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import { PanelEmptyState } from '../components/PanelEmptyState';

type IntegrationStatus = AccountingStatusResponse & {
  status: string;
  lastSyncAt: string | null;
  lastError: string | null;
  connected: boolean;
  plan?: string | null;
  canConnect?: boolean;
  error?: string;
};

type ClaimDetailsResponse = {
  claim: ClaimCaseDTO;
  timeline: ClaimResolutionDTO[];
};

type NoticeState = {
  tone: 'success' | 'error' | 'info';
  text: string;
} | null;

type MembershipDraft = { role: MembershipRole };
type RecipientDraft = {
  recipientType: RecipientType;
  isMandatory: boolean;
  isClientSide: boolean;
  isConfirmed: boolean;
};

type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void | Promise<void>;
};

const membershipRoleOptions: MembershipRole[] = [
  'company_admin',
  'operator',
  'viewer',
  'advisor_operator',
];

const membershipSideOptions: MembershipSide[] = ['client', 'advisor'];

const recipientTypeOptions: RecipientType[] = [
  'user_primary',
  'client_contact',
  'shared_mailbox',
  'ops',
  'advisor_contact',
];

function fieldClasses() {
  return 'h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10';
}

function buttonClasses(primary = false) {
  return primary
    ? 'rounded-full bg-[#0b6cfb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#095edb] disabled:cursor-not-allowed disabled:opacity-50'
    : 'rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
}

function bannerToneClasses(tone: HoldedUiBanner['tone']) {
  switch (tone) {
    case 'error':
      return 'border-rose-200 bg-rose-50 text-rose-900';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'info':
    default:
      return 'border-sky-200 bg-sky-50 text-sky-900';
  }
}

function noticeClasses(tone: NonNullable<NoticeState>['tone']) {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'error':
      return 'border-rose-200 bg-rose-50 text-rose-900';
    case 'info':
    default:
      return 'border-sky-200 bg-sky-50 text-sky-900';
  }
}

function badgeVariantToUiVariant(variant: HoldedUiBadge['variant']) {
  return variant;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('es-ES');
  } catch {
    return value;
  }
}

function getMembershipRoleLabel(role: MembershipDTO['role']) {
  switch (role) {
    case 'company_admin':
      return 'Company admin';
    case 'advisor_operator':
      return 'Asesoria';
    case 'operator':
      return 'Operador';
    case 'viewer':
    default:
      return 'Viewer';
  }
}

function getMembershipStatusLabel(status: MembershipDTO['status']) {
  switch (status) {
    case 'active':
      return 'Activo';
    case 'invited':
      return 'Invitado';
    case 'disabled':
    default:
      return 'Deshabilitado';
  }
}

function getSideLabel(side: MembershipDTO['side']) {
  return side === 'advisor' ? 'Asesoria' : side === 'client' ? 'Cliente' : 'Sin lado';
}

function getRecipientTypeLabel(type: RecipientDTO['recipientType']) {
  switch (type) {
    case 'user_primary':
      return 'Usuario principal';
    case 'client_contact':
      return 'Contacto cliente';
    case 'shared_mailbox':
      return 'Buzon compartido';
    case 'ops':
      return 'Operaciones';
    case 'advisor_contact':
      return 'Contacto asesoria';
    default:
      return type;
  }
}

function getClaimStatusLabel(status: ClaimCaseDTO['status']) {
  switch (status) {
    case 'submitted':
      return 'Enviada';
    case 'acknowledged':
      return 'Recibida';
    case 'under_review':
      return 'En revision';
    case 'awaiting_response':
      return 'Esperando respuesta';
    case 'resolved_approved':
      return 'Aprobada';
    case 'resolved_rejected':
      return 'Rechazada';
    case 'closed':
      return 'Cerrada';
    default:
      return status;
  }
}

function getClaimTypeLabel(type: ClaimCaseDTO['claimType']) {
  return type === 'advisor_governance' ? 'Gobernanza asesoria' : 'Control';
}

function getAccessRequestStatusLabel(status: AccessRequestDTO['status']) {
  switch (status) {
    case 'submitted':
      return 'Pendiente';
    case 'under_review':
      return 'En revision';
    case 'approved':
      return 'Aprobada';
    case 'rejected':
      return 'Rechazada';
    case 'cancelled':
      return 'Cancelada';
    default:
      return status;
  }
}

async function readJson<T>(response: Response): Promise<T | null> {
  return response.json().catch(() => null);
}

export default function IsaakForHoldedPage() {
  const [integration, setIntegration] = useState<IntegrationStatus | null>(null);
  const [memberships, setMemberships] = useState<MembershipDTO[]>([]);
  const [recipients, setRecipients] = useState<RecipientDTO[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequestDTO[]>([]);
  const [claims, setClaims] = useState<ClaimCaseDTO[]>([]);
  const [claimTimeline, setClaimTimeline] = useState<ClaimResolutionDTO[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [membershipDrafts, setMembershipDrafts] = useState<Record<string, MembershipDraft>>({});
  const [recipientDrafts, setRecipientDrafts] = useState<Record<string, RecipientDraft>>({});
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MembershipRole>('viewer');
  const [inviteSide, setInviteSide] = useState<MembershipSide>('client');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientType, setRecipientType] = useState<RecipientType>('client_contact');
  const [recipientMandatory, setRecipientMandatory] = useState(true);
  const [recipientClientSide, setRecipientClientSide] = useState(true);
  const [newClaimType, setNewClaimType] = useState<'control' | 'advisor_governance'>('control');
  const [newClaimReason, setNewClaimReason] = useState('');
  const [claimResolutionNotes, setClaimResolutionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [workingAction, setWorkingAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const load = async (keepNotice = false) => {
    setLoading(true);
    if (!keepNotice) setNotice(null);

    try {
      const [statusRes, membershipsRes, recipientsRes, accessRequestsRes, claimsRes] =
        await Promise.all([
          fetch('/api/integrations/accounting/status', { cache: 'no-store' }),
          fetch('/api/integrations/accounting/memberships', { cache: 'no-store' }),
          fetch('/api/integrations/accounting/recipients', {
            cache: 'no-store',
            headers: { 'x-isaak-entry-channel': 'dashboard' },
          }),
          fetch('/api/integrations/accounting/access-requests', {
            cache: 'no-store',
            headers: { 'x-isaak-entry-channel': 'dashboard' },
          }),
          fetch('/api/integrations/accounting/claims', {
            cache: 'no-store',
            headers: { 'x-isaak-entry-channel': 'dashboard' },
          }),
        ]);

      const [statusData, membershipsData, recipientsData, accessRequestsData, claimsData] =
        await Promise.all([
          readJson<IntegrationStatus>(statusRes),
          readJson<{ items?: MembershipDTO[] }>(membershipsRes),
          readJson<{ items?: RecipientDTO[] }>(recipientsRes),
          readJson<{ items?: AccessRequestDTO[] }>(accessRequestsRes),
          readJson<{ items?: ClaimCaseDTO[] }>(claimsRes),
        ]);

      if (!statusRes.ok || !statusData) {
        throw new Error(statusData?.error || 'No se pudo cargar el estado de Holded');
      }

      const nextMemberships = Array.isArray(membershipsData?.items) ? membershipsData.items : [];
      const nextRecipients = Array.isArray(recipientsData?.items) ? recipientsData.items : [];
      const nextAccessRequests = Array.isArray(accessRequestsData?.items)
        ? accessRequestsData.items
        : [];
      const nextClaims = Array.isArray(claimsData?.items) ? claimsData.items : [];

      setIntegration(statusData);
      setMemberships(nextMemberships);
      setRecipients(nextRecipients);
      setAccessRequests(nextAccessRequests);
      setClaims(nextClaims);
      setMembershipDrafts(
        Object.fromEntries(nextMemberships.map((item) => [item.membershipId, { role: item.role }]))
      );
      setRecipientDrafts(
        Object.fromEntries(
          nextRecipients.map((item) => [
            item.recipientId,
            {
              recipientType: item.recipientType,
              isMandatory: item.isMandatory,
              isClientSide: item.isClientSide,
              isConfirmed: item.isConfirmed,
            },
          ])
        )
      );
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'No se pudo cargar el panel Holded',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const loadClaimDetails = async (claimId: string) => {
    setWorkingAction(`claim-detail:${claimId}`);
    try {
      const response = await fetch(`/api/integrations/accounting/claims/${claimId}`, {
        cache: 'no-store',
        headers: { 'x-isaak-entry-channel': 'dashboard' },
      });
      const data = await readJson<ClaimDetailsResponse & { error?: string }>(response);
      if (!response.ok || !data) {
        throw new Error(data?.error || 'No se pudo cargar el detalle de la reclamacion');
      }

      setSelectedClaimId(claimId);
      setClaimTimeline(data.timeline || []);
    } catch (error) {
      setNotice({
        tone: 'error',
        text:
          error instanceof Error ? error.message : 'No se pudo cargar el detalle de la reclamacion',
      });
    } finally {
      setWorkingAction(null);
    }
  };

  const runAction = async (actionKey: string, task: () => Promise<void>) => {
    setWorkingAction(actionKey);
    try {
      await task();
    } finally {
      setWorkingAction(null);
    }
  };

  const connectionBadge = useMemo(
    () => getHoldedConnectionBadge(integration?.connection ?? null),
    [integration?.connection]
  );
  const governanceBadges = useMemo(
    () => getHoldedGovernanceBadges(integration?.governanceFlags ?? null),
    [integration?.governanceFlags]
  );
  const banners = useMemo(
    () =>
      getHoldedStatusBanners({
        connection: integration?.connection ?? null,
        governanceFlags: integration?.governanceFlags ?? null,
        availableActions: integration?.availableActions ?? null,
      }),
    [integration?.availableActions, integration?.connection, integration?.governanceFlags]
  );

  const selectedClaim = claims.find((item) => item.claimId === selectedClaimId) ?? null;
  const membershipsTotal = memberships.length;
  const recipientsTotal = recipients.length;
  const claimsOpen = claims.filter((item) =>
    ['submitted', 'acknowledged', 'under_review', 'awaiting_response'].includes(item.status)
  ).length;
  const disconnectBlocked = integration?.availableActions?.disconnect.blocked ?? true;
  const openClaimBlocked = integration?.availableActions?.openClaim.blocked ?? false;

  const requestConfirmation = (dialog: ConfirmDialogState) => {
    setConfirmDialog(dialog);
  };

  const runConfirmedAction = async () => {
    if (!confirmDialog) return;
    const action = confirmDialog.onConfirm;
    setConfirmDialog(null);
    await action();
  };

  const disconnectIntegration = () => {
    requestConfirmation({
      title: 'Desconectar empresa',
      description:
        'Esta accion detendra el acceso a Holded hasta que vuelvas a conectar la cuenta desde el panel.',
      confirmLabel: 'Desconectar',
      tone: 'danger',
      onConfirm: async () => {
        await runAction('disconnect', async () => {
          const response = await fetch('/api/integrations/accounting/disconnect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-isaak-entry-channel': 'dashboard',
            },
            body: JSON.stringify({ reauthConfirmed: true }),
          });
          const data = await readJson<{ error?: string }>(response);
          if (!response.ok) {
            throw new Error(data?.error || 'No se pudo desconectar Holded');
          }
          setNotice({ tone: 'success', text: 'Holded desconectado.' });
          await load(true);
        }).catch((error) => {
          setNotice({
            tone: 'error',
            text: error instanceof Error ? error.message : 'No se pudo desconectar Holded',
          });
        });
      },
    });
  };

  const inviteMembershipAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction('invite-membership', async () => {
      const response = await fetch('/api/integrations/accounting/memberships/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole, side: inviteSide }),
      });
      const data = await readJson<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'No se pudo invitar al usuario');
      }
      setInviteEmail('');
      setNotice({ tone: 'success', text: 'Usuario invitado al panel del conector.' });
      await load(true);
    }).catch((error) => {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'No se pudo invitar al usuario',
      });
    });
  };

  const saveMembershipRole = async (membershipId: string) => {
    const draft = membershipDrafts[membershipId];
    if (!draft) return;
    await runAction(`membership-role:${membershipId}`, async () => {
      const response = await fetch(`/api/integrations/accounting/memberships/${membershipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: draft.role }),
      });
      const data = await readJson<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'No se pudo actualizar el rol');
      }
      setNotice({ tone: 'success', text: 'Rol actualizado.' });
      await load(true);
    }).catch((error) => {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'No se pudo actualizar el rol',
      });
    });
  };

  const changeMembershipStatus = async (
    membershipId: string,
    status: 'active' | 'invited' | 'disabled'
  ) => {
    await runAction(`membership-status:${membershipId}:${status}`, async () => {
      const response = await fetch(`/api/integrations/accounting/memberships/${membershipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await readJson<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'No se pudo actualizar el estado del usuario');
      }
      setNotice({ tone: 'success', text: 'Estado de usuario actualizado.' });
      await load(true);
    }).catch((error) => {
      setNotice({
        tone: 'error',
        text:
          error instanceof Error ? error.message : 'No se pudo actualizar el estado del usuario',
      });
    });
  };

  const removeMembershipAction = (membershipId: string) => {
    requestConfirmation({
      title: 'Eliminar usuario',
      description: 'Esta persona dejara de tener acceso a esta conexion.',
      confirmLabel: 'Eliminar usuario',
      tone: 'danger',
      onConfirm: async () => {
        await runAction(`membership-remove:${membershipId}`, async () => {
          const response = await fetch(`/api/integrations/accounting/memberships/${membershipId}`, {
            method: 'DELETE',
          });
          const data = await readJson<{ ok?: boolean; error?: string }>(response);
          if (!response.ok || !data?.ok) {
            throw new Error(data?.error || 'No se pudo eliminar la membership');
          }
          setNotice({ tone: 'success', text: 'Usuario retirado de la conexion.' });
          await load(true);
        }).catch((error) => {
          setNotice({
            tone: 'error',
            text: error instanceof Error ? error.message : 'No se pudo eliminar la membership',
          });
        });
      },
    });
  };

  const createRecipientAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction('recipient-create', async () => {
      const response = await fetch('/api/integrations/accounting/recipients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-isaak-entry-channel': 'dashboard',
        },
        body: JSON.stringify({
          email: recipientEmail.trim(),
          recipientType,
          isMandatory: recipientMandatory,
          isClientSide: recipientClientSide,
        }),
      });
      const data = await readJson<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'No se pudo crear el destinatario');
      }
      setRecipientEmail('');
      setNotice({ tone: 'success', text: 'Destinatario anadido.' });
      await load(true);
    }).catch((error) => {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'No se pudo crear el destinatario',
      });
    });
  };

  const saveRecipientAction = async (recipientId: string) => {
    const draft = recipientDrafts[recipientId];
    if (!draft) return;
    await runAction(`recipient-save:${recipientId}`, async () => {
      const response = await fetch(`/api/integrations/accounting/recipients/${recipientId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-isaak-entry-channel': 'dashboard',
        },
        body: JSON.stringify(draft),
      });
      const data = await readJson<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'No se pudo actualizar el destinatario');
      }
      setNotice({ tone: 'success', text: 'Destinatario actualizado.' });
      await load(true);
    }).catch((error) => {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'No se pudo actualizar el destinatario',
      });
    });
  };

  const removeRecipientAction = (recipientId: string) => {
    requestConfirmation({
      title: 'Eliminar destinatario',
      description:
        'Vas a retirar un destinatario de avisos. Revisa antes si sigue existiendo un recipient cliente obligatorio.',
      confirmLabel: 'Eliminar destinatario',
      tone: 'danger',
      onConfirm: async () => {
        await runAction(`recipient-remove:${recipientId}`, async () => {
          const response = await fetch(`/api/integrations/accounting/recipients/${recipientId}`, {
            method: 'DELETE',
            headers: { 'x-isaak-entry-channel': 'dashboard' },
          });
          const data = await readJson<{ ok?: boolean; error?: string }>(response);
          if (!response.ok || !data?.ok) {
            throw new Error(data?.error || 'No se pudo eliminar el destinatario');
          }
          setNotice({ tone: 'success', text: 'Destinatario retirado.' });
          await load(true);
        }).catch((error) => {
          setNotice({
            tone: 'error',
            text: error instanceof Error ? error.message : 'No se pudo eliminar el destinatario',
          });
        });
      },
    });
  };

  const resolveAccessRequestAction = (accessRequestId: string, status: 'approved' | 'rejected') => {
    requestConfirmation({
      title: status === 'approved' ? 'Aprobar solicitud' : 'Rechazar solicitud',
      description:
        status === 'approved'
          ? 'Se concedera acceso a la conexion y se actualizara la gobernanza del panel.'
          : 'La solicitud de acceso quedara cerrada sin conceder permisos.',
      confirmLabel: status === 'approved' ? 'Aprobar solicitud' : 'Rechazar solicitud',
      tone: status === 'approved' ? 'primary' : 'danger',
      onConfirm: async () => {
        await runAction(`access-request:${accessRequestId}:${status}`, async () => {
          const response = await fetch(
            `/api/integrations/accounting/access-requests/${accessRequestId}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'x-isaak-entry-channel': 'dashboard',
              },
              body: JSON.stringify({ status }),
            }
          );
          const data = await readJson<{ ok?: boolean; error?: string }>(response);
          if (!response.ok || !data?.ok) {
            throw new Error(data?.error || 'No se pudo resolver la solicitud de acceso');
          }
          setNotice({
            tone: 'success',
            text: status === 'approved' ? 'Solicitud aprobada.' : 'Solicitud rechazada.',
          });
          await load(true);
        }).catch((error) => {
          setNotice({
            tone: 'error',
            text:
              error instanceof Error ? error.message : 'No se pudo resolver la solicitud de acceso',
          });
        });
      },
    });
  };

  const createClaimAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction('claim-create', async () => {
      const response = await fetch('/api/integrations/accounting/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-isaak-entry-channel': 'dashboard',
        },
        body: JSON.stringify({ claimType: newClaimType, reason: newClaimReason.trim() }),
      });
      const data = await readJson<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'No se pudo crear la reclamacion');
      }
      setNewClaimReason('');
      setNotice({ tone: 'success', text: 'Reclamacion abierta.' });
      await load(true);
    }).catch((error) => {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'No se pudo crear la reclamacion',
      });
    });
  };

  const updateClaimStatusAction = (
    claimId: string,
    status: 'under_review' | 'resolved_approved' | 'resolved_rejected'
  ) => {
    if (status !== 'under_review' && !claimResolutionNotes.trim()) {
      setNotice({
        tone: 'error',
        text: 'Anade notas de resolucion antes de aprobar o rechazar una reclamacion.',
      });
      return;
    }

    requestConfirmation({
      title:
        status === 'under_review'
          ? 'Pasar claim a revision'
          : status === 'resolved_approved'
            ? 'Aprobar claim'
            : 'Rechazar claim',
      description:
        status === 'under_review'
          ? 'La reclamacion pasara al estado de revision interna.'
          : status === 'resolved_approved'
            ? 'La reclamacion se aprobara y se cerrara con el resultado correspondiente.'
            : 'La reclamacion se rechazara y se cerrara con el resultado correspondiente.',
      confirmLabel:
        status === 'under_review'
          ? 'Pasar a revision'
          : status === 'resolved_approved'
            ? 'Aprobar claim'
            : 'Rechazar claim',
      tone: status === 'resolved_approved' ? 'primary' : 'danger',
      onConfirm: async () => {
        await runAction(`claim-update:${claimId}:${status}`, async () => {
          const response = await fetch(`/api/integrations/accounting/claims/${claimId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-isaak-entry-channel': 'dashboard',
            },
            body: JSON.stringify({
              status,
              resolutionNotes: claimResolutionNotes.trim() || null,
              outcome:
                status === 'resolved_approved'
                  ? 'claim_approved'
                  : status === 'resolved_rejected'
                    ? 'claim_rejected'
                    : null,
            }),
          });
          const data = await readJson<{ ok?: boolean; error?: string }>(response);
          if (!response.ok || !data?.ok) {
            throw new Error(data?.error || 'No se pudo actualizar la reclamacion');
          }
          setNotice({ tone: 'success', text: 'Reclamacion actualizada.' });
          setClaimResolutionNotes('');
          await load(true);
          await loadClaimDetails(claimId);
        }).catch((error) => {
          setNotice({
            tone: 'error',
            text: error instanceof Error ? error.message : 'No se pudo actualizar la reclamacion',
          });
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/integrations"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Conector Holded</h1>
          <p className="mt-1 text-sm text-slate-600">
            Panel admin para conexion, gobernanza, usuarios, recipients y reclamaciones.
          </p>
        </div>
      </div>

      {notice ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${noticeClasses(notice.tone)}`}>
          {notice.text}
        </div>
      ) : null}

      {banners.length > 0 ? (
        <section className="space-y-3">
          {banners.map((banner) => (
            <article
              key={banner.key}
              className={`rounded-2xl border px-4 py-4 text-sm ${bannerToneClasses(banner.tone)}`}
            >
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{banner.title}</div>
                  <p className="mt-1 leading-6">{banner.message}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0b6cfb]">
              Verifactu Business
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              {getHoldedConnectionStatusLabel(integration?.connection?.status)}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Gestiona el estado tecnico y operativo de la conexion sin salir del panel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              label={connectionBadge.label}
              variant={badgeVariantToUiVariant(connectionBadge.variant)}
            />
            {governanceBadges.map((badge) => (
              <StatusBadge
                key={badge.key}
                label={badge.label}
                variant={badgeVariantToUiVariant(badge.variant)}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Usuarios
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{membershipsTotal}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Destinatarios
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{recipientsTotal}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Claims abiertas
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{claimsOpen}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Ultima validacion
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {formatDateTime(integration?.connection?.lastValidatedAt || integration?.lastSyncAt)}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/dashboard/integrations/isaak-for-holded/connect"
            className="inline-flex items-center justify-center rounded-full bg-[#0b6cfb] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#095edb]"
          >
            {integration?.connection?.status === 'connected'
              ? 'Actualizar conexion'
              : 'Conectar Holded'}
          </Link>
          <button
            onClick={() => void load()}
            disabled={loading || Boolean(workingAction)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw className="h-4 w-4" />
            Refrescar
          </button>
          <button
            onClick={disconnectIntegration}
            disabled={Boolean(workingAction) || disconnectBlocked}
            className={buttonClasses()}
          >
            Desconectar
          </button>
        </div>

        {disconnectBlocked ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            {integration?.availableActions?.disconnect.reason}
          </div>
        ) : null}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Usuarios y permisos</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Ajusta roles, activa accesos y cubre el lado cliente para cerrar la gobernanza.
                </p>
              </div>
              {integration?.availableActions?.manageMembers.blocked ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {integration.availableActions.manageMembers.reason}
                </div>
              ) : null}
            </div>

            <form onSubmit={inviteMembershipAction} className="mt-5 grid gap-3 md:grid-cols-4">
              <input
                className={fieldClasses()}
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="email@empresa.com"
                type="email"
              />
              <select
                className={fieldClasses()}
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as MembershipRole)}
              >
                {membershipRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {getMembershipRoleLabel(role as MembershipDTO['role'])}
                  </option>
                ))}
              </select>
              <select
                className={fieldClasses()}
                value={inviteSide}
                onChange={(event) => setInviteSide(event.target.value as MembershipSide)}
              >
                {membershipSideOptions.map((side) => (
                  <option key={side} value={side}>
                    {getSideLabel(side)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className={buttonClasses(true)}
                disabled={!inviteEmail.trim() || Boolean(workingAction)}
              >
                Invitar usuario
              </button>
            </form>

            <div className="mt-5 space-y-3">
              {memberships.length === 0 ? (
                <PanelEmptyState message="No hay usuarios asociados todavia." />
              ) : null}

              {memberships.map((membership) => {
                const draft = membershipDrafts[membership.membershipId] ?? {
                  role: membership.role,
                };
                const statusActionLabel =
                  membership.status === 'disabled'
                    ? 'Reactivar'
                    : membership.status === 'invited'
                      ? 'Activar'
                      : 'Deshabilitar';
                const statusActionTarget = membership.status === 'disabled' ? 'active' : 'disabled';

                return (
                  <article
                    key={membership.membershipId}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {membership.name || membership.email}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">{membership.email}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          label={getMembershipRoleLabel(membership.role)}
                          variant="info"
                        />
                        <StatusBadge
                          label={getMembershipStatusLabel(membership.status)}
                          variant="neutral"
                        />
                        <StatusBadge label={getSideLabel(membership.side)} variant="neutral" />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                      <select
                        className={fieldClasses()}
                        value={draft.role}
                        onChange={(event) =>
                          setMembershipDrafts((current) => ({
                            ...current,
                            [membership.membershipId]: {
                              role: event.target.value as MembershipRole,
                            },
                          }))
                        }
                      >
                        {membershipRoleOptions.map((role) => (
                          <option key={role} value={role}>
                            {getMembershipRoleLabel(role as MembershipDTO['role'])}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={buttonClasses()}
                        disabled={Boolean(workingAction)}
                        onClick={() => void saveMembershipRole(membership.membershipId)}
                      >
                        Guardar rol
                      </button>
                      <button
                        type="button"
                        className={buttonClasses()}
                        disabled={Boolean(workingAction)}
                        onClick={() =>
                          void changeMembershipStatus(
                            membership.membershipId,
                            statusActionTarget as 'active' | 'disabled'
                          )
                        }
                      >
                        {statusActionLabel}
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">
                        Confirmado: {formatDateTime(membership.confirmedAt)}
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-700 hover:text-rose-800"
                        disabled={Boolean(workingAction)}
                        onClick={() => void removeMembershipAction(membership.membershipId)}
                      >
                        Eliminar usuario
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Solicitudes de acceso</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Revisa peticiones pendientes y conviertelas en acceso real cuando proceda.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {accessRequests.length} solicitudes
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {accessRequests.length === 0 ? (
                <PanelEmptyState message="No hay solicitudes pendientes o historicas." />
              ) : null}

              {accessRequests.map((request) => {
                const actionable =
                  request.status === 'submitted' || request.status === 'under_review';
                return (
                  <article
                    key={request.requestId}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {request.requester.name ||
                            request.requester.email ||
                            'Solicitud sin actor'}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {request.requester.email || 'Sin email'}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          {request.requestedRole
                            ? `Rol solicitado: ${getMembershipRoleLabel(request.requestedRole)}`
                            : 'Sin rol solicitado'}
                        </div>
                      </div>
                      <StatusBadge
                        label={getAccessRequestStatusLabel(request.status)}
                        variant="info"
                      />
                    </div>

                    {request.message ? (
                      <p className="mt-3 text-sm leading-6 text-slate-700">{request.message}</p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">
                        Creada: {formatDateTime(request.createdAt)}
                      </div>
                      {actionable ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={buttonClasses(true)}
                            disabled={Boolean(workingAction)}
                            onClick={() =>
                              void resolveAccessRequestAction(request.requestId, 'approved')
                            }
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            className={buttonClasses()}
                            disabled={Boolean(workingAction)}
                            onClick={() =>
                              void resolveAccessRequestAction(request.requestId, 'rejected')
                            }
                          >
                            Rechazar
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Destinatarios y avisos</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Mantiene recipients activos del lado cliente y evita huecos de gobernanza.
                </p>
              </div>
              {integration?.availableActions?.manageRecipients.blocked ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {integration.availableActions.manageRecipients.reason}
                </div>
              ) : null}
            </div>

            <form onSubmit={createRecipientAction} className="mt-5 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className={fieldClasses()}
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  placeholder="avisos@empresa.com"
                  type="email"
                />
                <select
                  className={fieldClasses()}
                  value={recipientType}
                  onChange={(event) => setRecipientType(event.target.value as RecipientType)}
                >
                  {recipientTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {getRecipientTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={recipientMandatory}
                    onChange={(event) => setRecipientMandatory(event.target.checked)}
                  />
                  Obligatorio
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={recipientClientSide}
                    onChange={(event) => setRecipientClientSide(event.target.checked)}
                  />
                  Lado cliente
                </label>
              </div>

              <button
                type="submit"
                className={buttonClasses(true)}
                disabled={!recipientEmail.trim() || Boolean(workingAction)}
              >
                Anadir destinatario
              </button>
            </form>

            <div className="mt-5 space-y-3">
              {recipients.length === 0 ? (
                <PanelEmptyState message="No hay recipients activos." />
              ) : null}

              {recipients.map((recipient) => {
                const draft = recipientDrafts[recipient.recipientId] ?? {
                  recipientType: recipient.recipientType,
                  isMandatory: recipient.isMandatory,
                  isClientSide: recipient.isClientSide,
                  isConfirmed: recipient.isConfirmed,
                };

                return (
                  <article
                    key={recipient.recipientId}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {recipient.email}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <StatusBadge
                            label={getRecipientTypeLabel(recipient.recipientType)}
                            variant="info"
                          />
                          <StatusBadge
                            label={recipient.isClientSide ? 'Cliente' : 'No cliente'}
                            variant="neutral"
                          />
                          <StatusBadge
                            label={recipient.isMandatory ? 'Obligatorio' : 'Opcional'}
                            variant="neutral"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <select
                        className={fieldClasses()}
                        value={draft.recipientType}
                        onChange={(event) =>
                          setRecipientDrafts((current) => ({
                            ...current,
                            [recipient.recipientId]: {
                              ...draft,
                              recipientType: event.target.value as RecipientType,
                            },
                          }))
                        }
                      >
                        {recipientTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {getRecipientTypeLabel(type)}
                          </option>
                        ))}
                      </select>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={draft.isMandatory}
                            onChange={(event) =>
                              setRecipientDrafts((current) => ({
                                ...current,
                                [recipient.recipientId]: {
                                  ...draft,
                                  isMandatory: event.target.checked,
                                },
                              }))
                            }
                          />
                          Obligatorio
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={draft.isClientSide}
                            onChange={(event) =>
                              setRecipientDrafts((current) => ({
                                ...current,
                                [recipient.recipientId]: {
                                  ...draft,
                                  isClientSide: event.target.checked,
                                },
                              }))
                            }
                          />
                          Cliente
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={draft.isConfirmed}
                            onChange={(event) =>
                              setRecipientDrafts((current) => ({
                                ...current,
                                [recipient.recipientId]: {
                                  ...draft,
                                  isConfirmed: event.target.checked,
                                },
                              }))
                            }
                          />
                          Confirmado
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap justify-between gap-3">
                      <button
                        type="button"
                        className={buttonClasses()}
                        disabled={Boolean(workingAction)}
                        onClick={() => void saveRecipientAction(recipient.recipientId)}
                      >
                        Guardar destinatario
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-700 hover:text-rose-800"
                        disabled={Boolean(workingAction)}
                        onClick={() => void removeRecipientAction(recipient.recipientId)}
                      >
                        Eliminar destinatario
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Claims y disputas</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Revisa incidencias de control y gestiona su resolucion desde el panel.
                </p>
              </div>
              {openClaimBlocked ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {integration?.availableActions?.openClaim.reason}
                </div>
              ) : null}
            </div>

            <form onSubmit={createClaimAction} className="mt-5 space-y-3">
              <select
                className={fieldClasses()}
                value={newClaimType}
                onChange={(event) =>
                  setNewClaimType(event.target.value as 'control' | 'advisor_governance')
                }
              >
                <option value="control">Control</option>
                <option value="advisor_governance">Gobernanza asesoria</option>
              </select>
              <textarea
                className="min-h-[112px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                value={newClaimReason}
                onChange={(event) => setNewClaimReason(event.target.value)}
                placeholder="Explica el motivo de la reclamacion"
              />
              <button
                type="submit"
                className={buttonClasses(true)}
                disabled={!newClaimReason.trim() || Boolean(workingAction) || openClaimBlocked}
              >
                Abrir claim
              </button>
            </form>

            <div className="mt-5 space-y-3">
              {claims.length === 0 ? (
                <PanelEmptyState message="No hay claims registradas." />
              ) : null}

              {claims.map((claim) => {
                const actionable = !['resolved_approved', 'resolved_rejected', 'closed'].includes(
                  claim.status
                );
                return (
                  <article key={claim.claimId} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {getClaimTypeLabel(claim.claimType)}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{claim.reason}</p>
                        <div className="mt-2 text-xs text-slate-500">
                          Creada: {formatDateTime(claim.createdAt)}
                        </div>
                      </div>
                      <StatusBadge label={getClaimStatusLabel(claim.status)} variant="info" />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={buttonClasses()}
                        disabled={Boolean(workingAction)}
                        onClick={() => void loadClaimDetails(claim.claimId)}
                      >
                        {selectedClaimId === claim.claimId ? 'Actualizar detalle' : 'Ver detalle'}
                      </button>
                      {actionable ? (
                        <>
                          <button
                            type="button"
                            className={buttonClasses()}
                            disabled={Boolean(workingAction)}
                            onClick={() =>
                              void updateClaimStatusAction(claim.claimId, 'under_review')
                            }
                          >
                            En revision
                          </button>
                          <button
                            type="button"
                            className={buttonClasses(true)}
                            disabled={Boolean(workingAction)}
                            onClick={() =>
                              void updateClaimStatusAction(claim.claimId, 'resolved_approved')
                            }
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            className={buttonClasses()}
                            disabled={Boolean(workingAction)}
                            onClick={() =>
                              void updateClaimStatusAction(claim.claimId, 'resolved_rejected')
                            }
                          >
                            Rechazar
                          </button>
                        </>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {selectedClaim ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Detalle de claim</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {getClaimTypeLabel(selectedClaim.claimType)} ·{' '}
                    {getClaimStatusLabel(selectedClaim.status)}
                  </p>
                </div>
                <StatusBadge label={getClaimStatusLabel(selectedClaim.status)} variant="info" />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">Motivo</div>
                <p className="mt-2 leading-6">{selectedClaim.reason}</p>
              </div>

              <div className="mt-4 space-y-3">
                <label className="text-sm font-medium text-slate-900">Notas de resolucion</label>
                <textarea
                  className="min-h-[96px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                  value={claimResolutionNotes}
                  onChange={(event) => setClaimResolutionNotes(event.target.value)}
                  placeholder="Anade contexto para la revision o el cierre"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttonClasses()}
                  disabled={Boolean(workingAction)}
                  onClick={() =>
                    void updateClaimStatusAction(selectedClaim.claimId, 'under_review')
                  }
                >
                  Pasar a revision
                </button>
                <button
                  type="button"
                  className={buttonClasses(true)}
                  disabled={Boolean(workingAction)}
                  onClick={() =>
                    void updateClaimStatusAction(selectedClaim.claimId, 'resolved_approved')
                  }
                >
                  Aprobar claim
                </button>
                <button
                  type="button"
                  className={buttonClasses()}
                  disabled={Boolean(workingAction)}
                  onClick={() =>
                    void updateClaimStatusAction(selectedClaim.claimId, 'resolved_rejected')
                  }
                >
                  Rechazar claim
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <div className="text-sm font-semibold text-slate-900">Timeline</div>
                {claimTimeline.length === 0 ? (
                  <PanelEmptyState message="Sin eventos registrados todavia." />
                ) : null}
                {claimTimeline.map((event) => (
                  <article
                    key={event.resolutionId}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{event.action}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {event.previousStatus ? `${event.previousStatus} -> ` : ''}
                          {event.nextStatus}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDateTime(event.createdAt)}
                      </div>
                    </div>
                    {event.notes ? (
                      <p className="mt-2 text-sm leading-6 text-slate-700">{event.notes}</p>
                    ) : null}
                    {event.actor ? (
                      <div className="mt-2 text-xs text-slate-500">
                        Actor: {event.actor.name || event.actor.email || event.actor.userId}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>

      <ConfirmActionModal
        isOpen={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? 'Confirmar accion'}
        description={confirmDialog?.description ?? ''}
        confirmLabel={confirmDialog?.confirmLabel ?? 'Confirmar'}
        tone={confirmDialog?.tone ?? 'danger'}
        isWorking={Boolean(workingAction)}
        onClose={() => setConfirmDialog(null)}
        onConfirm={runConfirmedAction}
      />
    </div>
  );
}
