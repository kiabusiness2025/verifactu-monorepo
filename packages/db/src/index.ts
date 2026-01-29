export * from "./prisma";
export * from "@prisma/client";

// Manual runtime enum for AuthProvider (Prisma only exports type)
export enum AuthProvider {
  FIREBASE = 'FIREBASE',
  GOOGLE = 'GOOGLE',
}
