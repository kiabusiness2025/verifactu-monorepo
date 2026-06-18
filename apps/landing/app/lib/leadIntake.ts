import { AuthProvider, UsageEventType, prisma } from '@verifactu/db';
import {
  buildFullName,
  getCnaeSectionLabel,
  getHoldedRoleLabel,
  normalizeOptionalEmail,
  normalizeOptionalText,
  normalizeTaxId,
  splitNameParts,
  type HoldedRoleValue,
} from '@verifactu/utils';
import type { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { getSessionPayloadFromRequest } from './sessionAuth';
import { renderCorporateBrandedEmail, renderCorporatePlainTextEmail } from './emailTemplates';

export type ContactLeadInput = {
  flow: 'contact';
  name: string;
  email: string;
  companyName: string | null;
  phone: string | null;
  message: string | null;
};

export type HoldedTrialInput = {
  flow: 'holded_trial';
  name: string;
  email: string;
  taxId: string | null;
  roleInCompany: HoldedRoleValue | null;
  businessSectorCode: string | null;
};

export type LandingLeadInput = ContactLeadInput | HoldedTrialInput;

export type PersistedLeadResult = {
  flow: LandingLeadInput['flow'];
  userId: string;
  tenantId: string;
  fullName: string;
  email: string;
  companyName: string | null;
  phone: string | null;
  taxId: string | null;
  roleInCompany: HoldedRoleValue | null;
  businessSectorCode: string | null;
  businessSectorLabel: string | null;
  message: string | null;
};

function escapeHtml(text: string) {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (match) => map[match]);
}

function parseEmailList(...values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => (value || '').split(/[;,]/))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function resolveReplyToEmail() {
  const candidates = parseEmailList(
    process.env.LANDING_REPLY_TO_EMAIL,
    process.env.SUPPORT_EMAIL,
    'soporte@isaak.app'
  );

  return candidates[0] || 'soporte@isaak.app';
}

function resolveSenderEmail() {
  const raw =
    process.env.RESEND_FROM_ISAAK?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    process.env.FROM_EMAIL?.trim();
  return raw || 'Isaak <noreply@isaak.app>';
}

function looksLikeGeneratedTenantName(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() || '';
  return (
    !normalized ||
    normalized.startsWith('empresa ') ||
    normalized.startsWith('workspace ') ||
    normalized.endsWith(' workspace')
  );
}

function buildTenantName(input: {
  companyName: string | null;
  taxId: string | null;
  fullName: string;
  email: string;
}) {
  if (input.companyName) return input.companyName;
  if (input.taxId) return `Empresa ${input.taxId}`;
  const nameParts = splitNameParts(input.fullName);
  if (nameParts.firstName) return `Empresa de ${nameParts.firstName}`;
  return `Empresa ${input.email.split('@')[0] || 'nueva'}`;
}

