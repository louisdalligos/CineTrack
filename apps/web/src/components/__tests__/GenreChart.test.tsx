import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { GenreChart } from '../GenreChart';

// Recharts measures its container, and jsdom reports zero dimensions, so the
// chart would render nothing. Giving ResponsiveContainer a fixed size lets the
// SVG render and keeps the console free of width/height warnings.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 480, height: 180 }}>{children}</div>
    ),
  };
});

describe('GenreChart', () => {
  const genres = [
    { genre: 'Action', count: 6 },
    { genre: 'Drama', count: 3 },
    { genre: 'Comedy', count: 1 },
  ];

  it('exposes every genre and count as text for screen readers', () => {
    render(<GenreChart genres={genres} />);

    const data = screen.getByTestId('genre-chart-data');
    expect(within(data).getByText('Action: 6 movies')).toBeInTheDocument();
    expect(within(data).getByText('Drama: 3 movies')).toBeInTheDocument();
  });

  it('uses the singular for a count of one', () => {
    render(<GenreChart genres={genres} />);

    expect(
      within(screen.getByTestId('genre-chart-data')).getByText('Comedy: 1 movie'),
    ).toBeInTheDocument();
  });

  it('lists one entry per genre', () => {
    render(<GenreChart genres={genres} />);

    expect(within(screen.getByTestId('genre-chart-data')).getAllByRole('listitem')).toHaveLength(3);
  });

  it('renders without error for a single genre', () => {
    render(<GenreChart genres={[{ genre: 'Action', count: 1 }]} />);

    expect(
      within(screen.getByTestId('genre-chart-data')).getByText('Action: 1 movie'),
    ).toBeInTheDocument();
  });
});
