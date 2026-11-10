import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TrayClock from './TrayClock';

const shortTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

describe('TrayClock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows hours and minutes, with the full date as a tooltip', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 10, 8, 59, 30));
    render(<TrayClock />);

    const clock = screen.getByText(shortTime(new Date(2026, 10, 10, 8, 59)));
    expect(clock.textContent).not.toMatch(/\d+:\d+:\d+/);
    expect(clock.closest('[title]')).toHaveAttribute(
      'title',
      new Date(2026, 10, 10).toLocaleDateString([], { dateStyle: 'full' }),
    );
  });

  it('updates when the minute changes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 10, 8, 59, 30));
    render(<TrayClock />);

    act(() => vi.advanceTimersByTime(29_000));
    expect(screen.getByText(shortTime(new Date(2026, 10, 10, 8, 59)))).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText(shortTime(new Date(2026, 10, 10, 9, 0)))).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText(shortTime(new Date(2026, 10, 10, 9, 1)))).toBeInTheDocument();
  });
});
