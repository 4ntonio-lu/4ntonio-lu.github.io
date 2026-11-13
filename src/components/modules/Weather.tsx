import { useEffect, useLayoutEffect, useRef, useState, type JSX } from 'react';
import WindowBox from '../elements/WindowBox';
import { WEATHER_WINDOW_WIDTH } from '../../desktop/windowManager';
import {
  CITIES,
  loadForecast,
  readForecast,
  dayHeading,
  type CityId,
  type ForecastView,
  type WeatherKind,
} from '../../weather/forecast';
import { locateNearestCity } from '../../weather/nearest';
import {
  getWeatherCity,
  noteForecastSun,
  setWeatherCity,
  useWeatherCity,
} from '../../weather/selection';
import sunUrl from '../../weather/icons/sun.png';
import partlyUrl from '../../weather/icons/partly.png';
import cloudUrl from '../../weather/icons/cloud.png';
import rainUrl from '../../weather/icons/rain.png';
import moonUrl from '../../weather/icons/moon.png';
import cloudMoonUrl from '../../weather/icons/cloud-moon.png';

/** Marks cropped from the weather draft. Night marks are drawn in that same small pixel style. */
const MARKS = {
  clear: sunUrl,
  partly: partlyUrl,
  cloudy: cloudUrl,
  fog: cloudUrl,
  rain: rainUrl,
  snow: cloudUrl,
  storm: rainUrl,
  moon: moonUrl,
  'cloud-moon': cloudMoonUrl,
} as const;

type MarkName = keyof typeof MARKS;

/** The sun-and-cloud sprite. Its rendered size stays put. */
const SUN_CLOUD = { width: 72, height: 53 };

/** Plain cloud, a little under the sun-and-cloud box in the hour grid and week list. */
const CLOUD_SCALE = 0.9;

/** Rain, a little over its previous size in the hour grid and week list. */
const RAIN_SCALE = 1.12;

const CLOUD_MARKS = new Set<MarkName>(['cloudy', 'fog', 'snow']);

function markName(kind: WeatherKind, night: boolean): MarkName {
  if (!night) return kind;
  if (kind === 'clear') return 'moon';
  if (kind === 'rain' || kind === 'storm') return 'rain';
  return 'cloud-moon';
}

function WeatherMark({
  kind,
  night = false,
  size,
  shrinkCloud = false,
  growRain = false,
}: {
  kind: WeatherKind;
  night?: boolean;
  size: number;
  /** Hour grid and week list draw the plain cloud slightly under the sun-and-cloud size. */
  shrinkCloud?: boolean;
  /** Hour grid and week list draw rain a little larger. The sun-and-cloud size stays put. */
  growRain?: boolean;
}): JSX.Element {
  const name = markName(kind, night);
  // The plain cloud is wider than the sun-and-cloud mark, so it sits in that box.
  // The moon-cloudy sprite is already the same canvas, so a shared height matches it.
  if (CLOUD_MARKS.has(name)) {
    const scale = shrinkCloud ? CLOUD_SCALE : 1;
    const width = Math.round(((size * SUN_CLOUD.width) / SUN_CLOUD.height) * scale);
    const height = Math.round(size * scale);
    return (
      <span className="weather-mark-slot" style={{ width, height }}>
        <img className="weather-mark" src={MARKS[name]} alt="" draggable={false} />
      </span>
    );
  }
  const height = name === 'rain' && growRain ? Math.round(size * RAIN_SCALE) : size;
  return (
    <img className="weather-mark" src={MARKS[name]} alt="" height={height} draggable={false} />
  );
}

