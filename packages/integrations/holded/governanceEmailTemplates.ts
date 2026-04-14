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
