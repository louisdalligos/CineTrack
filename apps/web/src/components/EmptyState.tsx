import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  title: string;
  message: string;
  ctaHref?: string;
  ctaLabel?: string;
}

export function EmptyState({ title, message, ctaHref, ctaLabel }: EmptyStateProps) {
  return (
    <Card data-testid="empty-state" className="border-dashed shadow-none">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
        {ctaHref && ctaLabel && (
          <Button asChild className="mt-2">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
