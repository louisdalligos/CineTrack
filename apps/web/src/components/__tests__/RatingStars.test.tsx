import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RatingStars } from '../RatingStars';

describe('RatingStars', () => {
  it('renders ten rating buttons', () => {
    render(<RatingStars value={null} onChange={vi.fn()} />);

    expect(screen.getAllByRole('button')).toHaveLength(10);
  });

  it('shows "Not rated" when there is no rating yet', () => {
    render(<RatingStars value={null} onChange={vi.fn()} />);

    expect(screen.getByText('Not rated')).toBeInTheDocument();
  });

  it('displays the current rating out of ten', () => {
    render(<RatingStars value={7} onChange={vi.fn()} />);

    expect(screen.getByText('7/10')).toBeInTheDocument();
  });

  it('marks only the selected star as pressed', () => {
    render(<RatingStars value={3} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Rate 3 out of 10' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Rate 4 out of 10' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('reports the chosen rating', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RatingStars value={null} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Rate 8 out of 10' }));

    expect(onChange).toHaveBeenCalledWith(8);
  });

  it('does not fire onChange while disabled', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RatingStars value={5} onChange={onChange} disabled />);

    await user.click(screen.getByRole('button', { name: 'Rate 9 out of 10' }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
