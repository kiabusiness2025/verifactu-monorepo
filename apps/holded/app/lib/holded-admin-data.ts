import { prisma } from './prisma';

export function formatAdminDate(value: Date | null | undefined) {
  if (!value) return 'Sin dato';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export async function getHoldedAdminSummary() {
  const since7d = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

  const [
    totalUsers,
    verifiedEmails,
    connectedUsers,
    onboardedUsers,
    usersWithChat,
    recentConnectionErrors,
    recentUsers,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count({ where: { authProvider: 'FIREBASE' } }),
    prisma.user.count({
      where: { authProvider: 'FIREBASE', emailVerified: { not: null } },
    }),
    prisma.externalConnection.count({
      where: { provider: 'holded', connectionStatus: 'connected' },
    }),
    prisma.userOnboarding.count({ where: { completedAt: { not: null } } }),
    prisma.isaakConversation
      .groupBy({
        by: ['userId'],
        where: { context: 'holded_free_dashboard' },
      })
      .then((rows) => rows.length),
    prisma.externalConnectionAuditLog.count({
      where: {
        action: 'connection_error',
        createdAt: { gte: since7d },
      },
    }),
    prisma.user.findMany({
      where: { authProvider: 'FIREBASE' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        email: true,
        createdAt: true,
        emailVerified: true,
      },
    }),
    prisma.externalConnectionAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        action: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  return {
    totalUsers,
    verifiedEmails,
    connectedUsers,
    onboardedUsers,
    usersWithChat,
    recentConnectionErrors,
    recentUsers,
    recentActivity,
  };
}

export async function getHoldedAdminUsers(input: {
  q?: string;
  verification?: string;
  onboarding?: string;
  connection?: string;
}) {
  const q = input.q?.trim();

  return prisma.user.findMany({
    where: {
      authProvider: 'FIREBASE',
      ...(input.verification === 'verified'
        ? { emailVerified: { not: null } }
        : input.verification === 'pending'
          ? { emailVerified: null }
          : {}),
      ...(input.onboarding === 'completed'
        ? { onboarding: { is: { completedAt: { not: null } } } }
        : input.onboarding === 'pending'
          ? {
              OR: [{ onboarding: null }, { onboarding: { is: { completedAt: null } } }],
            }
          : {}),
      ...(input.connection === 'connected'
        ? {
            tenantMemberships: {
              some: {
                status: 'active',
                tenant: {
                  externalConnections: {
                    some: { provider: 'holded', connectionStatus: 'connected' },
                  },
                },
              },
            },
          }
        : input.connection === 'disconnected'
          ? {
              OR: [
                {
                  tenantMemberships: {
                    none: { status: 'active' },
                  },
                },
                {
                  tenantMemberships: {
                    some: {
                      status: 'active',
                      tenant: {
                        externalConnections: {
                          none: { provider: 'holded', connectionStatus: 'connected' },
                        },
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              {
                tenantMemberships: {
                  some: {
                    tenant: {
                      OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { legalName: { contains: q, mode: 'insensitive' } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isBlocked: true,
      createdAt: true,
      emailVerified: true,
      onboarding: {
        select: {
          completedAt: true,
        },
      },
      tenantMemberships: {
        where: { status: 'active' },
        take: 1,
        select: {
          tenant: {
            select: {
              id: true,
              name: true,
              legalName: true,
              externalConnections: {
                where: { provider: 'holded' },
                select: {
                  connectionStatus: true,
                  connectedAt: true,
                  lastValidatedAt: true,
                },
              },
            },
          },
        },
      },
      isaakConversations: {
        orderBy: { lastActivity: 'desc' },
        take: 1,
        select: {
          lastActivity: true,
          messageCount: true,
        },
      },
      externalConnectionAuditLogs: {
        where: { action: { in: ['dashboard_accessed', 'login_completed'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          createdAt: true,
        },
      },
      _count: {
        select: {
          isaakConversations: true,
        },
      },
    },
  });
}

export async function getHoldedAdminConnections(input: { q?: string; status?: string }) {
  const q = input.q?.trim();

  return prisma.externalConnection.findMany({
    where: {
      provider: 'holded',
      ...(input.status && input.status !== 'all' ? { connectionStatus: input.status } : {}),
      ...(q
        ? {
            OR: [
              {
                tenant: {
                  name: { contains: q, mode: 'insensitive' },
                },
              },
              {
                tenant: {
                  legalName: { contains: q, mode: 'insensitive' },
                },
              },
              {
                connectedByUser: {
                  email: { contains: q, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      tenantId: true,
      connectionStatus: true,
      connectedAt: true,
      lastValidatedAt: true,
      updatedAt: true,
      tenant: {
        select: {
          name: true,
          legalName: true,
        },
      },
      connectedByUser: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      auditLogs: {
        where: { status: 'failed' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          action: true,
          createdAt: true,
          responsePayload: true,
        },
      },
    },
  });
}

export async function getHoldedAdminActivity() {
  const [users, onboarding, audits] = await Promise.all([
    prisma.user.findMany({
      where: { authProvider: 'FIREBASE' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        email: true,
        createdAt: true,
        emailVerified: true,
      },
    }),
    prisma.userOnboarding.findMany({
      where: { completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 50,
      select: {
        completedAt: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        demoTenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.externalConnectionAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        action: true,
        status: true,
        createdAt: true,
        responsePayload: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  function normalizeActivityType(type: string) {
    if (type === 'connect') return 'holded_connected';
    if (type === 'disconnect') return 'holded_disconnected';
    return type;
  }

  return [
    ...users.map((user) => ({
      id: `lead-${user.id}`,
      type: 'lead_created',
      createdAt: user.createdAt,
      user,
      tenant: null,
      detail: 'Usuario registrado',
    })),
    ...users
      .filter((user) => user.emailVerified)
      .map((user) => ({
        id: `verified-${user.id}`,
        type: 'email_verified',
        createdAt: user.emailVerified as Date,
        user,
        tenant: null,
        detail: 'Correo verificado',
      })),
    ...onboarding.map((item) => ({
      id: `onboarding-${item.user.id}`,
      type: 'onboarding_completed',
      createdAt: item.completedAt as Date,
      user: item.user,
      tenant: item.demoTenant,
      detail: 'Onboarding completado',
    })),
    ...audits.map((item) => ({
      id: item.id,
      type: normalizeActivityType(item.action),
      createdAt: item.createdAt,
      user: item.user,
      tenant: item.tenant,
      detail:
        typeof item.responsePayload === 'object' &&
        item.responsePayload &&
        'error' in item.responsePayload
          ? String((item.responsePayload as Record<string, unknown>).error || item.action)
          : item.action,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 150);
}

export async function getHoldedAdminUserDetail(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      emailVerified: true,
      isBlocked: true,
      blockedAt: true,
      blockedReason: true,
      onboarding: {
        select: {
          completedAt: true,
          createdAt: true,
        },
      },
      tenantMemberships: {
        where: { status: 'active' },
        select: {
          role: true,
          tenant: {
            select: {
              id: true,
              name: true,
              legalName: true,
              nif: true,
              externalConnections: {
                where: { provider: 'holded' },
                select: {
                  id: true,
                  connectionStatus: true,
                  connectedAt: true,
                  lastValidatedAt: true,
                  updatedAt: true,
                  auditLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    select: {
                      action: true,
                      status: true,
                      createdAt: true,
                      responsePayload: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      isaakConversations: {
        orderBy: { lastActivity: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          createdAt: true,
          lastActivity: true,
          messageCount: true,
        },
      },
      externalConnectionAuditLogs: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          action: true,
          status: true,
          createdAt: true,
          responsePayload: true,
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}
