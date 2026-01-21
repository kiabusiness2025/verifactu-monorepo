import { UserRole, type SessionUser, type SupportScope } from '../types';

export function checkPermission(
  user: SessionUser,
  permission: keyof SupportScope
): boolean {
  // Admins have all permissions
  if (user.role === UserRole.ADMIN) {
    return true;
  }

  // Support users check their scope
  if (user.role === UserRole.SUPPORT && user.supportScope) {
    return user.supportScope[permission];
  }

  // Regular users have no admin permissions
  return false;
}

export function canImpersonate(user: SessionUser): boolean {
  // Only ADMIN and SUPPORT can impersonate
  return user.role === UserRole.ADMIN || user.role === UserRole.SUPPORT;
}

export function isImpersonating(user: SessionUser): boolean {
  return !!user.impersonating;
}

export function getActualUserId(user: SessionUser): string {
  if (user.impersonating) {
    return user.impersonating.originalUserId;
  }
  return user.id;
}
