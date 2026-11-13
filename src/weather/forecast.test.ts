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
    0: { temp: 48.2, code: 0 },
    8: { temp: 58.2, code: 0 },
    19: { temp: 64.4, code: 0 },
  };
  const time: string[] = [];
  const temperature_2m: number[] = [];
  const weather_code: number[] = [];
  for (let day = 12; day <= 19; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const special = day === 12 ? thursday[hour] : day === 13 ? friday[hour] : undefined;
      time.push(`2026-11-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00`);
      temperature_2m.push(special?.temp ?? 50);
      weather_code.push(special?.code ?? 3);
    }
  }

  return {
    current: {
      time: currentTime,
      temperature_2m: 74.4,
      apparent_temperature: 71.6,
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
        '2026-11-19',
      ],
      weather_code: [0, 2, 0, 3, 61, 73, 95, 2],
      temperature_2m_max: [81.2, 79.4, 84.1, 77.2, 73.4, 70.1, 68.2, 66.4],
      temperature_2m_min: [63.4, 61.2, 66.2, 60.4, 58.1, 55.2, 52.4, 50.2],
      sunrise: [
        '2026-11-12T06:54',
        '2026-11-13T06:55',
        '2026-11-14T06:55',
        '2026-11-15T06:56',
        '2026-11-16T06:57',
        '2026-11-17T06:58',
        '2026-11-18T06:59',
        '2026-11-19T07:00',
      ],
      sunset: [
        '2026-11-12T17:35',
        '2026-11-13T17:35',
        '2026-11-14T17:34',
        '2026-11-15T17:34',
        '2026-11-16T17:33',
        '2026-11-17T17:33',
        '2026-11-18T17:33',
        '2026-11-19T17:32',
      ],
    },
  };
}

const EVEN_LABELS = [
  '12 AM',
  '2 AM',
  '4 AM',
  '6 AM',
  '8 AM',
  '10 AM',
  '12 PM',
  '2 PM',
  '4 PM',
  '6 PM',
  '8 PM',
  '10 PM',
];

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
    expect(austin).toContain('forecast_days=8');
    expect(austin).toContain('apparent_temperature');
    expect(austin).toContain('sunrise');
    expect(austin).toContain('sunset');
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
      feelsLikeF: 72,
      condition: 'Partly cloudy',
      kind: 'partly',
      night: false,
      highF: 81,
      lowF: 63,
      windMph: 8,
      humidity: 48,
      today: '2026-11-12',
      pastNoon: true,
      sunrise: '6:54 AM',
      sunset: '5:35 PM',
    });
    expect(view.nextHours.map((hour) => hour.label)).toEqual([
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
    expect(view.nextHours[0]).toEqual({ label: '12 PM', tempF: 76, kind: 'clear', night: false });
    expect(view.nextHours[6]).toEqual({ label: '6 PM', tempF: 77, kind: 'partly', night: true });
    expect(view.days.map(({ date, label }) => ({ date, label }))).toEqual([
      { date: '2026-11-13', label: 'Fri' },
      { date: '2026-11-14', label: 'Sat' },
      { date: '2026-11-15', label: 'Sun' },
      { date: '2026-11-16', label: 'Mon' },
      { date: '2026-11-17', label: 'Tue' },
      { date: '2026-11-18', label: 'Wed' },
      { date: '2026-11-19', label: 'Thu' },
    ]);
    expect(view.days[0].hours.map((hour) => hour.label)).toEqual(EVEN_LABELS);
    expect(view.days[0].hours[0]).toEqual({
      label: '12 AM',
      tempF: 48,
      kind: 'clear',
      night: true,
    });
    expect(view.days[0].hours[3]).toMatchObject({ label: '6 AM', night: true });
    expect(view.days[0].hours[4]).toEqual({
      label: '8 AM',
      tempF: 58,
      kind: 'clear',
      night: false,
    });
    expect(view.days[0].hours[9]).toMatchObject({ label: '6 PM', night: true });
  });

  it('keeps today on the list before noon', () => {
    const view = parseForecast(city('austin'), samplePayload('2026-11-12T10:15'));
    expect(view.pastNoon).toBe(false);
    expect(view.days.map((day) => day.date)).toEqual([
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
    ]);
    expect(view.days[0].hours.map((hour) => hour.label)).toEqual(EVEN_LABELS);
    expect(view.nextHours[0]).toMatchObject({ label: '10 AM', night: false });
    expect(view.nextHours[11]).toMatchObject({ label: '9 PM', night: true });
    expect(view.nextHours).toHaveLength(12);
  });

  it('treats exactly noon as still morning', () => {
    const view = parseForecast(city('austin'), samplePayload('2026-11-12T12:00'));
    expect(view.pastNoon).toBe(false);
    expect(view.days[0].date).toBe('2026-11-12');
  });

  it('continues the next twelve hours into the following day', () => {
    const view = parseForecast(city('austin'), samplePayload('2026-11-12T21:10'));
    expect(view.pastNoon).toBe(true);
    expect(view.night).toBe(true);
    expect(view.nextHours.map((hour) => hour.label)).toEqual([
      '9 PM',
      '10 PM',
      '11 PM',
      '12 AM',
      '1 AM',
      '2 AM',
      '3 AM',
      '4 AM',
      '5 AM',
      '6 AM',
      '7 AM',
      '8 AM',
    ]);
    expect(view.nextHours[0]).toEqual({ label: '9 PM', tempF: 70, kind: 'partly', night: true });
    expect(view.nextHours[3]).toEqual({ label: '12 AM', tempF: 48, kind: 'clear', night: true });
    expect(view.nextHours[9]).toMatchObject({ label: '6 AM', night: true });
    expect(view.nextHours[10]).toMatchObject({ label: '7 AM', night: false });
    expect(view.nextHours[11]).toEqual({ label: '8 AM', tempF: 58, kind: 'clear', night: false });
    expect(view.days[0].date).toBe('2026-11-13');
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
