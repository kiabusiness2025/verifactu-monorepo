import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { User } from "next-auth";

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
          } as User;
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
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role as "ADMIN" | "USER";
      return session;
    },
  },
});