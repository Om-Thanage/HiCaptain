import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  let active = false;
  if (token) {
    try { active = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000 > Date.now(); }
    catch { active = false; }
  }
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/auth', '/invite'];
  
  // If user is authenticated and trying to access login/register, redirect to dashboard
  if (active && pathname === '/auth') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If user is not authenticated and trying to access protected routes, redirect to login
  if (!active && !publicRoutes.includes(pathname) && !pathname.startsWith('/auth/oauth/') && pathname !== '/') {
    return NextResponse.redirect(new URL('/auth?mode=login', request.url));
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
