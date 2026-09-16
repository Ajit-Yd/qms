import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/src/lib/prisma";
import { verifyPassword } from "@/src/lib/passwords";

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
