import type { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { UserRole, type AuthUser } from '../types';

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
          hd: 'verifactu.business', // Restrict to workspace domain
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only allow @verifactu.business emails for admin panel
      const email = user.email || '';
      
      if (!email.endsWith('@verifactu.business')) {
        return false;
      }

      // TODO: Check if user exists in database
      // If not, create with default SUPPORT role
      // const dbUser = await prisma.user.findUnique({ where: { email } });

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // TODO: Fetch user role from database
        // const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        
        token.role = UserRole.ADMIN; // Default for now
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
