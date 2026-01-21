export enum UserRole {
  USER = 'USER',
  SUPPORT = 'SUPPORT',
  ADMIN = 'ADMIN',
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
  supportScope?: SupportScope | null;
  companyId?: string | null;
}

export interface SessionUser extends AuthUser {
  impersonating?: {
    originalUserId: string;
    originalRole: UserRole;
    targetUserId: string;
    targetCompanyId?: string;
    startedAt: Date;
  };
}

export interface SupportScope {
  canViewDocuments: boolean;
  canEmitInvoices: boolean;
  canModifySettings: boolean;
  canAccessBilling: boolean;
  canDeleteData: boolean;
}

export const DEFAULT_SUPPORT_SCOPE: SupportScope = {
  canViewDocuments: true,
  canEmitInvoices: false,
  canModifySettings: false,
  canAccessBilling: true,
  canDeleteData: false,
};

export interface AuditLog {
  id: string;
  actorUserId: string;
  targetUserId?: string;
  targetCompanyId?: string;
  action: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
}
