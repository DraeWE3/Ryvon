import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/welcome",
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
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
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isGuest = auth?.user?.type === "guest";
      const isRealUser = isLoggedIn && !isGuest;

      const isPublicPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register") ||
        nextUrl.pathname.startsWith("/welcome") ||
        nextUrl.pathname.startsWith("/api/auth");

      if (isPublicPage) {
        if (isRealUser && (nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register"))) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      const isProtectedPage =
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/workflows/connectors");

      if (isProtectedPage) {
        return isRealUser;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
