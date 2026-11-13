import { afterEach, describe, expect, it, vi } from 'vitest';
import { CITIES } from './forecast';
import { locateNearestCity, nearestCity, resetLocationAsk } from './nearest';
import { cityIsNight } from './selection';

describe('nearest city', () => {
  afterEach(() => {
    resetLocationAsk();
    vi.unstubAllGlobals();
  });

  it('picks the city whose coordinates were given', () => {
    for (const city of CITIES) {
      expect(nearestCity(city.latitude, city.longitude).id).toBe(city.id);
    }
  });

  it('asks the browser once and drops the coordinates', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: { latitude: 47.6062, longitude: -122.3321 },
      } as GeolocationPosition);
    });
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });

    await expect(locateNearestCity()).resolves.toBe('seattle');
    await expect(locateNearestCity()).resolves.toBe('seattle');
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('stays unset when the browser denies location', async () => {
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, failure: PositionErrorCallback) => {
        failure({} as GeolocationPositionError);
      },
    );
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });

    await expect(locateNearestCity()).resolves.toBeNull();
  });

  it('stays unset when geolocation is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    await expect(locateNearestCity()).resolves.toBeNull();
  });
});

describe('city night', () => {
  const sunrise = '6:55 AM';
  const sunset = '5:34 PM';

  function chicago(hourUtc: number, minuteUtc: number): Date {
    return new Date(Date.UTC(2026, 10, 13, hourUtc, minuteUtc));
  }

  it('uses the city sunrise and sunset, not the viewer clock zone', () => {
    expect(cityIsNight('austin', sunrise, sunset, chicago(7, 39))).toBe(true);
    expect(cityIsNight('austin', sunrise, sunset, chicago(12, 55))).toBe(false);
    expect(cityIsNight('austin', sunrise, sunset, chicago(18, 0))).toBe(false);
    expect(cityIsNight('austin', sunrise, sunset, chicago(23, 34))).toBe(true);
  });
});
