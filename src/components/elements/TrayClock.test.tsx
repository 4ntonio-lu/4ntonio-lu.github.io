import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TrayClock from './TrayClock';

const shortTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });

describe('TrayClock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const fullDate = new Date(2026, 10, 10).toLocaleDateString([], { dateStyle: 'full' });
  const shortDate = new Date(2026, 10, 10).toLocaleDateString([], {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });

  it('shows the short date next to h:mm:ss, with the full date as a tooltip', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 10, 8, 59, 30));
    render(<TrayClock />);

    const clock = screen.getByTitle(fullDate);
    expect(clock).toHaveTextContent(shortDate);
    expect(clock).toHaveTextContent(shortTime(new Date(2026, 10, 10, 8, 59, 30)));
  });

  it('ticks every second', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 10, 8, 59, 30));
    render(<TrayClock />);

    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByTitle(fullDate)).toHaveTextContent(
      shortTime(new Date(2026, 10, 10, 8, 59, 31)),
    );

    act(() => vi.advanceTimersByTime(29_000));
    expect(screen.getByTitle(fullDate)).toHaveTextContent(
      shortTime(new Date(2026, 10, 10, 9, 0, 0)),
    );
  });
});
