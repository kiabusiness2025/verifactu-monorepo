/**
 * Extrae el primer nombre del usuario desde un string (nombre completo o email)
 * @param nameOrEmail string
 * @returns string
 */
/**
 * Unificada: Extrae el primer nombre del usuario desde objeto o string
 * Prioridad:
 * 1. displayName (si existe, extrae primer nombre)
 * 2. name (si existe, extrae primer nombre)
 * 3. email (parte antes del @, capitalizado)
 * 4. string plano (primer palabra, capitalizado)
 * 5. Fallback: "Usuario"
 */
export function getUserFirstName(userOrString?: { displayName?: string, name?: string, email?: string } | string | null): string {
  if (!userOrString) return "Usuario";
  if (typeof userOrString === "string") {
    const trimmed = userOrString.trim();
    if (trimmed.includes("@")) {
      const emailName = trimmed.split("@")[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    const firstName = trimmed.split(" ")[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  }
  if (userOrString.displayName) {
    const firstName = userOrString.displayName.trim().split(" ")[0];
    if (firstName) return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  }
  if (userOrString.name) {
    const firstName = userOrString.name.trim().split(" ")[0];
    if (firstName) return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  }
  if (userOrString.email) {
    const emailName = userOrString.email.split("@")[0];
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  }
  return "Usuario";
}
