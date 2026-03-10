import { auth } from '@/lib/auth';

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthenticated = !!req.auth;

  const publicPaths = ['/login', '/signup', '/api/auth'];
  const isPublic = publicPaths.some((path) =>
    nextUrl.pathname.startsWith(path),
  );

  if (!isAuthenticated && !isPublic) {
    return Response.redirect(new URL('/login', nextUrl));
  }
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/services/:path*',
    '/incidents/:path*',
    '/schedules/:path*',
    '/escalation-policies/:path*',
    '/teams/:path*',
    '/settings/:path*',
    '/login',
    '/signup',
  ],
};
