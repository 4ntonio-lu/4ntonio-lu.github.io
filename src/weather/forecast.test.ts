import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CITIES,
  clearForecastSession,
  forecastUrl,
  loadForecast,
  parseForecast,
  readForecast,
  type City,
} from './forecast';
import { markPixels } from './marks';

function city(id: City['id']): City {
  const found = CITIES.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

/** A trimmed Open-Meteo forecast. Times are local to the zone we requested. */
function samplePayload() {
  const slots: Record<number, { temp: number; code: number }> = {
    9: { temp: 68.2, code: 0 },
    12: { temp: 76.4, code: 0 },
    15: { temp: 81.1, code: 1 },
    18: { temp: 77.2, code: 2 },
    21: { temp: 70.4, code: 2 },
  };
  const time = ['2026-11-11T09:00'];
  const temperature_2m = [1];
  const weather_code = [61];
  for (let hour = 0; hour < 24; hour += 1) {
    time.push(`2026-11-12T${String(hour).padStart(2, '0')}:00`);
    temperature_2m.push(slots[hour]?.temp ?? 50);
    weather_code.push(slots[hour]?.code ?? 3);
  }
  time.push('2026-11-13T09:00');
  temperature_2m.push(99);
  weather_code.push(95);

  return {
    current: {
      time: '2026-11-12T12:15',
      temperature_2m: 74.4,
      relative_humidity_2m: 48.2,
      weather_code: 2,
      wind_speed_10m: 8.4,
    },
    hourly: { time, temperature_2m, weather_code },
    daily: {
      time: [
        '2026-11-12',
        '2026-11-13',
        '2026-11-14',
        '2026-11-15',
        '2026-11-16',
        '2026-11-17',
        '2026-11-18',
      ],
      weather_code: [0, 2, 0, 3, 61, 73, 95],
      temperature_2m_max: [81.2, 79.4, 84.1, 77.2, 73.4, 70.1, 68.2],
      temperature_2m_min: [63.4, 61.2, 66.2, 60.4, 58.1, 55.2, 52.4],
    },
  };
}

describe('cities', () => {
  it('lists the forecast cities in menu order, with each real time zone', () => {
    expect(CITIES.map((item) => item.label)).toEqual([
      'Austin, TX',
      'Portland, OR',
      'San Francisco, CA',
      'Los Angeles, CA',
      'New York, NY',
      'Miami, FL',
      'Las Vegas, NV',
      'Seattle, WA',
      'Honolulu, HI',
    ]);
    expect(CITIES[0].timeZone).toBe('America/Chicago');
    expect(city('portland').timeZone).toBe('America/Los_Angeles');
    expect(city('san-francisco').timeZone).toBe('America/Los_Angeles');
    expect(city('los-angeles').timeZone).toBe('America/Los_Angeles');
    expect(city('new-york').timeZone).toBe('America/New_York');
    expect(city('miami').timeZone).toBe('America/New_York');
    expect(city('las-vegas').timeZone).toBe('America/Los_Angeles');
    expect(city('seattle').timeZone).toBe('America/Los_Angeles');
    expect(city('honolulu').timeZone).toBe('Pacific/Honolulu');
  });

  it('asks Open-Meteo for one city in Fahrenheit and does not send a key', () => {
    const austin = forecastUrl(city('austin'));
    expect(austin.startsWith('https://api.open-meteo.com/v1/forecast?')).toBe(true);
    expect(austin).toContain('latitude=30.2672');
    expect(austin).toContain('longitude=-97.7431');
    expect(austin).toContain('temperature_unit=fahrenheit');
    expect(austin).toContain('wind_speed_unit=mph');
    expect(austin).toContain('timezone=America%2FChicago');
    expect(austin).toContain('forecast_days=7');
    expect(austin).not.toMatch(/api[_-]?key|apikey|(?:^|[?&])key=/i);
    expect(forecastUrl(city('honolulu'))).toContain('timezone=Pacific%2FHonolulu');
    expect(forecastUrl(city('honolulu'))).toContain('latitude=21.3069');
  });
});

describe('parseForecast', () => {
  it('maps an Open-Meteo payload into the weather window', () => {
    const view = parseForecast(city('austin'), samplePayload());

    expect(view).toMatchObject({
      cityId: 'austin',
      tempF: 74,
      condition: 'Partly cloudy',
      kind: 'partly',
      highF: 81,
      lowF: 63,
      windMph: 8,
      humidity: 48,
    });
    expect(view.hours).toEqual([
      { label: '9 AM', tempF: 68, kind: 'clear' },
      { label: '12 PM', tempF: 76, kind: 'clear' },
      { label: '3 PM', tempF: 81, kind: 'clear' },
      { label: '6 PM', tempF: 77, kind: 'partly' },
      { label: '9 PM', tempF: 70, kind: 'partly' },
    ]);
    expect(view.days).toEqual([
      { label: 'Thu', highF: 81, lowF: 63, kind: 'clear' },
      { label: 'Fri', highF: 79, lowF: 61, kind: 'partly' },
      { label: 'Sat', highF: 84, lowF: 66, kind: 'clear' },
      { label: 'Sun', highF: 77, lowF: 60, kind: 'cloudy' },
      { label: 'Mon', highF: 73, lowF: 58, kind: 'rain' },
      { label: 'Tue', highF: 70, lowF: 55, kind: 'snow' },
      { label: 'Wed', highF: 68, lowF: 52, kind: 'storm' },
    ]);
  });

  it('rejects a payload that cannot fill the window', () => {
    expect(() => parseForecast(city('austin'), { current: {} })).toThrow(/Bad forecast/);
  });
});

describe('loadForecast', () => {
  afterEach(() => {
    clearForecastSession();
    vi.unstubAllGlobals();
  });

  it('keeps a loaded city in memory and fetches the next city once', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', (input: RequestInfo) => {
      urls.push(String(input));
      return Promise.resolve(Response.json(samplePayload()));
    });

    await loadForecast('austin');
    await loadForecast('honolulu');
    await loadForecast('austin');

    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain('latitude=30.2672');
    expect(urls[0]).not.toContain('latitude=21.3069');
    expect(urls[1]).toContain('latitude=21.3069');
    expect(urls[1]).toContain('timezone=Pacific%2FHonolulu');
    expect(readForecast('austin')?.tempF).toBe(74);
    expect(readForecast('honolulu')?.cityId).toBe('honolulu');
  });

  it('does not cache a failed request', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('no', { status: 502 })));
    await expect(loadForecast('austin')).rejects.toThrow(/unavailable/);
    expect(readForecast('austin')).toBeNull();
  });
});

describe('weather marks', () => {
  it('draws a pixel mark for every condition', () => {
    const kinds = ['clear', 'partly', 'cloudy', 'fog', 'rain', 'snow', 'storm'] as const;
    for (const kind of kinds) {
      expect(markPixels(kind).length).toBeGreaterThan(10);
    }
  });
});
