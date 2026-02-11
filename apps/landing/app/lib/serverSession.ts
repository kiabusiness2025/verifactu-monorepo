import type { User } from "firebase/auth";

export type MintSessionOptions = {
  rememberDevice?: boolean;
};

/**
 * Mints a new session cookie by calling the backend session endpoint
 * with the user's Firebase ID token.
 */
export async function mintSessionCookie(user: User, options: MintSessionOptions = {}) {
  try {
    const rememberDevice = options.rememberDevice ?? true;
    console.log("[🧠 AUTH] mintSessionCookie START", {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
    });

    const idToken = await user.getIdToken(true);
    console.log("[🧠 AUTH] Got Firebase idToken");

    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, rememberDevice }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[🧠 AUTH] Session endpoint failed", {
        status: res.status,
        statusText: res.statusText,
        error: errorText,
      });
      throw new Error(
        `Session mint failed (${res.status}): ${errorText || res.statusText}`
      );
    }

    const result = await res.json();
    console.log("[🧠 AUTH] Session cookie minted successfully");
    return result;
  } catch (error) {
    console.error("[🧠 AUTH] mintSessionCookie ERROR", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Clears the session cookie by calling the logout endpoint.
 */
export async function clearSessionCookie() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
}
