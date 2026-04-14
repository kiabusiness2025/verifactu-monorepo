function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function escapeHtml(value?: string | null) {
  const normalized = normalizeText(value) ?? '';
  return normalized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value?: Date | string | null) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Madrid',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function buildCard(title: string, body: string) {
  return `
    <div style="font-family: Arial, sans-serif; color:#1b2a3a; line-height:1.6; max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:18px; padding:24px;">
      <h2 style="margin:0 0 14px 0; color:#0d2b4a;">${escapeHtml(title)}</h2>
      ${body}
      <p style="margin:18px 0 0 0; color:#475569; font-size:13px;">Si necesitas ayuda, responde a este correo o escribe a <strong>soporte@verifactu.business</strong>.</p>
    </div>
  `;
}

function detail(label: string, value?: string | null) {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  return `<p style="margin:0 0 8px 0;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(normalized)}</p>`;
}

function renderRequestedRole(role?: string | null) {
  if (role === 'operator') return 'Operador';
  if (role === 'viewer') return 'Visualizador';
  if (role === 'company_admin') return 'Administrador de empresa';
  if (role === 'advisor_operator') return 'Operador de asesoría';
  return 'Sin rol especificado';
}

function renderClaimType(claimType?: string | null) {
  return claimType === 'advisor_governance' ? 'Gobernanza de asesoría' : 'Control de conexión';
}

function renderResolutionOutcome(status?: string | null) {
  if (status === 'approved' || status === 'resolved_approved') return 'aprobada';
  if (status === 'rejected' || status === 'resolved_rejected') return 'rechazada';
  if (status === 'under_review') return 'en revisión';
  return 'actualizada';
}

function renderOwnershipStatus(status?: string | null) {
  if (status === 'confirmed') return 'Confirmada';
  if (status === 'pending_confirmation') return 'Pendiente de confirmación';
  if (status === 'third_party_managed') return 'Gestionada por tercero';
  return 'Sin clasificar';
}

function renderChannelLabel(channel?: string | null) {
  return channel === 'chatgpt' ? 'ChatGPT' : 'Dashboard';
}

export function buildHighGovernanceRiskInternalEmail(input: {
  tenantDisplayName: string;
  channel?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  companyEmail?: string | null;
  contactPhone?: string | null;
  ownershipStatus?: string | null;
  managedByThirdParty?: boolean;
  clientAdminGap?: boolean;
  underClaimReview?: boolean;
  detectedAt?: Date | string | null;
  reviewUrl?: string | null;
}) {
  const occurredAt = formatDate(input.detectedAt) ?? 'ahora mismo';
  const actorSummary =
    normalizeText(input.actorName) || normalizeText(input.actorEmail) || 'No disponible';
  const reasons = [
    input.managedByThirdParty ? 'La conexión figura como gestionada por un tercero.' : null,
    input.clientAdminGap
      ? 'Sigue faltando un responsable cliente para cerrar la gobernanza.'
      : null,
    input.underClaimReview ? 'Existe una reclamación abierta o todavía en revisión.' : null,
    'La conexión está marcada con high governance risk y requiere revisión manual.',
  ].filter((value): value is string => Boolean(value));
  const reasonsHtml = reasons
    .map((reason) => `<li style="margin:0 0 8px 0;">${escapeHtml(reason)}</li>`)
    .join('');
  const reviewUrl = normalizeText(input.reviewUrl);

  return {
    subject: `Holded: riesgo alto de gobernanza detectado en ${input.tenantDisplayName}`,
    html: buildCard(
      'Riesgo alto de gobernanza detectado',
      `
        <p style="margin:0 0 14px 0;">Se ha detectado un estado de <strong>riesgo alto de gobernanza</strong> para <strong>${escapeHtml(input.tenantDisplayName)}</strong>.</p>
        ${detail('Canal', renderChannelLabel(input.channel))}
        ${detail('Actor', actorSummary)}
        ${detail('Correo empresa', input.companyEmail)}
        ${detail('Teléfono de contacto', input.contactPhone)}
        ${detail('Ownership status', renderOwnershipStatus(input.ownershipStatus))}
        ${detail('Detectado', occurredAt)}
        <div style="margin:16px 0;padding:16px;border-radius:14px;background:#fff7ed;border:1px solid #fdba74;">
          <p style="margin:0 0 10px 0;font-weight:700;">Motivos activos</p>
          <ul style="margin:0;padding-left:18px;">${reasonsHtml}</ul>
        </div>
        ${
          reviewUrl
            ? `<p style="margin:14px 0 0 0;">Revisa el caso en <a href="${escapeHtml(reviewUrl)}" style="color:#b42318;text-decoration:none;font-weight:600;">${escapeHtml(reviewUrl)}</a>.</p>`
            : ''
        }
      `
    ),
  };
}

