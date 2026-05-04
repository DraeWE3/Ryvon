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
      const isGuest = auth?.user?.type === "guest";
      const isRealUser = isLoggedIn && !isGuest;

      const isPublicPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register") ||
        nextUrl.pathname.startsWith("/welcome") ||
        nextUrl.pathname.startsWith("/api/auth");

      // Always allow public pages
      if (isPublicPage) {
        // Only redirect away from login/register if they are a REAL logged in user
        // Guest users SHOULD be allowed to see login/register pages
        if (isRealUser && (nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register"))) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      // Protected pages need real login (not guest)
      const isProtectedPage =
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/workflows/connectors");

      if (isProtectedPage) {
        // If not logged in or is a guest, this will return false
        // NextAuth middleware automatically redirects to signIn page if authorized returns false
        return isRealUser;
      }

      // All other pages — allow everyone through (guest sessions created at page level)
      return true;
    },
  },
} satisfies NextAuthConfig;
