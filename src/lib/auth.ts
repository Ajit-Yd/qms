import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/src/lib/prisma";
import { verifyPassword } from "@/src/lib/passwords";
import { rateLimit, clearRateLimit } from "@/src/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        organization: { label: "Organization", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const organization = String(credentials?.organization ?? "").trim();
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!organization || !email || !password) return null;

        // Gate on the attempt budget BEFORE the org lookup and the scrypt hash:
        // this is the cheapest way to stop both credential stuffing and a
        // password-guessing CPU DoS. 10 failures per account per 15 minutes.
        const budget = rateLimit(`login:email:${email}`, 10, 15 * 60 * 1000);
        if (!budget.allowed) {
          console.warn(`Rate limited login for ${email}`);
          return null;
        }

        const org = await prisma.organization.findFirst({
          where: { name: { equals: organization, mode: "insensitive" }, active: true },
        });

        const profile = org
          ? await prisma.profile.findFirst({
              where: {
                organizationId: org.id,
                email: { equals: email, mode: "insensitive" },
                active: true,
              },
            })
          : null;

        const isValid = profile ? await verifyPassword(profile.id, password) : false;
        // One verdict for a bad password, a disabled account, a wrong
        // organization and an unknown email, so this cannot be used to probe
        // which of those it was.
        if (!isValid || !profile) return null;

        clearRateLimit(`login:email:${email}`);
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
