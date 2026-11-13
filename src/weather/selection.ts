import { useEffect, useSyncExternalStore } from 'react';
import dayUrl from '../assets/images/weather.png';
import nightUrl from '../assets/images/weather-night.png';
import { CITIES, loadForecast, type CityId } from './forecast';

type State = {
  cityId: CityId;
  night: boolean;
  sunrise: string | null;
  sunset: string | null;
};

let state: State = {
  cityId: CITIES[0].id,
  night: false,
  sunrise: null,
  sunset: null,
};

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function clockToMinutes(label: string | null): number | null {
  if (!label) return null;
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(label);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3] === 'PM') hour += 12;
  return hour * 60 + Number(match[2]);
}

function minutesInZone(timeZone: string, now: Date): number | null {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  let hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (hour === 24) hour = 0;
  return hour * 60 + minute;
}

/** True before the city's sunrise and from its sunset onward. Uses that city's zone. */
export function cityIsNight(
  cityId: CityId,
  sunrise: string | null,
  sunset: string | null,
  now = new Date(),
): boolean {
  const city = CITIES.find((item) => item.id === cityId);
  if (!city || !sunrise || !sunset) return false;
  const current = minutesInZone(city.timeZone, now);
  const rise = clockToMinutes(sunrise);
  const set = clockToMinutes(sunset);
  if (current == null || rise == null || set == null) return false;
  return current < rise || current >= set;
}

export function getWeatherCity(): CityId {
  return state.cityId;
}

export function useWeatherCity(): CityId {
  return useSyncExternalStore(subscribe, getWeatherCity, getWeatherCity);
}

/** Sun-and-cloud by day, moon-and-cloud after sunset and before sunrise. */
export function useWeatherChromeIcon(): string {
  const night = useSyncExternalStore(
    subscribe,
    () => state.night,
    () => state.night,
  );
  return night ? nightUrl : dayUrl;
}

export function setWeatherCity(cityId: CityId): void {
  if (state.cityId === cityId) return;
  state = { ...state, cityId, sunrise: null, sunset: null };
  emit();
}

/** Remember today's sunrise and sunset for the city whose forecast just arrived. */
export function noteForecastSun(
  cityId: CityId,
  sunrise: string | null,
  sunset: string | null,
): void {
  if (state.cityId !== cityId) return;
  const night = cityIsNight(cityId, sunrise, sunset);
  if (state.night === night && state.sunrise === sunrise && state.sunset === sunset) return;
  state = { ...state, night, sunrise, sunset };
  emit();
}

function refreshNight(): void {
  if (!state.sunrise || !state.sunset) return;
  const night = cityIsNight(state.cityId, state.sunrise, state.sunset);
  if (night === state.night) return;
  state = { ...state, night };
  emit();
}

/** Keeps the desktop, Start, and title icons on the selected city's sun. */
export function WeatherChromeSync(): null {
  const cityId = useWeatherCity();

  useEffect(() => {
    if (import.meta.env.VITEST) return;
    let active = true;
    loadForecast(cityId).then(
      (view) => {
        if (!active) return;
        noteForecastSun(view.cityId, view.sunrise, view.sunset);
      },
      () => {
        // The icons stay on the last known sun until a forecast arrives.
      },
    );
    const timer = window.setInterval(refreshNight, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [cityId]);

  return null;
}
