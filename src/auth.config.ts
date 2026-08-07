import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [], // Add providers with Edge-incompatible modules (like bcrypt/prisma) in auth.ts
} satisfies NextAuthConfig
