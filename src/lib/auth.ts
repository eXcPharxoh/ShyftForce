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
          locationId: user.member?.locationId ?? null,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        Object.assign(token, {
          memberId: (user as any).memberId,
          role: (user as any).role,
          organizationId: (user as any).organizationId,
          organizationName: (user as any).organizationName,
          locationId: (user as any).locationId,
        });
      }
      return token;
    },
    async session({ session, token }) {
      Object.assign(session, {
        memberId: token.memberId,
        role: token.role,
        organizationId: token.organizationId,
        organizationName: token.organizationName,
        locationId: token.locationId,
      });
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
