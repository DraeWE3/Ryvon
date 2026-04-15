import { compare } from "bcrypt-ts";
import NextAuth, { type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DUMMY_PASSWORD } from "@/lib/constants";
import { createGuestUser, getUser, upsertGoogleUser } from "@/lib/db/queries";
import { authConfig } from "./auth.config";

export type UserType = "guest" | "regular";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
      companyName?: string | null;
      timezone?: string | null;
    } & DefaultSession["user"];
  }

  // biome-ignore lint/nursery/useConsistentTypeDefiniztions: "Required"
  interface User {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    companyName?: string | null;
    timezone?: string | null;
    type: UserType;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
    name?: string | null;
    image?: string | null;
    companyName?: string | null;
    timezone?: string | null;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await getUser(email);

        if (users.length === 0) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const [user] = users;

        if (!user.password) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const passwordsMatch = await compare(password, user.password);

        if (!passwordsMatch) {
          return null;
        }

        return { ...user, type: "regular" };
      },
    }),
    Credentials({
      id: "guest",
      credentials: {},
      async authorize() {
        const [guestUser] = await createGuestUser();
        return { ...guestUser, type: "guest" };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For Google sign-ins, upsert the user in our DB
      if (account?.provider === "google" && user.email) {
        try {
          const dbUser = await upsertGoogleUser(
            user.email,
            user.name || null,
            user.image || null
          );
          // Attach the real DB id to the user object so jwt callback can use it
          user.id = dbUser.id;
          user.type = "regular";
          user.companyName = dbUser.companyName;
          user.timezone = dbUser.timezone;
          // Keep Google image if DB doesn't have one
          user.image = dbUser.image || user.image || null;
        } catch (error) {
          console.error("Google sign-in upsert failed:", error);
          return false;
        }
      }
      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.type = user.type;
        token.name = user.name;
        token.image = user.image;
        token.companyName = user.companyName;
        token.timezone = user.timezone;
      }
      if (trigger === "update" && session) {
        if (session.name !== undefined) token.name = session.name;
        if (session.email !== undefined) token.email = session.email;
        if (session.companyName !== undefined) token.companyName = session.companyName;
        if (session.timezone !== undefined) token.timezone = session.timezone;
        if (session.image !== undefined) token.image = session.image;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
        session.user.name = token.name;
        session.user.image = token.image as string | null | undefined;
        session.user.companyName = token.companyName;
        session.user.timezone = token.timezone;
      }

      return session;
    },
  },
});

