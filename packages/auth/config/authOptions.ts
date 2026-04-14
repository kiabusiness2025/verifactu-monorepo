import type { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { isPreconfiguredAdminEmail } from '@verifactu/utils/admin-access';
import { UserRole, type AuthUser } from '../types';

const googleHostedDomain = process.env.GOOGLE_HOSTED_DOMAIN?.trim();

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          ...(googleHostedDomain ? { hd: googleHostedDomain } : {}),
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.trim().toLowerCase() || '';
      if (!isPreconfiguredAdminEmail(email)) {
        return false;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = UserRole.ADMIN;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as AuthUser).id = token.id as string;
        (session.user as AuthUser).role = token.role as UserRole;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
};
