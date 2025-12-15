import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "tu@email.com" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        // Aquí iría la lógica para validar el usuario contra tu base de datos.
        // Por ahora, es una simulación que acepta a cualquier usuario.
        // Asignamos 'ADMIN' al primer usuario para pruebas.
        if (credentials?.email) {
          return {
            id: "1",
            name: "Usuario de Prueba",
            email: credentials.email,
            role: "ADMIN",
          } as any;
        }
        // Si las credenciales no son válidas, devolvemos null
        return null;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role as "ADMIN" | "USER";
      }
      return session;
    },
  },
};
