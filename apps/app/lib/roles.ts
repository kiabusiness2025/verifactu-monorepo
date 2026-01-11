export type Role = "owner" | "admin" | "member" | "asesor";

const order: Role[] = ["asesor", "member", "admin", "owner"];

export function roleAtLeast(actual: Role | null | undefined, required: Role): boolean {
  if (!actual) return false;
  return order.indexOf(actual) >= order.indexOf(required);
}

export function normalizeRole(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  if (lower === "owner" || lower === "admin" || lower === "member" || lower === "asesor") {
    return lower;
  }
  return null;
}

export const Roles = {
  all: order,
  default: "member" as Role,
};
