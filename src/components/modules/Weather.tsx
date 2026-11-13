import { useEffect, useRef, useState, type JSX } from 'react';
import WindowBox from '../elements/WindowBox';
import { WEATHER_WINDOW_WIDTH } from '../../desktop/windowManager';
import {
  CITIES,
  loadForecast,
  readForecast,
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
        <span className="weather-combo-label">{label}</span>
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

type Choice = 'next' | number;

function resolvedChoice(view: ForecastView, choice: Choice | null): Choice {
  if (choice === 'next') return 'next';
  if (typeof choice === 'number' && view.days[choice]) return choice;
  return view.pastNoon ? 'next' : 0;
}

function HourPanel({
  heading,
  hours,
}: {
  heading: string;
  hours: ForecastView['nextHours'];
}): JSX.Element {
  return (
    <section className="weather-panel" aria-label={heading}>
      <h2>{heading}</h2>
      <ul className="weather-hours">
        {hours.map((hour, index) => (
          <li key={`${hour.label}-${index}`} className="weather-hour">
            <span>{hour.label}</span>
            <WeatherMark kind={hour.kind} night={hour.night} size={22} shrinkCloud growRain />
            <span>{hour.tempF}</span>
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
  const heading = !view
    ? 'Today'
    : active === 'next'
      ? 'Next 12 hours'
      : selectedDay && selectedDay.date === view.today
        ? 'Today'
        : (selectedDay?.label ?? 'Today');
  const hours = view ? (active === 'next' ? view.nextHours : (selectedDay?.hours ?? [])) : [];
  const high = view ? (active === 'next' ? view.nextHighF : selectedDay?.highF) : null;
  const low = view ? (active === 'next' ? view.nextLowF : selectedDay?.lowF) : null;
  const sunrise = view ? (active === 'next' ? view.nextSunrise : selectedDay?.sunrise) : null;
  const sunset = view ? (active === 'next' ? view.nextSunset : selectedDay?.sunset) : null;

  return (
    <WindowBox
      name="Weather"
      width={WEATHER_WINDOW_WIDTH}
      content={
        <div className="weather">
          <div className="weather-top">
            <CityControl cityId={cityId} onChoose={choose} />
            {view && (
              <div className="weather-current">
                <WeatherMark kind={view.kind} night={view.night} size={24} />
                <span className="weather-temp">{view.tempF} F</span>
                <span className="weather-condition">{view.condition}</span>
                <span>Feels like {view.feelsLikeF} F</span>
                <span>Wind {view.windMph} mph</span>
                <span>Humidity {view.humidity}%</span>
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
                  <span>Sunrise {sunrise}</span>
                  <span>Sunset {sunset}</span>
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
