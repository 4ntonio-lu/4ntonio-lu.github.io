/** Cities in the Weather menu. Open-Meteo is queried for the selected city only. */
export const CITIES = [
  {
    id: 'austin',
    label: 'Austin, TX',
    latitude: 30.2672,
    longitude: -97.7431,
    timeZone: 'America/Chicago',
  },
  {
    id: 'portland',
    label: 'Portland, OR',
    latitude: 45.5152,
    longitude: -122.6784,
    timeZone: 'America/Los_Angeles',
  },
  {
    id: 'san-francisco',
    label: 'San Francisco, CA',
    latitude: 37.7749,
    longitude: -122.4194,
    timeZone: 'America/Los_Angeles',
  },
  {
    id: 'los-angeles',
    label: 'Los Angeles, CA',
    latitude: 34.0522,
    longitude: -118.2437,
    timeZone: 'America/Los_Angeles',
  },
  {
    id: 'new-york',
    label: 'New York, NY',
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: 'America/New_York',
  },
  {
    id: 'miami',
    label: 'Miami, FL',
    latitude: 25.7617,
    longitude: -80.1918,
    timeZone: 'America/New_York',
  },
  {
    id: 'las-vegas',
    label: 'Las Vegas, NV',
    latitude: 36.1699,
    longitude: -115.1398,
    timeZone: 'America/Los_Angeles',
  },
  {
    id: 'seattle',
    label: 'Seattle, WA',
    latitude: 47.6062,
    longitude: -122.3321,
    timeZone: 'America/Los_Angeles',
  },
  {
    id: 'honolulu',
    label: 'Honolulu, HI',
    latitude: 21.3069,
    longitude: -157.8583,
    timeZone: 'Pacific/Honolulu',
  },
] as const;

export type City = (typeof CITIES)[number];
export type CityId = City['id'];

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';

export type HourForecast = {
  label: string;
  tempF: number;
  kind: WeatherKind;
};

export type DayForecast = {
  label: string;
  highF: number;
  lowF: number;
  kind: WeatherKind;
};

export type ForecastView = {
  cityId: CityId;
  tempF: number;
  condition: string;
  kind: WeatherKind;
  highF: number;
  lowF: number;
  windMph: number;
  humidity: number;
  hours: HourForecast[];
  days: DayForecast[];
};

/** Daytime hours shown in the Today panel. The API returns the city's local time. */
const TODAY_HOURS = [9, 12, 15, 18, 21] as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const memory = new Map<CityId, ForecastView>();
const inflight = new Map<CityId, Promise<ForecastView>>();

export function readForecast(cityId: CityId): ForecastView | null {
  return memory.get(cityId) ?? null;
}

/** Tests reset the page-session cache. The window itself keeps it until reload. */
export function clearForecastSession(): void {
  memory.clear();
  inflight.clear();
}

