import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const firebaseConfig = {
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);