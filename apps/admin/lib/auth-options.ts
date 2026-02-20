import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';

export const ADMIN_SESSION_SHORT_MAX_AGE_SECONDS = Number(
  process.env.ADMIN_SESSION_SHORT_MAX_AGE_SECONDS || 8 * 60 * 60
);
export const ADMIN_SESSION_REMEMBER_MAX_AGE_SECONDS = Number(
  process.env.ADMIN_SESSION_REMEMBER_MAX_AGE_SECONDS || 30 * 24 * 60 * 60
);

function getAdminAllowlist() {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const allowedEmail = (
    process.env.ADMIN_ALLOWED_EMAIL || 'support@verifactu.business'
  ).toLowerCase();
  const allowedDomain = (process.env.ADMIN_ALLOWED_DOMAIN || 'verifactu.business').toLowerCase();

  return { adminEmails, allowedEmail, allowedDomain };
}

// Provide sensible defaults in local dev to avoid NextAuth warnings.
if (process.env.NODE_ENV !== 'production') {
  if (!process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = 'http://localhost:3010';
  }
  if (!process.env.NEXTAUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = 'dev-admin-secret';
  }
}

const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
if (!googleClientId) {
  console.warn('[auth] GOOGLE_CLIENT_ID is missing');
} else {
  console.info('[auth] GOOGLE_CLIENT_ID loaded (last6):', googleClientId.slice(-6));
}

export function createAuthOptions(
  sessionMaxAge = ADMIN_SESSION_SHORT_MAX_AGE_SECONDS
): AuthOptions {
  return {
    adapter: PrismaAdapter(prisma),
    session: { strategy: 'jwt', maxAge: sessionMaxAge },
    jwt: { maxAge: sessionMaxAge },
    providers: [
      GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        authorization: {
          params: {
            prompt: 'consent',
            access_type: 'offline',
            response_type: 'code',
            hd: 'verifactu.business', // Workspace domain restriction
          },
        },
      }),
    ],
    callbacks: {
      async signIn({ user, profile }) {
        if (process.env.ADMIN_RELAXED_AUTH === '1') {
          return true;
        }
        const { adminEmails, allowedEmail, allowedDomain } = getAdminAllowlist();

        const profileEmail = (profile as { email?: string } | undefined)?.email;
        const profileHd = (profile as { hd?: string } | undefined)?.hd;
        const email = (user.email || profileEmail || '').toLowerCase();

        console.log('SignIn attempt:', {
          email,
          allowedEmail,
          allowedDomain,
          adminEmails,
          profileHd,
        });

        const emailOk =
          (!!email && adminEmails.includes(email)) ||
          email === allowedEmail ||
          (allowedDomain && email.endsWith(`@${allowedDomain}`));

        const domainOk = !!profileHd && profileHd.toLowerCase() === allowedDomain;

        if (!emailOk && !domainOk) {
          console.error('Access denied for email:', email);
          return false;
        }

        console.log('Access granted for email:', email);
        return true;
      },
      async jwt({ token }) {
        if (token.email) {
          try {
            const { adminEmails, allowedEmail, allowedDomain } = getAdminAllowlist();
            let dbUser = await prisma.user.findUnique({
              where: { email: token.email },
              select: { role: true, id: true, name: true, authSubject: true },
            });

            const isAdmin =
              adminEmails.includes(token.email) ||
              token.email === allowedEmail ||
              token.email.endsWith(`@${allowedDomain}`);

            if (!dbUser) {
              const authSubject = token.sub || token.email;
              dbUser = await prisma.user.create({
                data: {
                  email: token.email,
                  name: token.name || token.email,
                  authProvider: 'GOOGLE',
                  authSubject,
                  role: isAdmin ? 'ADMIN' : 'USER',
                },
                select: { role: true, id: true, name: true, authSubject: true },
              });
              token.role = dbUser.role;
              token.userId = dbUser.id;

              // Sync user in Firebase (best effort)
              try {
                const { firebaseAuth } = await import('./firebase-admin');
                await firebaseAuth.createUser({
                  email: token.email,
                  displayName: dbUser.name || token.email,
                });
                console.log('Firebase user created:', token.email);
              } catch (fbError) {
                console.error('Error creating Firebase user:', fbError);
              }
            } else {
              if (isAdmin && dbUser.role !== 'ADMIN') {
                dbUser = await prisma.user.update({
                  where: { email: token.email },
                  data: { role: 'ADMIN' },
                  select: { role: true, id: true, name: true, authSubject: true },
                });
              }
              token.role = dbUser.role;
              token.userId = dbUser.id;
            }
          } catch (error) {
            console.error('Error syncing user in DB/Firebase:', error);
            token.role = 'USER';
            token.userId = null;
          }
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as any).role = token.role;
          (session.user as any).id = token.userId;
        }
        return session;
      },
    },
    debug: process.env.NEXTAUTH_DEBUG === 'true',
  };
}

export const authOptions: AuthOptions = createAuthOptions();
