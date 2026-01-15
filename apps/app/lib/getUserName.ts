/**
 * Utility para extraer el nombre del usuario desde Firebase Auth
 */

import { User } from 'firebase/auth';

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
  if (!user) return "Usuario";

  // 1. Intentar extraer desde displayName
  if (user.displayName) {
    const firstName = user.displayName.trim().split(' ')[0];
    if (firstName) return firstName;
  }

  // 2. Extraer desde email (parte antes del @)
  if (user.email) {
    const emailName = user.email.split('@')[0];
    // Capitalizar primera letra si es todo minúsculas
    if (emailName === emailName.toLowerCase()) {
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    return emailName;
  }

  // 3. Fallback
  return "Usuario";
}

/**
 * Extrae el nombre completo del usuario
 * 
 * @param user - Usuario de Firebase Auth
 * @returns Nombre completo del usuario
 */
export function getUserFullName(user: User | null | undefined): string {
  if (!user) return "Usuario";

  if (user.displayName) {
    return user.displayName.trim();
  }

  if (user.email) {
    return user.email.split('@')[0];
  }

  return "Usuario";
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
  if (!user) return "U";

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

  return "U";
}
