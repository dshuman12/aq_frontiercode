import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth API routes always pass through
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === '/login';
  const sessionCookie = getSessionCookie(request);
  const isLoggedIn = !!sessionCookie;

  // Already logged in trying to access login — redirect to dashboard
  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Login page is public
  if (isLoginPage) {
    return NextResponse.next();
  }

  // Everything else requires login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|.*\\.png$).*)'],
};
