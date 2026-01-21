/**
 * Firebase Authentication Helpers for Client App
 * Verifies Firebase tokens and manages SQL user synchronization
 */

import { prisma, AuthProvider, User } from '@verifactu/db';
import { getFirebaseAuth } from '../firebase-admin';

export interface FirebaseTokenPayload {
  uid: string;
  email?: string;
  name?: string;
}

/**
 * Verifies a Firebase ID token from the Authorization header
 * @param authHeader - The Authorization header value (e.g., "Bearer <token>")
 * @returns Decoded token payload with uid, email, and name
 * @throws Error if token is invalid or missing
 */
export async function verifyFirebaseToken(
  authHeader: string | null
): Promise<FirebaseTokenPayload> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(token);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    throw new Error('Invalid Firebase token');
  }
}

/**
 * Gets or creates a SQL user from Firebase authentication data
 * This is the single source of truth for user data - SQL database
 *
 * Strategy:
 * 1. If user exists with matching authSubject (Firebase UID) -> return user
 * 2. If user exists with matching email but no authSubject -> link Firebase auth
 * 3. Otherwise -> create new user with Firebase auth
 *
 * @param uid - Firebase UID
 * @param email - User email from Firebase
 * @param name - User display name from Firebase
 * @returns The user record from SQL database
 */
export async function getOrCreateSqlUserFromFirebase(
  uid: string,
  email: string | undefined,
  name: string | undefined
): Promise<User> {
  if (!email) {
    throw new Error('Email is required for user creation');
  }

  // 1. Check if user exists with this Firebase UID
  let user = await prisma.user.findUnique({
    where: { authSubject: uid },
  });

  if (user) {
    return user;
  }

  // 2. Check if user exists with this email (legacy user or created from admin)
  user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    // Link Firebase auth to existing user
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        authProvider: AuthProvider.FIREBASE,
        authSubject: uid,
        name: name || user.name, // Update name if provided
      },
    });
    return user;
  }

  // 3. Create new user
  user = await prisma.user.create({
    data: {
      email,
      name: name || email.split('@')[0], // Use email prefix if no name
      authProvider: AuthProvider.FIREBASE,
      authSubject: uid,
    },
  });

  return user;
}

/**
 * Get user with their companies and memberships
 * Used by /api/app/me endpoint
 */
export async function getUserWithCompanies(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      companiesOwned: {
        include: {
          owner: {
            select: { id: true, email: true, name: true },
          },
        },
      },
      memberships: {
        include: {
          company: {
            include: {
              owner: {
                select: { id: true, email: true, name: true },
              },
            },
          },
        },
      },
    },
  });
}
