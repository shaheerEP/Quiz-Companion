import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authSession = request.cookies.get('auth_session');

  // List of protected routes that require authentication
  const isProtectedRoute = pathname.startsWith('/student') || 
                           pathname.startsWith('/teacher') || 
                           pathname.startsWith('/admin') || 
                           pathname.startsWith('/settings');

  if (isProtectedRoute && !authSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If they are on the login page but already have a session, maybe redirect to home
  // Home page handles its own role-based redirects.
  if (pathname === '/login' && authSession) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
