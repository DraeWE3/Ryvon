import NextAuth from 'next-auth';
import { authConfig } from './app/(auth)/auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  // Public pages — always accessible
  const isPublicPage =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register") ||
    nextUrl.pathname.startsWith("/welcome") ||
    nextUrl.pathname.startsWith("/api/auth");

  if (isPublicPage) return;

  // Protected pages — require real authentication (not guest)
  const isProtectedPage =
    nextUrl.pathname.startsWith("/settings") ||
    nextUrl.pathname.startsWith("/workflows/connectors");

  if (!isLoggedIn && isProtectedPage) {
    return Response.redirect(new URL("/register", nextUrl));
  }

  // Everything else (chat, call-agent, tts, workflows, automation) — let through
  // The page-level logic handles guest creation where needed
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|img|img-log|img-sidebar|font|images|artifacts).*)'],
};