function CityControl({
  cityId,
  onChoose,
}: {
  cityId: CityId;
  onChoose: (id: CityId) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const label = CITIES.find((city) => city.id === cityId)?.label ?? '';

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="weather-combo" ref={rootRef}>
      <button
        type="button"
        className="weather-combo-face"
        aria-label="City"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="weather-combo-label">
          <span>{label}</span>
        </span>
        <span className="weather-combo-button" aria-hidden="true">
          <span className="weather-combo-caret" />
        </span>
      </button>
      {open && (
        <ul className="weather-combo-menu" role="listbox" aria-label="City">
          {CITIES.map((city) => (
            <li key={city.id} role="none">
              <button
                type="button"
                role="option"
                aria-selected={city.id === cityId}
                onClick={() => {
                  onChoose(city.id);
                  setOpen(false);
                }}
              >
                {city.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const CURRENT_TEXT = 32;

const MIN_TEXT = 22;
const MAX_GAP = 13;
const MIN_GAP = 4;

/** Temperature and condition share one size, matching the icon unless the row would leave the window. */
function fitCurrentText(row: HTMLElement) {
  const body = row.closest<HTMLElement>('.win95-body');
  const top = row.closest<HTMLElement>('.weather-top');
  const temp = row.querySelector<HTMLElement>('.weather-temp');
  const condition = row.querySelector<HTMLElement>('.weather-condition');
  if (!body || !temp || !condition) return;
  const apply = (px: number, gap: number) => {
    const value = `${px}px`;
    temp.style.fontSize = value;
    condition.style.fontSize = value;
    const space = `${gap}px`;
    row.style.columnGap = space;
    if (top && getComputedStyle(top).flexDirection !== 'column') top.style.gap = space;
    else if (top) top.style.gap = '';
  };
  // The row shrinks to the space beside the city menu, and the items paint past that box.
  const edge = () => (row.lastElementChild ?? row).getBoundingClientRect().right;
  const limit = () => body.getBoundingClientRect().left + body.clientWidth - 2;
  let size = CURRENT_TEXT;
  let gap = MAX_GAP;
  apply(size, gap);
  while (edge() > limit() && (size > MIN_TEXT || gap > MIN_GAP)) {
    if (size > MIN_TEXT) size -= 0.5;
    else gap -= 1;
    apply(size, gap);
  }
}

type Choice = 'next' | number;

function resolvedChoice(view: ForecastView, choice: Choice | null): Choice {
  if (choice === 'next') return 'next';
  if (typeof choice === 'number' && view.days[choice]) return choice;
  return 'next';
}

function HourPanel({
  heading,
  hours,
}: {
  heading: string;
  hours: ForecastView['nextHours'];
}): JSX.Element {
  return (
    <section className="weather-panel weather-hours-panel" aria-label={heading}>
      <h2>{heading}</h2>
      <ul className="weather-hours">
        {hours.map((hour, index) => (
          <li key={`${hour.label}-${index}`} className="weather-hour">
            <span className="weather-hour-time">{hour.label}</span>
            <span className="weather-hour-mark">
              <WeatherMark kind={hour.kind} night={hour.night} size={22} shrinkCloud growRain />
            </span>
            <span className="weather-hour-temp">{hour.tempF}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Weather(): JSX.Element {
  const cityId = useWeatherCity();
  const [view, setView] = useState<ForecastView | null>(() => readForecast(getWeatherCity()));
  const [failedId, setFailedId] = useState<CityId | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const picked = useRef(false);
  const currentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const row = currentRef.current;
    if (!row) return;
    const body = row.closest('.win95-body');
    if (!body) return;
    const fit = () => fitCurrentText(row);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(body);
    row.querySelectorAll('img').forEach((img) => observer.observe(img));
    return () => observer.disconnect();
  });

  useEffect(() => {
    let active = true;
    locateNearestCity().then((next) => {
      if (!active || !next || picked.current) return;
      setWeatherCity(next);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const cached = readForecast(cityId);
    if (cached) {
      setView(cached);
      noteForecastSun(cached.cityId, cached.sunrise, cached.sunset);
      return;
    }

    setView(null);
    let active = true;
    loadForecast(cityId).then(
      (next) => {
        if (!active) return;
        setView(next);
        setFailedId(null);
        noteForecastSun(next.cityId, next.sunrise, next.sunset);
      },
      () => {
        if (!active) return;
        setView(null);
        setFailedId(cityId);
      },
    );
    return () => {
      active = false;
    };
  }, [cityId]);

  const choose = (next: CityId) => {
    picked.current = true;
    setChoice(null);
    setFailedId(null);
    const cached = readForecast(next);
    setView(cached);
    setWeatherCity(next);
  };

  const failed = !view && failedId === cityId;
  const active = view ? resolvedChoice(view, choice) : 'next';
  const selectedDay = view && typeof active === 'number' ? view.days[active] : null;
  const heading =
    active === 'next' || !selectedDay
      ? 'Next 12 hours'
      : dayHeading(selectedDay.label, selectedDay.date);
  const hours = view ? (active === 'next' ? view.nextHours : (selectedDay?.hours ?? [])) : [];
  const high = view ? (active === 'next' ? view.nextHighF : selectedDay?.highF) : null;
  const low = view ? (active === 'next' ? view.nextLowF : selectedDay?.lowF) : null;
  const sunEvents = !view
    ? []
    : active === 'next'
      ? view.nextSun
      : [
          { name: 'Sunrise' as const, time: selectedDay?.sunrise ?? '' },
          { name: 'Sunset' as const, time: selectedDay?.sunset ?? '' },
        ];

  return (
    <WindowBox
      name="Weather"
      width={WEATHER_WINDOW_WIDTH}
      content={
        <div className="weather">
          <div className="weather-top">
            <CityControl cityId={cityId} onChoose={choose} />
            {view && (
              <div className="weather-current" ref={currentRef}>
                <WeatherMark kind={view.kind} night={view.night} size={32} />
                <span className="weather-temp">{view.tempF} F</span>
                <span className="weather-condition">{view.condition}</span>
                <span className="weather-stat">
                  <span className="weather-stat-label">Feels like</span>
                  <span className="weather-stat-value">{view.feelsLikeF} F</span>
                </span>
                <span className="weather-stat">
                  <span className="weather-stat-label">Wind</span>
                  <span className="weather-stat-value">{view.windMph} mph</span>
                </span>
                <span className="weather-stat">
                  <span className="weather-stat-label">Humidity</span>
                  <span className="weather-stat-value">{view.humidity}%</span>
                </span>
                {view.uvIndex != null && (
                  <span className="weather-stat">
                    <span className="weather-stat-label">UV Index</span>
                    <span className="weather-stat-value">{view.uvIndex}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {view ? (
            <>
              <div className="weather-columns">
                <HourPanel heading={heading} hours={hours} />
                <section className="weather-panel" aria-label="Week">
                  <h2>Week</h2>
                  <ul className="weather-days">
                    <li>
                      <button
                        type="button"
                        className={
                          active === 'next'
                            ? 'weather-day is-next is-selected'
                            : 'weather-day is-next'
                        }
                        aria-pressed={active === 'next'}
                        onClick={() => setChoice('next')}
                      >
                        Next 12 hours
                      </button>
                    </li>
                    {view.days.map((day, index) => {
                      const selected = active === index;
                      return (
                        <li key={day.date}>
                          <button
                            type="button"
                            className={selected ? 'weather-day is-selected' : 'weather-day'}
                            aria-pressed={selected}
                            onClick={() => setChoice(index)}
                          >
                            <span>{day.label}</span>
                            <span className="weather-day-temps">
                              {day.highF}/{day.lowF}
                            </span>
                            <span className="weather-day-mark">
                              <WeatherMark kind={day.kind} size={20} shrinkCloud growRain />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>
              <div className="weather-sun">
                <div className="weather-sun-pair">
                  {sunEvents.map((event) => (
                    <span key={event.name}>
                      {event.name} {event.time}
                    </span>
                  ))}
                </div>
                <div className="weather-sun-pair">
                  <span>High {high} F</span>
                  <span>Low {low} F</span>
                </div>
              </div>
            </>
          ) : (
            <p className="weather-message" role={failed ? 'alert' : 'status'}>
              {failed ? 'Forecast unavailable.' : 'Loading...'}
            </p>
          )}

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#272727]">
            <span className="text-[0.8rem] font-semibold">Powered by</span>
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.8rem] font-semibold underline"
            >
              Open-Meteo
            </a>
          </div>
        </div>
      }
    />
  );
}

export default Weather;
