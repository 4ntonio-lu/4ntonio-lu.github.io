import { JSX, useEffect, useState } from 'react';

const SECOND = 1_000;

const fullDate = (date: Date) => date.toLocaleDateString([], { dateStyle: 'full' });
const shortDate = (date: Date) =>
  date.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' });
const shortTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });

/** Tray clock. The short date sits beside h:mm:ss; hovering still shows the full date. */
function TrayClock(): JSX.Element {
  const [now, setNow] = useState(() => new Date());

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

  return (
    <div title={fullDate(now)} className="tray-clock">
      <time dateTime={now.toISOString()}>
        {shortDate(now)} {shortTime(now)}
      </time>
    </div>
  );
}

export default TrayClock;
