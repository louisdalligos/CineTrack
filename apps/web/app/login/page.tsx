import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { LoginForm } from '@/components/LoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Log in · CineTrack',
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string; registered?: string };
}) {
  const redirectTo = searchParams.redirect ?? '/';

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center px-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Log in</CardTitle>
          <CardDescription>Pick up where you left off.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {searchParams.registered === 'true' && (
            <p className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              Account created. Log in to continue.
            </p>
          )}
          <LoginForm redirectTo={redirectTo} />
          <p className="text-sm text-muted-foreground">
            Need an account?{' '}
            <Link
              href="/register"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
