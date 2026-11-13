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

const SLOT_MARKS = new Set<MarkName>(['cloudy', 'fog', 'snow', 'cloud-moon']);

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
  // The draft cloud is a wide sprite. Fit it, and the cloud-with-moon, in the same
  // box as the sun and rain instead of letting that width make them larger.
  if (SLOT_MARKS.has(name)) {
    return (
      <span className="weather-mark-slot" style={{ width: size, height: size }}>
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

function HourPanel({ view, dayIndex }: { view: ForecastView; dayIndex: number }): JSX.Element {
  const day = view.days[dayIndex] ?? view.days[0];
  const heading = dayIndex === 0 ? 'Today' : day.label;
  return (
    <section className="weather-panel" aria-label={heading}>
      <h2>{heading}</h2>
      <ul className="weather-hours">
        {day.hours.map((hour) => (
          <li key={`${day.date}-${hour.label}`} className="weather-hour">
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
  const [dayIndex, setDayIndex] = useState(0);

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
    setDayIndex(0);
    const cached = readForecast(next);
    setView(cached);
    setFailedId(null);
  };

  const failed = !view && failedId === cityId;

  return (
    <WindowBox
      name="Weather"
      width={WEATHER_WINDOW_WIDTH}
      content={
        <div className="weather">
          <div className="weather-top">
            <CityControl cityId={cityId} onChoose={choose} />
            {view && (
              <div className="weather-now">
                <WeatherMark kind={view.kind} night={view.night} size={32} />
                <span className="weather-temp">{view.tempF} F</span>
                <span className="weather-condition">{view.condition}</span>
              </div>
            )}
          </div>

          {view ? (
            <>
              <div className="weather-stats">
                <span>High {view.highF} F</span>
                <span>Low {view.lowF} F</span>
                <span>Wind {view.windMph} mph</span>
                <span>Humidity {view.humidity}%</span>
              </div>
              <div className="weather-columns">
                <HourPanel view={view} dayIndex={dayIndex} />
                <section className="weather-panel" aria-label="Week">
                  <h2>Week</h2>
                  <ul className="weather-days">
                    {view.days.map((day, index) => {
                      const selected = index === dayIndex;
                      return (
                        <li key={day.date}>
                          <button
                            type="button"
                            className={selected ? 'weather-day is-selected' : 'weather-day'}
                            aria-pressed={selected}
                            onClick={() => setDayIndex(index)}
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

          <p className="weather-credit">
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
              Powered by Open-Meteo
            </a>
          </p>
        </div>
      }
    />
  );
}

export default Weather;
