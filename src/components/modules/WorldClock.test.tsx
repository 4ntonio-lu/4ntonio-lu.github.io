import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DesktopProvider } from '../../desktop/DesktopProvider';
import WorldClock from './WorldClock';

const worldClockZones = [
  { city: 'Austin', timeZone: 'America/Chicago' },
  { city: 'New York', timeZone: 'America/New_York' },
  { city: 'London', timeZone: 'Europe/London' },
  { city: 'Tokyo', timeZone: 'Asia/Tokyo' },
  { city: 'Sydney', timeZone: 'Australia/Sydney' },
];

const zoneTime = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);

describe('WorldClock', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the visitor clock and the city clocks from Intl, without fetching', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.useFakeTimers();
    const now = new Date('2026-01-15T18:30:00.000Z');
    vi.setSystemTime(now);

    render(
      <MemoryRouter>
        <DesktopProvider initialOpen="clock">
          <WorldClock />
        </DesktopProvider>
      </MemoryRouter>,
    );

    const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(screen.getByRole('row', { name: /^Local/ })).toHaveTextContent(zoneTime(now, localZone));
    for (const zone of worldClockZones) {
      expect(screen.getByRole('row', { name: new RegExp(`^${zone.city}`) })).toHaveTextContent(
        zoneTime(now, zone.timeZone),
      );
    }
    expect(screen.getByRole('row', { name: /^Tokyo/ })).not.toHaveTextContent(
      zoneTime(now, 'America/Chicago'),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('ticks every second', () => {
    vi.useFakeTimers();
    const now = new Date('2026-01-15T18:30:00.000Z');
    vi.setSystemTime(now);

    render(
      <MemoryRouter>
        <DesktopProvider initialOpen="clock">
          <WorldClock />
        </DesktopProvider>
      </MemoryRouter>,
    );

    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByRole('row', { name: /^Austin/ })).toHaveTextContent(
      zoneTime(new Date('2026-01-15T18:30:01.000Z'), 'America/Chicago'),
    );
  });
});
