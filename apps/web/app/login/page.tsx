import { LoginForm } from '@/components/LoginForm';
import Link from 'next/link';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string; registered?: string };
}) {
  const redirectTo = searchParams.redirect ?? '/';

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Log in</h1>
      {searchParams.registered === 'true' && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
          Account created — log in to continue.
        </p>
      )}
      <LoginForm redirectTo={redirectTo} />
      <p className="text-sm text-gray-600">
        Need an account?{' '}
        <Link href="/register" className="underline">
          Register
        </Link>
      </p>
    </main>
  );
}
