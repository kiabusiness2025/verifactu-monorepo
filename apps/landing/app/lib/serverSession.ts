import type { User } from "firebase/auth";

/**
 * Mints a new session cookie by calling the backend session endpoint
 * with the user's Firebase ID token.
 */
export async function mintSessionCookie(user: User) {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("Failed to mint session cookie");
  return res.json();
}

/**
 * Clears the session cookie by calling the logout endpoint.
 */
export async function clearSessionCookie() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
}
