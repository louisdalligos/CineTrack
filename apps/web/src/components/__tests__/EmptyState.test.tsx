import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders the title and message', () => {
    render(<EmptyState title="Your watchlist is empty" message="Nothing here yet." />);

    expect(screen.getByText('Your watchlist is empty')).toBeInTheDocument();
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('renders a call to action linking to Discover', () => {
    render(
      <EmptyState
        title="Your watchlist is empty"
        message="Nothing here yet."
        ctaHref="/discover"
        ctaLabel="Discover movies"
      />,
    );

    expect(screen.getByRole('link', { name: 'Discover movies' })).toHaveAttribute(
      'href',
      '/discover',
    );
  });

  it('omits the call to action when no href is given', () => {
    render(<EmptyState title="Nothing here" message="No items." />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
