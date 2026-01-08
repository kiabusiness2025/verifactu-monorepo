import type { User } from "firebase/auth";

export async function mintSessionCookie(user: User) {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("Failed to mint session cookie");
}

export async function clearSessionCookie() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
}
