import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../StatCard';

describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard label="Total movies" value={12} />);

    expect(screen.getByText('Total movies')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders a dash and hint when the value is unavailable', () => {
    render(<StatCard label="Average rating" value="—" hint="No ratings yet" />);

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('No ratings yet')).toBeInTheDocument();
  });

  it('omits the hint when none is given', () => {
    // Asserts on absence of the hint rather than on DOM shape: the previous
    // version counted <span> elements, which broke as soon as the card was
    // rebuilt on different markup.
    const { unmount } = render(<StatCard label="Planned" value={4} hint="Only sometimes" />);
    expect(screen.getByText('Only sometimes')).toBeInTheDocument();
    unmount();

    render(<StatCard label="Planned" value={4} />);
    expect(screen.queryByText('Only sometimes')).not.toBeInTheDocument();
  });

  it('renders a zero value rather than treating it as empty', () => {
    render(<StatCard label="Watched" value={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
