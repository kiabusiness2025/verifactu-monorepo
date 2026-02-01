import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';

// Provide sensible defaults in local dev to avoid NextAuth warnings.
if (process.env.NODE_ENV !== 'production') {
  if (!process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = 'http://localhost:3010';
  }
  if (!process.env.NEXTAUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = 'dev-admin-secret';
  }
}

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
          let dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { role: true, id: true, name: true, authSubject: true },
          });

          // Si no existe, crearlo con rol ADMIN si el email es admin
          const allowedEmail = (process.env.ADMIN_ALLOWED_EMAIL || 'support@verifactu.business').toLowerCase();
          const allowedDomain = (process.env.ADMIN_ALLOWED_DOMAIN || 'verifactu.business').toLowerCase();
          const isAdmin = token.email === allowedEmail || token.email.endsWith(`@${allowedDomain}`);

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

            // Sincronizar usuario en Firebase
            try {
              const { firebaseAuth } = await import('./firebase-admin');
              await firebaseAuth.createUser({
                email: token.email,
                displayName: dbUser.name || token.email,
              });
              console.log('✅ Usuario sincronizado en Firebase:', token.email);
            } catch (fbError) {
              console.error('❌ Error creando usuario en Firebase:', fbError);
            }
          } else {
            // Si existe y es admin, actualizar rol si corresponde
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
      // 📤 Exponer role y userId en la sesión
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.userId;
      }
      return session;
    },
  },
  debug: process.env.NEXTAUTH_DEBUG === 'true',
};
