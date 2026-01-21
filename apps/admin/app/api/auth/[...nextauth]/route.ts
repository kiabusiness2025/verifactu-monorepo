import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { UserRole } from '@verifactu/auth';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          hd: 'verifactu.business', // Restricción de dominio Workspace
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // 🔒 SEGURIDAD: Solo permitir @verifactu.business
      const email = user.email || '';
      
      if (!email.endsWith('@verifactu.business')) {
        console.error('❌ Intento de acceso no autorizado:', email);
        return false;
      }

      console.log('✅ Acceso permitido:', email);
      
      // TODO: Verificar en DB si el usuario existe y tiene role ADMIN/SUPPORT
      // const dbUser = await prisma.user.findUnique({ where: { email } });
      // if (!dbUser || dbUser.role === 'USER') return false;
      
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // TODO: Fetch role from database
        // const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        token.role = UserRole.ADMIN; // Default for now
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as UserRole;
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
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };
