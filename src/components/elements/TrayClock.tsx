import { JSX, useEffect, useState } from 'react';

const MINUTE = 60_000;

/** The Win95 notification-area clock: hours and minutes, with the full date on hover. */
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
    <div
      title={now.toLocaleDateString([], { dateStyle: 'full' })}
      className="ml-auto shrink-0 whitespace-nowrap border border-solid px-3 py-[5px] text-[0.95rem] [border-color:#828282_#F7F7F7_#F7F7F7_#828282]"
    >
      <time dateTime={now.toISOString()}>
        {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </time>
    </div>
  );
}

export default TrayClock;
