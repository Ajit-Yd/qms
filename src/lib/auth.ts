import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/src/lib/prisma";
import { verifyPassword } from "@/src/lib/passwords";
import { rateLimit } from "@/src/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        // Per-email brute-force protection: 5 attempts per 15 min
        const { allowed } = rateLimit(`login:email:${email}`, 5, 15 * 60 * 1000);
        if (!allowed) {
          // Return null to show generic invalid credentials, but log
          console.warn(`Rate limited login for ${email}`);
          return null;
        }

        const profile = await prisma.profile.findFirst({
          where: { email: { equals: email, mode: "insensitive" }, active: true },
        });

        if (!profile || !(await verifyPassword(profile.id, password))) return null;
        return { id: profile.id, name: profile.name, email: profile.email ?? email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = String(token.id);
      }
      return session;
    },
  },
};