export function buildAccessRequestCreatedEmail(input: {
  tenantDisplayName: string;
  requesterName: string;
  requesterEmail: string;
  requestedRole?: string | null;
  message?: string | null;
  createdAt?: Date | string | null;
}) {
  const occurredAt = formatDate(input.createdAt) ?? 'ahora mismo';
  return {
    subject: `Holded: nueva solicitud de acceso para ${input.tenantDisplayName}`,
    html: buildCard(
      'Nueva solicitud de acceso',
      `
        <p style="margin:0 0 14px 0;">Se ha registrado una nueva solicitud de acceso para <strong>${escapeHtml(input.tenantDisplayName)}</strong>.</p>
        ${detail('Solicitante', input.requesterName)}
        ${detail('Correo', input.requesterEmail)}
        ${detail('Rol solicitado', renderRequestedRole(input.requestedRole))}
        ${detail('Mensaje', input.message)}
        ${detail('Fecha', occurredAt)}
      `
    ),
  };
}

export function buildAccessRequestReceiptEmail(input: {
  requesterName: string;
  tenantDisplayName: string;
  requestedRole?: string | null;
}) {
  return {
    subject: `Holded: hemos recibido tu solicitud para ${input.tenantDisplayName}`,
    html: buildCard(
      'Solicitud de acceso recibida',
      `
        <p style="margin:0 0 14px 0;">Hola ${escapeHtml(input.requesterName)}, hemos recibido tu solicitud de acceso para <strong>${escapeHtml(input.tenantDisplayName)}</strong>.</p>
        ${detail('Rol solicitado', renderRequestedRole(input.requestedRole))}
        <p style="margin:0;">Te avisaremos por correo cuando haya una resolución.</p>
      `
    ),
  };
}

export function buildAccessRequestResolvedEmail(input: {
  requesterName: string;
  tenantDisplayName: string;
  status: string;
  requestedRole?: string | null;
}) {
  const outcome = input.status === 'approved' ? 'ha sido aprobada' : 'ha sido rechazada';
  return {
    subject: `Holded: tu solicitud para ${input.tenantDisplayName} ${input.status === 'approved' ? 'ha sido aprobada' : 'ha sido rechazada'}`,
    html: buildCard(
      'Solicitud de acceso resuelta',
      `
        <p style="margin:0 0 14px 0;">Hola ${escapeHtml(input.requesterName)}, tu solicitud de acceso para <strong>${escapeHtml(input.tenantDisplayName)}</strong> ${escapeHtml(outcome)}.</p>
        ${detail('Rol solicitado', renderRequestedRole(input.requestedRole))}
      `
    ),
  };
}

export function buildClaimCreatedEmail(input: {
  tenantDisplayName: string;
  requesterName: string;
  requesterEmail: string;
  claimType: string;
  reason: string;
  scope?: string | null;
  createdAt?: Date | string | null;
}) {
  const occurredAt = formatDate(input.createdAt) ?? 'ahora mismo';
  return {
    subject: `Holded: nueva reclamación abierta para ${input.tenantDisplayName}`,
    html: buildCard(
      'Nueva reclamación abierta',
      `
        <p style="margin:0 0 14px 0;">Se ha abierto una reclamación sobre <strong>${escapeHtml(input.tenantDisplayName)}</strong>.</p>
        ${detail('Tipo', renderClaimType(input.claimType))}
        ${detail('Solicitante', input.requesterName)}
        ${detail('Correo', input.requesterEmail)}
        ${detail('Motivo', input.reason)}
        ${detail('Ámbito', input.scope)}
        ${detail('Fecha', occurredAt)}
      `
    ),
  };
}

export function buildClaimReceiptEmail(input: {
  requesterName: string;
  tenantDisplayName: string;
  claimType: string;
}) {
  return {
    subject: `Holded: hemos recibido tu reclamación para ${input.tenantDisplayName}`,
    html: buildCard(
      'Reclamación recibida',
      `
        <p style="margin:0 0 14px 0;">Hola ${escapeHtml(input.requesterName)}, hemos recibido tu reclamación para <strong>${escapeHtml(input.tenantDisplayName)}</strong>.</p>
        ${detail('Tipo', renderClaimType(input.claimType))}
        <p style="margin:0;">La revisión seguirá su curso y te avisaremos cuando cambie el estado.</p>
      `
    ),
  };
}

export function buildClaimResolvedEmail(input: {
  requesterName: string;
  tenantDisplayName: string;
  status: string;
  claimType: string;
  outcome?: string | null;
  resolutionNotes?: string | null;
}) {
  const outcomeLabel = renderResolutionOutcome(input.status);
  return {
    subject: `Holded: tu reclamación para ${input.tenantDisplayName} ha sido ${outcomeLabel}`,
    html: buildCard(
      'Reclamación actualizada',
      `
        <p style="margin:0 0 14px 0;">Hola ${escapeHtml(input.requesterName)}, tu reclamación para <strong>${escapeHtml(input.tenantDisplayName)}</strong> ha sido ${escapeHtml(outcomeLabel)}.</p>
        ${detail('Tipo', renderClaimType(input.claimType))}
        ${detail('Resultado', input.outcome)}
        ${detail('Notas de resolución', input.resolutionNotes)}
      `
    ),
  };
}
