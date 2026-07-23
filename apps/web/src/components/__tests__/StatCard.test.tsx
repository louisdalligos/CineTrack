import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../StatCard';

describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard label="Total movies" value={12} />);

    expect(screen.getByText('Total movies')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders a dash for an unavailable value', () => {
    render(<StatCard label="Average rating" value="—" hint="No ratings yet" />);

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('No ratings yet')).toBeInTheDocument();
  });

  it('omits the hint when none is given', () => {
    const { container } = render(<StatCard label="Planned" value={4} />);

    expect(container.querySelectorAll('span')).toHaveLength(2);
  });
});
