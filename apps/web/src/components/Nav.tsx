'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

const LINKS = [
  { href: '/discover', label: 'Discover' },
  { href: '/watchlist', label: 'Watchlist' },
  { href: '/dashboard', label: 'Dashboard' },
];

export function Nav() {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
      <div className="flex items-center gap-6">
        <Link href="/discover" className="font-semibold">
          CineTrack
        </Link>
        {isAuthenticated && (
          <div className="flex items-center gap-4 text-sm">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  pathname === link.href
                    ? 'font-medium underline'
                    : 'text-gray-600 hover:text-black'
                }
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm">
        {isAuthenticated ? (
          <>
            {user?.email && <span className="hidden text-gray-600 sm:inline">{user.email}</span>}
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
