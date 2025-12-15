import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "USER";
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: "ADMIN" | "USER";
  }
}