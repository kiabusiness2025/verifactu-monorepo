/**
 * Admin Authentication & Authorization
 * Protects all /api/admin/* routes with ADMIN_EMAILS allowlist
 */

import { getSessionPayload } from "./session";

/**
 * Get current user email from session
 */
async function getCurrentUserEmail(): Promise<string | null> {
  try {
    const payload = await getSessionPayload();
    return payload?.email ?? null;
  } catch (error) {
    console.error("Error getting user email:", error);
    return null;
  }
}

/**
 * Require admin privileges for the current request
 * Checks if user email is in ADMIN_EMAILS environment variable
 */
export async function requireAdmin(
  _req: Request
): Promise<{ email: string; userId: string }> {
  // Get admin emails from environment
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    throw new Error("ADMIN_EMAILS not configured");
  }

  // Get current user email and session
  const email = (await getCurrentUserEmail())?.toLowerCase() ?? "";
  const payload = await getSessionPayload();
  const userId = payload?.uid ?? "";

  // Check if user is admin
  if (!email || !adminEmails.includes(email)) {
    throw new Error("FORBIDDEN: Admin access required");
  }

  // Return admin info
  return {
    email,
    userId,
  };
}

/**
 * Check if current user is admin (without throwing)
 */
export async function isAdmin(): Promise<boolean> {
  try {
    await requireAdmin({} as Request);
    return true;
  } catch {
    return false;
  }
}
