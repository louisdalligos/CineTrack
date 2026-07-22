import { notFound } from 'next/navigation';
import { MovieDetailsScreen } from '@/components/MovieDetailsScreen';

export const metadata = {
  title: 'Movie · CineTrack',
};

export default function MovieDetailsPage({ params }: { params: { id: string } }) {
  const tmdbId = Number(params.id);

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    notFound();
  }

  return <MovieDetailsScreen tmdbId={tmdbId} />;
}
