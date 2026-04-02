import { User } from 'firebase/auth';
import { getPreferredFirstName, getPreferredFullName } from '@/lib/personName';

/**
 * Extrae el primer nombre del usuario desde Firebase Auth
 *
 * Prioridad:
 * 1. displayName (si existe, extrae primer nombre)
 * 2. email (extrae parte antes del @)
 * 3. Fallback: "Usuario"
 *
 * @param user - Usuario de Firebase Auth
 * @returns Primer nombre del usuario
 *
 * @example
 * // Con displayName
 * getUserFirstName({ displayName: "Ksenia Ivanova" }) // "Ksenia"
 *
 * // Con email
 * getUserFirstName({ email: "kiabusiness2025@gmail.com" }) // "kiabusiness2025"
 *
 * // Sin datos
 * getUserFirstName({}) // "Usuario"
 */
export function getUserFirstName(user: User | null | undefined): string {
  return getPreferredFirstName({
    fullName: user?.displayName,
    email: user?.email,
    fallback: 'Usuario',
  });
}

/**
 * Extrae el nombre completo del usuario
 *
 * @param user - Usuario de Firebase Auth
 * @returns Nombre completo del usuario
 */
export function getUserFullName(user: User | null | undefined): string {
  return getPreferredFullName({
    fullName: user?.displayName,
    email: user?.email,
    fallback: 'Usuario',
  });
}

/**
 * Genera iniciales del usuario para avatar
 *
 * @param user - Usuario de Firebase Auth
 * @returns Iniciales (1 o 2 letras mayúsculas)
 *
 * @example
 * getUserInitials({ displayName: "Ksenia Ivanova" }) // "KI"
 * getUserInitials({ email: "john@example.com" }) // "J"
 */
export function getUserInitials(user: User | null | undefined): string {
  if (!user) return 'U';

  // Si tiene displayName, extraer iniciales de nombres
  if (user.displayName) {
    const names = user.displayName.trim().split(' ').filter(Boolean);
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    if (names.length === 1 && names[0].length > 0) {
      return names[0][0].toUpperCase();
    }
  }

  // Si tiene email, usar primera letra
  if (user.email) {
    return user.email[0].toUpperCase();
  }

  return 'U';
}
