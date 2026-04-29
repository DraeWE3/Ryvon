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
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      const isPublicPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register") ||
        nextUrl.pathname.startsWith("/welcome") ||
        nextUrl.pathname.startsWith("/api/auth");

      // Always allow public pages
      if (isPublicPage) {
        // If logged in and trying to access login/register, redirect to home
        if (isLoggedIn && (nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register"))) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      // Protected pages need real login
      const isProtectedPage =
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/workflows/connectors");

      if (isProtectedPage) {
        return isLoggedIn;
      }

      // All other pages — allow everyone through (guest sessions created at page level)
      return true;
    },
  },
} satisfies NextAuthConfig;
