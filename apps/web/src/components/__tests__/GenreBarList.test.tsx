import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GenreBarList } from '../GenreBarList';

describe('GenreBarList', () => {
  const genres = [
    { genre: 'Action', count: 6 },
    { genre: 'Drama', count: 3 },
    { genre: 'Comedy', count: 1 },
  ];

  it('renders one entry per genre', () => {
    render(<GenreBarList genres={genres} />);

    expect(screen.getAllByRole('meter')).toHaveLength(3);
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('pluralises the movie count', () => {
    render(<GenreBarList genres={genres} />);

    expect(screen.getByText('6 movies')).toBeInTheDocument();
    expect(screen.getByText('1 movie')).toBeInTheDocument();
  });

  it('scales bars against the highest count', () => {
    render(<GenreBarList genres={genres} />);

    const [action, drama] = screen.getAllByRole('meter');
    expect(action).toHaveAttribute('aria-valuenow', '6');
    expect(action).toHaveAttribute('aria-valuemax', '6');
    expect(drama).toHaveAttribute('aria-valuenow', '3');
  });

  it('does not divide by zero when every count is zero', () => {
    render(<GenreBarList genres={[{ genre: 'Action', count: 0 }]} />);

    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuemax', '1');
  });
});
