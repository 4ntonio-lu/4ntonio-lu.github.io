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

/** The sun-and-cloud sprite. Cloudy marks are fitted to this rendered box. */
const SUN_CLOUD = { width: 72, height: 53 };

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
}: {
  kind: WeatherKind;
  night?: boolean;
  size: number;
}): JSX.Element {
  const name = markName(kind, night);
  // The plain cloud is wider than the sun-and-cloud mark. Fit it in that same box.
  // The moon-cloudy sprite is already the same canvas, so a shared height matches it.
  if (CLOUD_MARKS.has(name)) {
    const width = Math.round((size * SUN_CLOUD.width) / SUN_CLOUD.height);
    return (
      <span className="weather-mark-slot" style={{ width, height: size }}>
        <img className="weather-mark" src={MARKS[name]} alt="" draggable={false} />
      </span>
    );
  }
  return <img className="weather-mark" src={MARKS[name]} alt="" height={size} draggable={false} />;
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
            <WeatherMark kind={hour.kind} night={hour.night} size={22} />
            <span>{hour.tempF}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Weather(): JSX.Element {
  const [cityId, setCityId] = useState<CityId>(CITIES[0].id);
  const [view, setView] = useState<ForecastView | null>(() => readForecast(CITIES[0].id));
  const [failedId, setFailedId] = useState<CityId | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);

  useEffect(() => {
    if (readForecast(cityId)) return;

    let active = true;
    loadForecast(cityId).then(
      (next) => {
        if (!active) return;
        setView(next);
        setFailedId(null);
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
    setCityId(next);
    setChoice(null);
    const cached = readForecast(next);
    setView(cached);
    setFailedId(null);
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

  return (
    <WindowBox
      name="Weather"
      width={WEATHER_WINDOW_WIDTH}
      content={
        <div className="weather">
          <div className="weather-top">
            <CityControl cityId={cityId} onChoose={choose} />
            {view && (
              <fieldset className="weather-now">
                <legend>Now</legend>
                <div className="weather-now-line">
                  <WeatherMark kind={view.kind} night={view.night} size={32} />
                  <span className="weather-temp">{view.tempF} F</span>
                  <span className="weather-condition">{view.condition}</span>
                </div>
                <div className="weather-now-line">
                  <span>Feels like {view.feelsLikeF} F</span>
                  <span>Wind {view.windMph} mph</span>
                  <span>Humidity {view.humidity}%</span>
                </div>
              </fieldset>
            )}
            {view && (
              <div className="weather-corner">
                <div className="weather-corner-row">
                  <span>High {active === 'next' ? view.nextHighF : selectedDay?.highF} F</span>
                  <span>Low {active === 'next' ? view.nextLowF : selectedDay?.lowF} F</span>
                </div>
                <div className="weather-corner-row">
                  <span>Sunrise {active === 'next' ? view.nextSunrise : selectedDay?.sunrise}</span>
                  <span>Sunset {active === 'next' ? view.nextSunset : selectedDay?.sunset}</span>
                </div>
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
                              <WeatherMark kind={day.kind} size={20} />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
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
