import { useEffect, useState, type JSX } from 'react';
import WindowBox from '../elements/WindowBox';
import {
  CITIES,
  loadForecast,
  readForecast,
  type CityId,
  type ForecastView,
  type WeatherKind,
} from '../../weather/forecast';
import { markPixels } from '../../weather/marks';

function WeatherMark({ kind, size }: { kind: WeatherKind; size: number }): JSX.Element {
  return (
    <svg
      className="weather-mark"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {markPixels(kind).map((pixel) => (
        <rect
          key={`${pixel.x}-${pixel.y}`}
          x={pixel.x}
          y={pixel.y}
          width={1}
          height={1}
          fill={pixel.fill}
        />
      ))}
    </svg>
  );
}

function Weather(): JSX.Element {
  const [cityId, setCityId] = useState<CityId>(CITIES[0].id);
  const [view, setView] = useState<ForecastView | null>(() => readForecast(CITIES[0].id));
  const [failedId, setFailedId] = useState<CityId | null>(null);

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
    const cached = readForecast(next);
    setView(cached);
    setFailedId(null);
  };

  const failed = !view && failedId === cityId;

  return (
    <WindowBox
      name="Weather"
      width={0.46}
      content={
        <div className="weather">
          <div className="weather-top">
            <select
              className="weather-select"
              aria-label="City"
              value={cityId}
              onChange={(event) => {
                const next = CITIES.find((city) => city.id === event.target.value);
                if (next) choose(next.id);
              }}
            >
              {CITIES.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.label}
                </option>
              ))}
            </select>
            {view && (
              <div className="weather-now">
                <WeatherMark kind={view.kind} size={32} />
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
                <section className="weather-panel" aria-label="Today">
                  <h2>Today</h2>
                  <ul className="weather-hours">
                    {view.hours.map((hour) => (
                      <li key={hour.label} className="weather-hour">
                        <span>{hour.label}</span>
                        <WeatherMark kind={hour.kind} size={24} />
                        <span>{hour.tempF}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="weather-panel" aria-label="Week">
                  <h2>Week</h2>
                  <ul className="weather-days">
                    {view.days.map((day, index) => (
                      <li
                        key={day.label}
                        className={index === 0 ? 'weather-day is-today' : 'weather-day'}
                      >
                        <span>{day.label}</span>
                        <span className="weather-day-temps">
                          {day.highF}/{day.lowF}
                        </span>
                        <span className="weather-day-mark">
                          <WeatherMark kind={day.kind} size={18} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </>
          ) : (
            <p className="weather-message" role={failed ? 'alert' : 'status'}>
              {failed ? 'Forecast unavailable.' : 'Loading...'}
            </p>
          )}

          <div className="weather-status">
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
              Powered by Open-Meteo
            </a>
          </div>
        </div>
      }
    />
  );
}

export default Weather;