export function forecastUrl(city: City): string {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
    hourly: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    timezone: city.timeZone,
    forecast_days: '7',
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

function describeCode(code: number): { kind: WeatherKind; label: string } {
  if (code === 0) return { kind: 'clear', label: 'Clear' };
  if (code === 1) return { kind: 'clear', label: 'Mainly clear' };
  if (code === 2) return { kind: 'partly', label: 'Partly cloudy' };
  if (code === 3) return { kind: 'cloudy', label: 'Overcast' };
  if (code === 45 || code === 48) return { kind: 'fog', label: 'Fog' };
  if (code === 51 || code === 56) return { kind: 'rain', label: 'Light drizzle' };
  if (code === 53) return { kind: 'rain', label: 'Drizzle' };
  if (code === 55 || code === 57) return { kind: 'rain', label: 'Heavy drizzle' };
  if (code === 61 || code === 80) return { kind: 'rain', label: 'Light rain' };
  if (code === 63 || code === 81) return { kind: 'rain', label: 'Rain' };
  if (code === 65 || code === 82) return { kind: 'rain', label: 'Heavy rain' };
  if (code === 66 || code === 67) return { kind: 'rain', label: 'Freezing rain' };
  if (code === 71) return { kind: 'snow', label: 'Light snow' };
  if (code === 73 || code === 77) return { kind: 'snow', label: 'Snow' };
  if (code === 75) return { kind: 'snow', label: 'Heavy snow' };
  if (code === 85 || code === 86) return { kind: 'snow', label: 'Snow showers' };
  if (code === 95 || code === 96 || code === 99) return { kind: 'storm', label: 'Thunderstorm' };
  return { kind: 'cloudy', label: 'Unknown' };
}

function whole(value: number): number {
  return Math.round(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null) return value as Record<string, unknown>;
  return null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function hourOf(stamp: string): number | null {
  const match = /T(\d{2})/.exec(stamp);
  if (!match) return null;
  const hour = Number(match[1]);
  return hour >= 0 && hour <= 23 ? hour : null;
}

function dayOf(stamp: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(stamp);
  return match ? match[1] : null;
}

/** Weekday of a calendar date. The forecast timestamps are already in the city zone. */
function weekdayLabel(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return '';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return WEEKDAYS[date.getUTCDay()];
}

function series(record: Record<string, unknown> | null, key: string): unknown[] | null {
  if (!record) return null;
  const value = record[key];
  return Array.isArray(value) ? value : null;
}

export function parseForecast(city: City, payload: unknown): ForecastView {
  const root = asRecord(payload);
  const current = asRecord(root?.current);
  const hourly = asRecord(root?.hourly);
  const daily = asRecord(root?.daily);
  const temp = asNumber(current?.temperature_2m);
  const humidity = asNumber(current?.relative_humidity_2m);
  const wind = asNumber(current?.wind_speed_10m);
  const code = asNumber(current?.weather_code);
  const times = series(hourly, 'time');
  const hourTemps = series(hourly, 'temperature_2m');
  const hourCodes = series(hourly, 'weather_code');
  const dates = series(daily, 'time');
  const highs = series(daily, 'temperature_2m_max');
  const lows = series(daily, 'temperature_2m_min');
  const dayCodes = series(daily, 'weather_code');
  const today = dates ? asString(dates[0]) : null;

  if (
    temp == null ||
    humidity == null ||
    wind == null ||
    code == null ||
    !times ||
    !hourTemps ||
    !hourCodes ||
    !dates ||
    !highs ||
    !lows ||
    !dayCodes ||
    !today
  ) {
    throw new Error('Bad forecast');
  }

  const byHour = new Map<number, { tempF: number; kind: WeatherKind }>();
  const count = Math.min(times.length, hourTemps.length, hourCodes.length);
  for (let index = 0; index < count; index += 1) {
    const stamp = asString(times[index]);
    const hourTemp = asNumber(hourTemps[index]);
    const hourCode = asNumber(hourCodes[index]);
    if (!stamp || hourTemp == null || hourCode == null) continue;
    if (dayOf(stamp) !== today) continue;
    const hour = hourOf(stamp);
    if (hour == null || !TODAY_HOURS.includes(hour as (typeof TODAY_HOURS)[number])) continue;
    byHour.set(hour, { tempF: whole(hourTemp), kind: describeCode(hourCode).kind });
  }

  const hours: HourForecast[] = TODAY_HOURS.flatMap((hour) => {
    const slot = byHour.get(hour);
    if (!slot) return [];
    const suffix = hour < 12 ? 'AM' : 'PM';
    const clock = hour % 12 || 12;
    return [{ label: `${clock} ${suffix}`, tempF: slot.tempF, kind: slot.kind }];
  });

  const days: DayForecast[] = [];
  const dayCount = Math.min(dates.length, highs.length, lows.length, dayCodes.length, 7);
  for (let index = 0; index < dayCount; index += 1) {
    const date = asString(dates[index]);
    const high = asNumber(highs[index]);
    const low = asNumber(lows[index]);
    const dayCode = asNumber(dayCodes[index]);
    if (!date || high == null || low == null || dayCode == null) continue;
    const label = weekdayLabel(date);
    if (!label) continue;
    days.push({
      label,
      highF: whole(high),
      lowF: whole(low),
      kind: describeCode(dayCode).kind,
    });
  }

  if (hours.length === 0 || days.length === 0) throw new Error('Bad forecast');

  const todayHigh = asNumber(highs[0]);
  const todayLow = asNumber(lows[0]);
  if (todayHigh == null || todayLow == null) throw new Error('Bad forecast');

  const condition = describeCode(code);
  return {
    cityId: city.id,
    tempF: whole(temp),
    condition: condition.label,
    kind: condition.kind,
    highF: whole(todayHigh),
    lowF: whole(todayLow),
    windMph: whole(wind),
    humidity: whole(humidity),
    hours,
    days,
  };
}

/** One city at a time. A city already loaded in this page session is not fetched again. */
export function loadForecast(cityId: CityId): Promise<ForecastView> {
  const cached = memory.get(cityId);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(cityId);
  if (pending) return pending;

  const city = CITIES.find((item) => item.id === cityId);
  if (!city) return Promise.reject(new Error('Unknown city'));

  const request = fetch(forecastUrl(city))
    .then(async (response) => {
      if (!response.ok) throw new Error('Forecast unavailable');
      const view = parseForecast(city, await response.json());
      memory.set(cityId, view);
      return view;
    })
    .finally(() => {
      inflight.delete(cityId);
    });

  inflight.set(cityId, request);
  return request;
}