export async function persistLandingLead(
  request: NextRequest,
  input: LandingLeadInput
): Promise<PersistedLeadResult> {
  const session = await getSessionPayloadFromRequest(request);
  const fullName = normalizeOptionalText(input.name) || input.name.trim();
  const normalizedEmail = normalizeOptionalEmail(input.email) || input.email.trim().toLowerCase();
  const companyName = input.flow === 'contact' ? normalizeOptionalText(input.companyName) : null;
  const phone = input.flow === 'contact' ? normalizeOptionalText(input.phone) : null;
  const message = input.flow === 'contact' ? normalizeOptionalText(input.message) : null;
  const taxId = input.flow === 'holded_trial' ? normalizeTaxId(input.taxId) : null;
  const roleInCompany = input.flow === 'holded_trial' ? input.roleInCompany : null;
  const businessSectorCode =
    input.flow === 'holded_trial' ? normalizeOptionalText(input.businessSectorCode) : null;
  const businessSectorLabel = getCnaeSectionLabel({ code: businessSectorCode, fallback: null });
  const nameParts = splitNameParts(fullName);
  const preferredName = nameParts.firstName || fullName;
  const canonicalFullName = buildFullName(nameParts.firstName, nameParts.lastName) || fullName;
  const tenantDraftName = buildTenantName({
    companyName,
    taxId,
    fullName: canonicalFullName,
    email: normalizedEmail,
  });

  const persisted = await prisma.$transaction(async (tx) => {
    let user = session?.uid
      ? await tx.user.findFirst({
          where: { authSubject: session.uid },
          select: { id: true, email: true, authSubject: true, authProvider: true },
        })
      : null;

    if (!user) {
      user = await tx.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, email: true, authSubject: true, authProvider: true },
      });
    }

    const canUpdateUserEmail = !user?.email || user.email.toLowerCase() === normalizedEmail;

    if (user) {
      await tx.user.update({
        where: { id: user.id },
        data: {
          ...(canUpdateUserEmail ? { email: normalizedEmail } : {}),
          name: canonicalFullName,
          firstName: nameParts.firstName || undefined,
          lastName: nameParts.lastName || undefined,
          ...(phone ? { phone } : {}),
          ...(session?.uid && !user.authSubject
            ? { authSubject: session.uid, authProvider: AuthProvider.FIREBASE }
            : {}),
        },
      });
    } else {
      user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: canonicalFullName,
          firstName: nameParts.firstName || undefined,
          lastName: nameParts.lastName || undefined,
          ...(phone ? { phone } : {}),
          ...(session?.uid
            ? { authSubject: session.uid, authProvider: AuthProvider.FIREBASE }
            : {}),
        },
        select: { id: true, email: true, authSubject: true, authProvider: true },
      });
    }

    let membership = session?.tenantId
      ? await tx.membership.findFirst({
          where: {
            tenantId: session.tenantId,
            userId: user.id,
            status: 'active',
          },
          select: { tenantId: true },
        })
      : null;

    if (!membership) {
      membership = await tx.membership.findFirst({
        where: { userId: user.id, status: 'active' },
        orderBy: { createdAt: 'asc' },
        select: { tenantId: true },
      });
    }

    let tenant = membership
      ? await tx.tenant.findUnique({
          where: { id: membership.tenantId },
          select: { id: true, name: true, legalName: true, nif: true },
        })
      : null;

    if (!tenant) {
      tenant = await tx.tenant.create({
        data: {
          name: tenantDraftName,
          legalName: companyName || undefined,
          nif: taxId || undefined,
        },
        select: { id: true, name: true, legalName: true, nif: true },
      });

      await tx.membership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'owner',
          status: 'active',
        },
      });
    } else {
      const tenantUpdate: Record<string, string> = {};
      if (companyName && looksLikeGeneratedTenantName(tenant.name)) {
        tenantUpdate.name = companyName;
      }
      if (companyName && !tenant.legalName) {
        tenantUpdate.legalName = companyName;
      }
      if (taxId && !tenant.nif) {
        tenantUpdate.nif = taxId;
      }
      if (Object.keys(tenantUpdate).length > 0) {
        tenant = await tx.tenant.update({
          where: { id: tenant.id },
          data: tenantUpdate,
          select: { id: true, name: true, legalName: true, nif: true },
        });
      }
    }

    await tx.userPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, preferredTenantId: tenant.id },
      update: { preferredTenantId: tenant.id },
    });

    await tx.tenantProfile.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        source: 'manual',
        legalName: companyName || tenant.legalName || tenantDraftName,
        tradeName: companyName || tenant.name || tenantDraftName,
        ...(taxId ? { taxId } : {}),
        representative: canonicalFullName,
        ...(roleInCompany ? { representativeRole: roleInCompany } : {}),
        email: normalizedEmail,
        ...(phone ? { phone } : {}),
        ...(businessSectorCode ? { cnaeCode: businessSectorCode } : {}),
        ...(businessSectorLabel
          ? { cnae: businessSectorLabel, cnaeText: businessSectorLabel }
          : {}),
      },
      update: {
        legalName: companyName || undefined,
        tradeName: companyName || undefined,
        ...(taxId ? { taxId } : {}),
        representative: canonicalFullName,
        ...(roleInCompany ? { representativeRole: roleInCompany } : {}),
        email: normalizedEmail,
        ...(phone ? { phone } : {}),
        ...(businessSectorCode ? { cnaeCode: businessSectorCode } : {}),
        ...(businessSectorLabel
          ? { cnae: businessSectorLabel, cnaeText: businessSectorLabel }
          : {}),
      },
    });

    await tx.isaakOnboardingProfile.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id,
        },
      },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        preferredName,
        companyName: companyName || tenant.name || tenantDraftName,
        ...(roleInCompany ? { roleInCompany } : {}),
        ...(businessSectorLabel ? { businessSector: businessSectorLabel } : {}),
        ...(phone ? { phone } : {}),
      },
      update: {
        preferredName,
        companyName: companyName || undefined,
        ...(roleInCompany ? { roleInCompany } : {}),
        ...(businessSectorLabel ? { businessSector: businessSectorLabel } : {}),
        ...(phone ? { phone } : {}),
      },
    });

    await tx.usageEvent.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        type: UsageEventType.LEAD_CREATED,
        source: 'landing',
        path: input.flow === 'contact' ? '/api/send-lead' : '/api/holded-trial',
        metadataJson: {
          flow: input.flow,
          companyName,
          taxId,
          roleInCompany,
          businessSectorCode,
          message,
        },
      },
    });

    return {
      userId: user.id,
      tenantId: tenant.id,
    };
  });

  return {
    flow: input.flow,
    userId: persisted.userId,
    tenantId: persisted.tenantId,
    fullName: canonicalFullName,
    email: normalizedEmail,
    companyName,
    phone,
    taxId,
    roleInCompany,
    businessSectorCode,
    businessSectorLabel,
    message,
  };
}

