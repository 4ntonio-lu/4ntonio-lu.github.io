import { JSX, useEffect, useState } from 'react';

const MINUTE = 60_000;

const fullDate = (date: Date) => date.toLocaleDateString([], { dateStyle: 'full' });
const shortDate = (date: Date) =>
  date.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' });
const shortTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** Tray clock. The date sits beside the time; hovering still shows the full date. */
function TrayClock(): JSX.Element {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNextMinute = () => {
      timer = setTimeout(
        () => {
          setNow(new Date());
          scheduleNextMinute();
        },
        MINUTE - (Date.now() % MINUTE),
      );
    };
    scheduleNextMinute();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div title={fullDate(now)} className="tray-clock">
      <time dateTime={now.toISOString()}>
        {shortDate(now)} {shortTime(now)}
      </time>
    </div>
  );
}

export default TrayClock;
