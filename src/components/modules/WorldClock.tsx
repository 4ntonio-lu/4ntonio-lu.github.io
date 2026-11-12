import { JSX, useEffect, useState } from 'react';
import WindowBox from '../elements/WindowBox';

const SECOND = 1_000;

/** Cities shown beside the visitor's own clock. Times come from Intl, not a network call. */
const worldClockZones = [
  { city: 'Austin', timeZone: 'America/Chicago' },
  { city: 'New York', timeZone: 'America/New_York' },
  { city: 'London', timeZone: 'Europe/London' },
  { city: 'Tokyo', timeZone: 'Asia/Tokyo' },
  { city: 'Sydney', timeZone: 'Australia/Sydney' },
] as const;

const zoneDate = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);

const zoneTime = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);

const zoneAbbrev = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat(undefined, { timeZone, timeZoneName: 'short' })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value ?? timeZone;

function WorldClock(): JSX.Element {
  const [now, setNow] = useState(() => new Date());
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNextSecond = () => {
      timer = setTimeout(
        () => {
          setNow(new Date());
          scheduleNextSecond();
        },
        SECOND - (Date.now() % SECOND),
      );
    };
    scheduleNextSecond();
    return () => clearTimeout(timer);
  }, []);

  const rows = [{ city: 'Local', timeZone: localZone }, ...worldClockZones];

  return (
    <WindowBox
      name="World Clock"
      width={0.38}
      content={
        <div className="world-clock">
          <table>
            <tbody>
              {rows.map((row) => (
                <tr key={row.city}>
                  <th scope="row">
                    {row.city}
                    {row.city === 'Local' ? (
                      <span className="world-clock-zone">{zoneAbbrev(now, row.timeZone)}</span>
                    ) : null}
                  </th>
                  <td>{zoneDate(now, row.timeZone)}</td>
                  <td>
                    <time dateTime={now.toISOString()}>{zoneTime(now, row.timeZone)}</time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    />
  );
}

export default WorldClock;