export async function notifyLandingLead(result: PersistedLeadResult) {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    console.warn('landing lead intake: RESEND_API_KEY not configured, notification skipped');
    return;
  }

  const recipients = parseEmailList(
    process.env.LEAD_EMAIL,
    process.env.SUPPORT_EMAIL,
    'soporte@verifactu.business'
  );

  if (recipients.length === 0) {
    return;
  }

  const resend = new Resend(resendApiKey);
  const operationalReplyTo = resolveReplyToEmail();
  const isInvestorLead =
    result.flow === 'contact' && (result.message || '').toLowerCase().includes('inversor');
  const subject =
    result.flow === 'holded_trial'
      ? `Solicitud Holded: ${result.fullName}`
      : isInvestorLead
        ? `Nuevo contacto inversores: ${result.fullName}`
        : `Nuevo contacto: ${result.fullName}`;

  const detailsHtml =
    result.flow === 'holded_trial'
      ? `
        <p style="margin:0 0 8px 0;"><strong>Flujo:</strong> Solicitud de prueba gratuita de Holded</p>
        <p style="margin:0 0 8px 0;"><strong>Nombre:</strong> ${escapeHtml(result.fullName)}</p>
        <p style="margin:0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(result.email)}</p>
        ${result.taxId ? `<p style="margin:0 0 8px 0;"><strong>CIF / NIF:</strong> ${escapeHtml(result.taxId)}</p>` : ''}
        ${result.roleInCompany ? `<p style="margin:0 0 8px 0;"><strong>Rol:</strong> ${escapeHtml(getHoldedRoleLabel(result.roleInCompany) || result.roleInCompany)}</p>` : ''}
        ${result.businessSectorLabel ? `<p style="margin:0 0 8px 0;"><strong>Sector:</strong> ${escapeHtml(result.businessSectorLabel)}</p>` : ''}
        <p style="margin:0 0 8px 0;"><strong>User ID:</strong> ${escapeHtml(result.userId)}</p>
        <p style="margin:0;"><strong>Tenant ID:</strong> ${escapeHtml(result.tenantId)}</p>
      `
      : `
        <p style="margin:0 0 8px 0;"><strong>Flujo:</strong> ${isInvestorLead ? 'Inversores' : 'Contacto landing'}</p>
        <p style="margin:0 0 8px 0;"><strong>Nombre:</strong> ${escapeHtml(result.fullName)}</p>
        <p style="margin:0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(result.email)}</p>
        ${result.companyName ? `<p style="margin:0 0 8px 0;"><strong>Empresa:</strong> ${escapeHtml(result.companyName)}</p>` : ''}
        ${result.phone ? `<p style="margin:0 0 8px 0;"><strong>Telefono:</strong> ${escapeHtml(result.phone)}</p>` : ''}
        ${result.message ? `<p style="margin:0 0 8px 0;"><strong>Mensaje:</strong></p><p style="margin:0 0 8px 0;white-space:pre-line;">${escapeHtml(result.message)}</p>` : ''}
        <p style="margin:0 0 8px 0;"><strong>User ID:</strong> ${escapeHtml(result.userId)}</p>
        <p style="margin:0;"><strong>Tenant ID:</strong> ${escapeHtml(result.tenantId)}</p>
      `;

  const adminHtml = renderCorporateBrandedEmail({
    variant: isInvestorLead ? 'inversores' : 'comercial',
    title: isInvestorLead ? 'Nuevo contacto de inversores' : 'Nuevo lead desde isaak.app',
    intro:
      result.flow === 'holded_trial'
        ? 'Se ha registrado una nueva solicitud de prueba de Holded en la landing.'
        : 'Se ha registrado un nuevo contacto en la landing de isaak.app.',
    bodyHtml: detailsHtml,
    footerNote: 'Notificacion automatica del flujo de formularios de isaak.app.',
  });

  const adminTextLines =
    result.flow === 'holded_trial'
      ? [
          'Flujo: Solicitud de prueba gratuita de Holded',
          `Nombre: ${result.fullName}`,
          `Email: ${result.email}`,
          ...(result.taxId ? [`CIF / NIF: ${result.taxId}`] : []),
          ...(result.roleInCompany
            ? [`Rol: ${getHoldedRoleLabel(result.roleInCompany) || result.roleInCompany}`]
            : []),
          ...(result.businessSectorLabel ? [`Sector: ${result.businessSectorLabel}`] : []),
          `User ID: ${result.userId}`,
          `Tenant ID: ${result.tenantId}`,
        ]
      : [
          `Flujo: ${isInvestorLead ? 'Inversores' : 'Contacto landing'}`,
          `Nombre: ${result.fullName}`,
          `Email: ${result.email}`,
          ...(result.companyName ? [`Empresa: ${result.companyName}`] : []),
          ...(result.phone ? [`Telefono: ${result.phone}`] : []),
          ...(result.message ? [`Mensaje: ${result.message}`] : []),
          `User ID: ${result.userId}`,
          `Tenant ID: ${result.tenantId}`,
        ];

  const adminText = renderCorporatePlainTextEmail({
    variant: isInvestorLead ? 'inversores' : 'comercial',
    title: isInvestorLead ? 'Nuevo contacto de inversores' : 'Nuevo lead desde isaak.app',
    intro:
      result.flow === 'holded_trial'
        ? 'Se ha registrado una nueva solicitud de prueba de Holded en la landing.'
        : 'Se ha registrado un nuevo contacto en la landing de isaak.app.',
    lines: adminTextLines,
    footerNote: 'Notificacion automatica del flujo de formularios de isaak.app.',
  });

  const senderEmail = resolveSenderEmail();

  try {
    await resend.emails.send({
      from: senderEmail,
      to: recipients,
      subject,
      reply_to: result.email,
      html: adminHtml,
      text: adminText,
    });
  } catch (error) {
    console.error('landing lead notification failed:', error);
  }

  // Confirmacion al remitente para cerrar el flujo de correo despues del formulario.
  const acknowledgementHtml = renderCorporateBrandedEmail({
    variant: isInvestorLead ? 'inversores' : 'comercial',
    title: isInvestorLead
      ? 'Hemos recibido tu solicitud para inversores'
      : 'Hemos recibido tu solicitud',
    intro:
      'Gracias por contactar con Isaak. El equipo revisara tu solicitud y respondera lo antes posible.',
    bodyHtml: `
      <p style="margin:0 0 8px 0;"><strong>Nombre:</strong> ${escapeHtml(result.fullName)}</p>
      <p style="margin:0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(result.email)}</p>
      ${result.companyName ? `<p style="margin:0 0 8px 0;"><strong>Empresa:</strong> ${escapeHtml(result.companyName)}</p>` : ''}
      ${isInvestorLead ? '<p style="margin:0;">Tu solicitud ha sido enviada al equipo fundador.</p>' : '<p style="margin:0;">Tu solicitud ha sido enviada al equipo correspondiente.</p>'}
    `,
    footerNote:
      'Si necesitas ampliar informacion, responde a este correo o escribe a soporte@isaak.app.',
  });

  const acknowledgementText = renderCorporatePlainTextEmail({
    variant: isInvestorLead ? 'inversores' : 'comercial',
    title: isInvestorLead
      ? 'Hemos recibido tu solicitud para inversores'
      : 'Hemos recibido tu solicitud',
    intro:
      'Gracias por contactar con Isaak. El equipo revisara tu solicitud y respondera lo antes posible.',
    lines: [
      `Nombre: ${result.fullName}`,
      `Email: ${result.email}`,
      ...(result.companyName ? [`Empresa: ${result.companyName}`] : []),
      isInvestorLead
        ? 'Tu solicitud ha sido enviada al equipo fundador.'
        : 'Tu solicitud ha sido enviada al equipo correspondiente.',
    ],
    footerNote:
      'Si necesitas ampliar informacion, responde a este correo o escribe a soporte@isaak.app.',
  });

  try {
    await resend.emails.send({
      from: senderEmail,
      to: result.email,
      subject: isInvestorLead
        ? 'Solicitud recibida · isaak.app'
        : 'Hemos recibido tu solicitud · isaak.app',
      reply_to: operationalReplyTo,
      html: acknowledgementHtml,
      text: acknowledgementText,
    });
  } catch (error) {
    console.error('landing lead acknowledgement failed:', error);
  }
}
