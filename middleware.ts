import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

// Edge-compatible middleware — no Prisma, no Node.js dependencies
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/services/:path*',
    '/incidents/:path*',
    '/schedules/:path*',
    '/escalation-policies/:path*',
    '/teams/:path*',
    '/settings/:path*',
  ],
};
