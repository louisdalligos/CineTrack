import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MovieCard } from '../MovieCard';
import type { MovieSummary } from '@/types/movie';

// next/image needs a plain <img> in jsdom.
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const movie: MovieSummary = {
  tmdbId: 603,
  title: 'The Matrix',
  posterPath: '/matrix.jpg',
  year: 1999,
  rating: 8.235,
};

describe('MovieCard', () => {
  it('renders the title, year and rating', () => {
    render(<MovieCard movie={movie} />);

    expect(screen.getByText('The Matrix')).toBeInTheDocument();
    expect(screen.getByText('1999')).toBeInTheDocument();
    expect(screen.getByText(/8\.2/)).toBeInTheDocument();
  });

  it('links through to the movie details route', () => {
    render(<MovieCard movie={movie} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/movies/603');
  });

  it('builds the poster URL from the TMDB CDN', () => {
    render(<MovieCard movie={movie} />);

    expect(screen.getByAltText('The Matrix poster')).toHaveAttribute(
      'src',
      'https://image.tmdb.org/t/p/w342/matrix.jpg',
    );
  });

  it('falls back to a placeholder when the movie has no poster', () => {
    render(<MovieCard movie={{ ...movie, posterPath: null }} />);

    expect(screen.getByText('No poster available')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('handles a missing release year', () => {
    render(<MovieCard movie={{ ...movie, year: null }} />);

    expect(screen.getByText('Unknown year')).toBeInTheDocument();
  });

  it('shows no status badge for a movie that is not on the watchlist', () => {
    render(<MovieCard movie={movie} />);

    expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();
  });

  it('shows the status badge when the movie is on the watchlist', () => {
    render(<MovieCard movie={movie} watchlistStatus="WATCHING" />);

    expect(screen.getByTestId('status-badge')).toHaveTextContent('Watching');
  });
});
