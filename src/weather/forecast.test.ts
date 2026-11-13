import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CITIES,
  clearForecastSession,
  forecastUrl,
  laterDayHourWindow,
  loadForecast,
  parseForecast,
  readForecast,
  todayHourWindow,
  type City,
} from './forecast';

function city(id: City['id']): City {
  const found = CITIES.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

/** A trimmed Open-Meteo forecast. Times are local to the zone we requested. */
function samplePayload(currentTime = '2026-11-12T12:15') {
  const thursday: Record<number, { temp: number; code: number }> = {
    9: { temp: 68.2, code: 0 },
    12: { temp: 76.4, code: 0 },
    15: { temp: 81.1, code: 1 },
    18: { temp: 77.2, code: 2 },
    21: { temp: 70.4, code: 2 },
  };
  const friday: Record<number, { temp: number; code: number }> = {
    8: { temp: 58.2, code: 0 },
    19: { temp: 64.4, code: 0 },
  };
  const time: string[] = [];
  const temperature_2m: number[] = [];
  const weather_code: number[] = [];
  for (let day = 12; day <= 18; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const special = day === 12 ? thursday[hour] : day === 13 ? friday[hour] : undefined;
      time.push(`2026-11-${day}T${String(hour).padStart(2, '0')}:00`);
      temperature_2m.push(special?.temp ?? 50);
      weather_code.push(special?.code ?? 3);
    }
  }

  return {
    current: {
      time: currentTime,
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
      sunrise: [
        '2026-11-12T06:54',
        '2026-11-13T06:55',
        '2026-11-14T06:55',
        '2026-11-15T06:56',
        '2026-11-16T06:57',
        '2026-11-17T06:58',
        '2026-11-18T06:59',
      ],
      sunset: [
        '2026-11-12T17:35',
        '2026-11-13T17:35',
        '2026-11-14T17:34',
        '2026-11-15T17:34',
        '2026-11-16T17:33',
        '2026-11-17T17:33',
        '2026-11-18T17:33',
      ],
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
    expect(austin).toContain('sunrise');
    expect(austin).toContain('sunset');
    expect(austin).not.toMatch(/api[_-]?key|apikey|(?:^|[?&])key=/i);
    expect(forecastUrl(city('honolulu'))).toContain('timezone=Pacific%2FHonolulu');
    expect(forecastUrl(city('honolulu'))).toContain('latitude=21.3069');
  });
});

describe('hour windows', () => {
  it('starts at the current hour and falls back to the last twelve', () => {
    expect(todayHourWindow(8)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(todayHourWindow(12)).toEqual([12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
    expect(todayHourWindow(13)).toEqual([12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
    expect(todayHourWindow(0)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(laterDayHourWindow()).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
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
      night: false,
      highF: 81,
      lowF: 63,
      windMph: 8,
      humidity: 48,
    });
    expect(view.days[0].hours).toEqual([
      { label: '12 PM', tempF: 76, kind: 'clear', night: false },
      { label: '1 PM', tempF: 50, kind: 'cloudy', night: false },
      { label: '2 PM', tempF: 50, kind: 'cloudy', night: false },
      { label: '3 PM', tempF: 81, kind: 'clear', night: false },
      { label: '4 PM', tempF: 50, kind: 'cloudy', night: false },
      { label: '5 PM', tempF: 50, kind: 'cloudy', night: false },
      { label: '6 PM', tempF: 77, kind: 'partly', night: true },
      { label: '7 PM', tempF: 50, kind: 'cloudy', night: true },
      { label: '8 PM', tempF: 50, kind: 'cloudy', night: true },
      { label: '9 PM', tempF: 70, kind: 'partly', night: true },
      { label: '10 PM', tempF: 50, kind: 'cloudy', night: true },
      { label: '11 PM', tempF: 50, kind: 'cloudy', night: true },
    ]);
    expect(
      view.days.map(({ date, label, highF, lowF, kind }) => ({ date, label, highF, lowF, kind })),
    ).toEqual([
      { date: '2026-11-12', label: 'Thu', highF: 81, lowF: 63, kind: 'clear' },
      { date: '2026-11-13', label: 'Fri', highF: 79, lowF: 61, kind: 'partly' },
      { date: '2026-11-14', label: 'Sat', highF: 84, lowF: 66, kind: 'clear' },
      { date: '2026-11-15', label: 'Sun', highF: 77, lowF: 60, kind: 'cloudy' },
      { date: '2026-11-16', label: 'Mon', highF: 73, lowF: 58, kind: 'rain' },
      { date: '2026-11-17', label: 'Tue', highF: 70, lowF: 55, kind: 'snow' },
      { date: '2026-11-18', label: 'Wed', highF: 68, lowF: 52, kind: 'storm' },
    ]);
    expect(view.days[1].hours[0]).toEqual({
      label: '8 AM',
      tempF: 58,
      kind: 'clear',
      night: false,
    });
    expect(view.days[1].hours[11]).toEqual({
      label: '7 PM',
      tempF: 64,
      kind: 'clear',
      night: true,
    });
    expect(view.days[1].hours).toHaveLength(12);
  });

  it('uses the last twelve hours after sunset and marks the current hour as night', () => {
    const view = parseForecast(city('austin'), samplePayload('2026-11-12T20:10'));
    expect(view.night).toBe(true);
    expect(view.days[0].hours.map((hour) => hour.label)).toEqual([
      '12 PM',
      '1 PM',
      '2 PM',
      '3 PM',
      '4 PM',
      '5 PM',
      '6 PM',
      '7 PM',
      '8 PM',
      '9 PM',
      '10 PM',
      '11 PM',
    ]);
  });

  it('keeps a morning hour before sunrise as night', () => {
    const view = parseForecast(city('austin'), samplePayload('2026-11-12T02:10'));
    expect(view.night).toBe(true);
    expect(view.days[0].hours[0]).toMatchObject({ label: '2 AM', night: true });
    expect(view.days[0].hours[5]).toMatchObject({ label: '7 AM', night: false });
    expect(view.days[0].hours).toHaveLength(12);
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
