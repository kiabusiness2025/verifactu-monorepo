import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: App | undefined;

function getCredentialsFromEnv() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error("Faltan variables FIREBASE_ADMIN_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY");
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  return { projectId, clientEmail, privateKey };
}

export function getFirebaseAdminApp() {
  if (adminApp) return adminApp;
  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }

  const creds = getCredentialsFromEnv();
  adminApp = initializeApp({
    credential: cert({
      projectId: creds.projectId,
      clientEmail: creds.clientEmail,
      privateKey: creds.privateKey,
    }),
  });

  return adminApp;
}

export async function verifyIdToken(idToken: string) {
  const app = getFirebaseAdminApp();
  const auth = getAuth(app);
  return auth.verifyIdToken(idToken, true);
}
