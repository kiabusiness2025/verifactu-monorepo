import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 hours
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
      // 🔒 SEGURIDAD: Validar email contra variables de entorno
      const profileEmail = (profile as { email?: string } | undefined)?.email;
      const profileHd = (profile as { hd?: string } | undefined)?.hd;
      const email = (user.email || profileEmail || '').toLowerCase();
      const allowedEmail = (
        process.env.ADMIN_ALLOWED_EMAIL || 'support@verifactu.business'
      ).toLowerCase();
      const allowedDomain = (
        process.env.ADMIN_ALLOWED_DOMAIN || 'verifactu.business'
      ).toLowerCase();

      console.log('🔍 SignIn attempt:', { email, allowedEmail, allowedDomain, profile });

      const emailOk = !!email && (email === allowedEmail || email.endsWith(`@${allowedDomain}`));

      const domainOk = !!profileHd && profileHd.toLowerCase() === allowedDomain;

      if (!emailOk && !domainOk) {
        console.error('❌ Intento de acceso no autorizado:', email);
        return false;
      }

      console.log('✅ Acceso permitido:', email);
      return true;
    },
    async jwt({ token }) {
      // 🔑 Cargar rol desde DB
      if (token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { role: true, id: true },
          });

          if (dbUser) {
            token.role = dbUser.role;
            token.userId = dbUser.id;
          } else {
            // Usuario no existe en DB, asignar USER por defecto
            token.role = 'USER';
            token.userId = null;
          }
        } catch (error) {
          console.error('Error fetching user from DB:', error);
          token.role = 'USER';
          token.userId = null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // 📤 Exponer role y userId en la sesión
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.userId;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};
