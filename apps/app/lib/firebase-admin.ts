import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";

let adminApp: App | undefined;
let authInstance: Auth | undefined;

function getCredentialsFromEnv() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error("Missing Firebase Admin credentials: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, or FIREBASE_ADMIN_PRIVATE_KEY");
  }

  // Replace literal \n with actual newlines
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  return { projectId, clientEmail, privateKey };
}

export function getFirebaseAdminApp(): App {
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

export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;

  const app = getFirebaseAdminApp();
  authInstance = getAuth(app);
  return authInstance;
}

export async function verifyIdToken(idToken: string) {
  const auth = getFirebaseAuth();
  return auth.verifyIdToken(idToken, true);
}
