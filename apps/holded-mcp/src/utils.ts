/**
 * Acepta una fecha como Unix timestamp (segundos), número en string, o ISO 8601,
 * y devuelve siempre un Unix timestamp en segundos como string. Lanza si no parsea.
 *
 * Holded espera Unix timestamps en segundos en sus query params y bodies, pero
 * pedirle a un LLM que produzca timestamps Unix es propenso a errores; aceptamos
 * ISO 8601 para que Claude pueda pasar valores naturales.
 */
export function toUnixSecondsString(input: string | number): string {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return Math.floor(input).toString();
  }

  const trimmed = String(input).trim();

  // Numérico puro: asumimos que ya viene en segundos. Si parece milisegundos
  // (>= 10^12) lo convertimos.
  if (/^-?\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      throw new Error(`Invalid timestamp: ${trimmed}`);
    }
    return (n >= 1e12 ? Math.floor(n / 1000) : n).toString();
  }

  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) {
    throw new Error(`Invalid date: ${trimmed}. Use ISO 8601 or Unix timestamp.`);
  }

  return Math.floor(ms / 1000).toString();
}

/**
 * Variante numérica para campos que el JSON body de Holded pide como número.
 */
export function toUnixSecondsNumber(input: string | number): number {
  return Number(toUnixSecondsString(input));
}
