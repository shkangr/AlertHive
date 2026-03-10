import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function getServerSession() {
  return await auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return session;
}
