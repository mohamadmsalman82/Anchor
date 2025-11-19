import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value;

  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = ['/auth/login', '/auth/register'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Protected routes (require authentication)
  const protectedRoutes = [
    '/dashboard',
    '/feed',
    '/sessions',
    '/profile',
    '/leaderboard',
    '/settings',
    '/introduction',
  ];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // If accessing protected route without token, redirect to login
  // Note: We allow the client-side to handle auth checks too, so this is just a basic check
  if (isProtectedRoute && !token) {
    // Don't redirect if it's an API call or static asset
    if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
      return NextResponse.next();
    }
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing auth pages with token, redirect to dashboard (unless going to introduction)
  if (isPublicRoute && token && pathname !== '/introduction') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
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
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

