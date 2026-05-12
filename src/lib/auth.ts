import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { member: { include: { organization: true, location: true } } },
        });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar ?? null,
          memberId: user.member?.id,
          role: user.member?.role,
          organizationId: user.member?.organizationId,
          organizationName: user.member?.organization?.name,
          organizationIndustry: user.member?.organization?.industry ?? null,
          locationId: user.member?.locationId ?? null,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        Object.assign(token, {
          memberId: (user as any).memberId,
          role: (user as any).role,
          organizationId: (user as any).organizationId,
          organizationName: (user as any).organizationName,
          organizationIndustry: (user as any).organizationIndustry ?? null,
          locationId: (user as any).locationId,
        });
      }
      // Refresh industry on session update (so picking it in onboarding propagates without re-login)
      if (trigger === "update" && (token as any).organizationId) {
        const org = await prisma.organization.findUnique({
          where: { id: (token as any).organizationId },
          select: { industry: true, name: true },
        });
        if (org) {
          (token as any).organizationIndustry = org.industry ?? null;
          (token as any).organizationName = org.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      Object.assign(session, {
        memberId: token.memberId,
        role: token.role,
        organizationId: token.organizationId,
        organizationName: token.organizationName,
        organizationIndustry: (token as any).organizationIndustry ?? null,
        locationId: token.locationId,
      });
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
