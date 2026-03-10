import type { NextAuthConfig } from 'next-auth';

// Edge-compatible auth config (no Prisma imports)
// Used by middleware for JWT verification only
export const authConfig: NextAuthConfig = {
  providers: [], // Providers added in auth.ts (Node.js only)
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isAuthenticated = !!auth?.user;
      const isPublic = ['/login', '/signup', '/api/auth', '/api/integrations'].some(
        (path) => nextUrl.pathname.startsWith(path),
      );

      if (!isAuthenticated && !isPublic) {
        return false;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
