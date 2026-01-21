// Auth Package
export { authOptions } from './config/authOptions';
export { requireAuth, requireRole } from './middleware/guards';
export { UserRole, type AuthUser, type SessionUser } from './types';
export { checkPermission, canImpersonate } from './utils/permissions';
