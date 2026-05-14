import {
  type HoldedDirectConversation,
  type HoldedDirectSession,
  type HoldedDirectSummary,
  type HoldedDirectTenant,
  type HoldedDirectUser,
} from '@/lib/holdedDirectAdmin';
import { formatDateTime, formatNumber } from '@/src/lib/formatters';
import {
  AlertTriangle,
  Building2,
  Clock3,
  Link2,
  MailWarning,
  MessageSquareText,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';

function badgeClasses(status: string) {
  return status === 'connected'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';
}

function statusLabel(status: string) {
  return status === 'connected' ? 'Conectado' : 'Desconectado';
}

function profileBadgeClasses(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'new':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'cancelled':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200';
  }
}

function profileStatusLabel(status: string) {
  switch (status) {
    case 'completed':
      return 'Completado';
    case 'new':
      return 'Nuevo';
    case 'cancelled':
      return 'Cancelado';
    default:
      return 'Pendiente';
  }
}

function reminderLabel(state: string) {
  switch (state) {
    case 'due':
      return 'Aviso pendiente';
    case 'sent_recently':
      return 'Avisado recientemente';
    case 'no_recipient':
      return 'Sin correo de contacto';
    default:
      return 'No necesita aviso';
  }
}

function SectionHeader({
  title,
  description,
  viewAllHref,
}: {
  title: string;
  description: string;
  viewAllHref?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      {viewAllHref ? (
        <Link
          href={viewAllHref}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Ver todo
        </Link>
      ) : null}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-6 text-sm text-slate-500">
      {message}
    </div>
  );
}

