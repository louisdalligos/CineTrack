'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export function Nav() {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <nav className="flex items-center justify-between border-b px-6 py-4">
      <Link href="/" className="font-semibold">
        CineTrack
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {isAuthenticated ? (
          <>
            {user?.email && <span className="text-gray-600">{user.email}</span>}
            <button onClick={handleLogout} className="underline">
              Log out
            </button>
          </>
        ) : (
          <Link href="/login" className="underline">
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}
