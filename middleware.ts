import NextAuth from 'next-auth';
import { authConfig } from './app/(auth)/auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;
  const isOnPublicPage = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register");

  if (!isLoggedIn && !isOnPublicPage) {
    return Response.redirect(new URL("/login", nextUrl));
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|img|img-log|img-sidebar|font|images).*)'],
};