export function HoldedDirectSummaryCards({ summary }: { summary: HoldedDirectSummary }) {
  const cards = [
    {
      label: 'Usuarios conectados',
      value: formatNumber(summary.connectedUsers),
      hint: 'Con acceso activo al conector',
      icon: UserRound,
      accent: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Usuarios desconectados',
      value: formatNumber(summary.disconnectedUsers),
      hint: 'Con historial, pero sin conexión activa',
      icon: Link2,
      accent: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Tenants',
      value: formatNumber(summary.tenants),
      hint: 'Empresas con rastro del conector',
      icon: Building2,
      accent: 'bg-sky-50 text-sky-700',
    },
    {
      label: 'Conversaciones',
      value: formatNumber(summary.conversations),
      hint: 'Historial asociado a tenants del conector',
      icon: MessageSquareText,
      accent: 'bg-violet-50 text-violet-700',
    },
    {
      label: 'Sesiones activas',
      value: formatNumber(summary.activeSessions),
      hint: 'Sesiones web abiertas con conexión vigente',
      icon: Clock3,
      accent: 'bg-slate-100 text-slate-700',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article
            key={card.label}
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
              </div>
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${card.accent}`}
              >
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-500">{card.hint}</p>
          </article>
        );
      })}
    </div>
  );
}

export function HoldedDirectComplianceSummary({ summary }: { summary: HoldedDirectSummary }) {
  const items = [
    {
      label: 'Usuarios pendientes',
      value: summary.userProfiles.new + summary.userProfiles.pending,
      helper: `${summary.userProfiles.completed} completos`,
    },
    {
      label: 'Tenants pendientes',
      value: summary.tenantProfiles.new + summary.tenantProfiles.pending,
      helper: `${summary.tenantProfiles.completed} completos`,
    },
    {
      label: 'Perfiles cancelados',
      value: summary.userProfiles.cancelled + summary.tenantProfiles.cancelled,
      helper: 'Superaron el plazo de 7 dias',
    },
    {
      label: 'Correos duplicados',
      value: summary.duplicateEmailUsers,
      helper: 'Usuarios con conflicto de email',
    },
    {
      label: 'Recordatorios pendientes',
      value: summary.dueReminders,
      helper: 'Se revisan al abrir el panel',
    },
  ];

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <MailWarning className="h-4 w-4 text-slate-500" />
        Estado de perfiles
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {item.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {formatNumber(item.value)}
            </div>
            <div className="mt-1 text-xs text-slate-500">{item.helper}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HoldedDirectUsersSection({
  title,
  description,
  users,
  viewAllHref,
  id,
}: {
  title: string;
  description: string;
  users: HoldedDirectUser[];
  viewAllHref?: string;
  id?: string;
}) {
  const duplicateUsers = users.filter((user) => user.duplicateEmailConflict).length;

  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <SectionHeader title={title} description={description} viewAllHref={viewAllHref} />
      {duplicateUsers > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Hay {formatNumber(duplicateUsers)} usuarios con conflicto de correo normalizado. El panel
          los marca como pendientes hasta resolverlo.
        </div>
      ) : null}
      {users.length === 0 ? (
        <EmptyState message="No hay usuarios registrados todavía para este conector." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {users.map((user) => (
            <article
              key={user.userId}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-slate-900">
                    {user.userName || user.userEmail}
                  </h3>
                  <p className="mt-1 truncate text-sm text-slate-600">{user.userEmail}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                      user.isConnected ? 'connected' : 'disconnected'
                    )}`}
                  >
                    {user.isConnected ? 'Conectado' : 'Desconectado'}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${profileBadgeClasses(
                      user.profileStatus
                    )}`}
                  >
                    {profileStatusLabel(user.profileStatus)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Conversaciones
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {formatNumber(user.conversationCount)}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Sesiones activas
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {formatNumber(user.activeSessions)}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Última validación
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {user.lastValidatedAt ? formatDateTime(user.lastValidatedAt) : 'Sin validar'}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Nombre</div>
                  <div className="mt-2 text-sm text-slate-900">{user.firstName || 'Sin dato'}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Apellidos</div>
                  <div className="mt-2 text-sm text-slate-900">{user.lastName || 'Sin dato'}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Rol en la empresa</div>
                  <div className="mt-2 text-sm text-slate-900">
                    {user.roleInCompany || 'Sin dato'}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Teléfono</div>
                  <div className="mt-2 text-sm text-slate-900">{user.phone || 'Sin dato'}</div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Última conexión</div>
                  <div className="mt-2 text-sm text-slate-900">
                    {user.lastConnectedAt ? formatDateTime(user.lastConnectedAt) : 'Sin dato'}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Última actividad</div>
                  <div className="mt-2 text-sm text-slate-900">
                    {user.lastActivity ? formatDateTime(user.lastActivity) : 'Sin actividad'}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {user.duplicateEmailConflict ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {user.duplicateEmailCount} conflicto{user.duplicateEmailCount === 1 ? '' : 's'}{' '}
                    de email
                  </span>
                ) : null}
                {user.missingFields.length > 0 ? (
                  user.missingFields.map((field) => (
                    <span
                      key={`${user.userId}-${field}`}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {field}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    Perfil completo
                  </span>
                )}
              </div>

              {user.tenants.length > 0 ? (
                <div className="mt-5 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Tenants relacionados
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.tenants.map((tenant) => (
                      <span
                        key={`${user.userId}-${tenant.tenantId}`}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${badgeClasses(
                          tenant.connectionStatus
                        )}`}
                      >
                        <span className="truncate">{tenant.tenantLegalName}</span>
                        <span className="uppercase">{statusLabel(tenant.connectionStatus)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>Recordatorio: {reminderLabel(user.reminderState)}</span>
                <span>
                  Plazo:{' '}
                  {user.profileDeadlineAt ? formatDateTime(user.profileDeadlineAt) : 'Sin plazo'}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function HoldedDirectTenantsSection({
  title,
  description,
  tenants,
  viewAllHref,
  id,
}: {
  title: string;
  description: string;
  tenants: HoldedDirectTenant[];
  viewAllHref?: string;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <SectionHeader title={title} description={description} viewAllHref={viewAllHref} />
      {tenants.length === 0 ? (
        <EmptyState message="No hay tenants con actividad del conector todavía." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {tenants.map((tenant) => (
            <article
              key={tenant.tenantId}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-slate-900">
                    {tenant.tenantLegalName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">Tenant del conector directo</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                      tenant.connectionStatus
                    )}`}
                  >
                    {statusLabel(tenant.connectionStatus)}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${profileBadgeClasses(
                      tenant.profileStatus
                    )}`}
                  >
                    {profileStatusLabel(tenant.profileStatus)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Usuarios</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {formatNumber(tenant.usersCount)}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Conversaciones
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {formatNumber(tenant.conversationCount)}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Sesiones activas
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {formatNumber(tenant.activeSessions)}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <div className="font-semibold">NIF/CIF</div>
                  <div className="mt-2 text-sm text-slate-900">{tenant.taxId || 'Sin dato'}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Correo</div>
                  <div className="mt-2 text-sm text-slate-900">{tenant.email || 'Sin dato'}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Teléfono</div>
                  <div className="mt-2 text-sm text-slate-900">{tenant.phone || 'Sin dato'}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Representante</div>
                  <div className="mt-2 text-sm text-slate-900">
                    {tenant.representative || 'Sin dato'}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Rol representante</div>
                  <div className="mt-2 text-sm text-slate-900">
                    {tenant.representativeRole || 'Sin dato'}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Avisos</div>
                  <div className="mt-2 text-sm text-slate-900">
                    {formatNumber(tenant.notificationRecipients.length)} destinatarios
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Conectado</div>
                  <div className="mt-2 text-sm text-slate-900">
                    {tenant.connectedAt ? formatDateTime(tenant.connectedAt) : 'Sin dato'}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <div className="font-semibold">Desconectado</div>
                  <div className="mt-2 text-sm text-slate-900">
                    {tenant.disconnectedAt ? formatDateTime(tenant.disconnectedAt) : 'Sin dato'}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {tenant.missingFields.length > 0 ? (
                  tenant.missingFields.map((field) => (
                    <span
                      key={`${tenant.tenantId}-${field}`}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {field}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    Perfil completo
                  </span>
                )}
              </div>

              {tenant.lastError ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                  Último error: {tenant.lastError}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-500">
                <span>Recordatorio: {reminderLabel(tenant.reminderState)}</span>
                <span>
                  Plazo:{' '}
                  {tenant.profileDeadlineAt
                    ? formatDateTime(tenant.profileDeadlineAt)
                    : 'Sin plazo'}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function HoldedDirectConversationsSection({
  title,
  description,
  conversations,
  viewAllHref,
  id,
}: {
  title: string;
  description: string;
  conversations: HoldedDirectConversation[];
  viewAllHref?: string;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <SectionHeader title={title} description={description} viewAllHref={viewAllHref} />
      {conversations.length === 0 ? (
        <EmptyState message="Todavía no hay conversaciones guardadas para este conector." />
      ) : (
        <div className="grid gap-3">
          {conversations.map((conversation) => (
            <article
              key={conversation.conversationId}
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-slate-900">
                    {conversation.title || 'Conversación sin título'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {conversation.userName} · {conversation.userEmail}
                  </p>
                  <p className="text-sm text-slate-500">{conversation.tenantLegalName}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                    {formatNumber(conversation.messageCount)} mensajes
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                    {formatDateTime(conversation.lastActivity)}
                  </span>
                </div>
              </div>
              {conversation.summary ? (
                <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  {conversation.summary}
                </div>
              ) : null}
              <div className="mt-4 grid gap-2 lg:grid-cols-2">
                {conversation.recentMessages.map((message) => (
                  <div
                    key={message.messageId}
                    className="rounded-2xl border border-slate-200 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>{message.role === 'user' ? 'Usuario' : 'Respuesta'}</span>
                      <span>{formatDateTime(message.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{message.contentPreview}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function HoldedDirectSessionsSection({
  title,
  description,
  sessions,
  viewAllHref,
  id,
}: {
  title: string;
  description: string;
  sessions: HoldedDirectSession[];
  viewAllHref?: string;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <SectionHeader title={title} description={description} viewAllHref={viewAllHref} />
      {sessions.length === 0 ? (
        <EmptyState message="No hay sesiones activas abiertas ahora mismo." />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {sessions.map((session) => (
            <article
              key={session.sessionId}
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-slate-900">
                    {session.userName}
                  </h3>
                  <p className="truncate text-sm text-slate-600">{session.userEmail}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  Activa
                </span>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Caduca {formatDateTime(session.expiresAt)}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {session.tenants.map((tenant) => (
                  <span
                    key={`${session.sessionId}-${tenant.tenantId}`}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {tenant.tenantLegalName}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
