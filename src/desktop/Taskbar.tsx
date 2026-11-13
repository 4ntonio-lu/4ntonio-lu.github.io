import { JSX, useEffect, useRef, useState } from 'react';
import { img } from '../assets/images/img';
import TrayClock from '../components/elements/TrayClock';
import { useWeatherChromeIcon } from '../weather/selection';
import { appById } from './apps';
import { useDesktop } from './useDesktop';
import StartMenu from './StartMenu';

function Taskbar(): JSX.Element {
  const { windows, focusedId, run } = useDesktop();
  const weatherIcon = useWeatherChromeIcon();
  const [menuOpen, setMenuOpen] = useState(false);
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!barRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <nav ref={barRef} className="taskbar" aria-label="Taskbar">
      <button
        type="button"
        className={`start-button ${menuOpen ? 'button-pressed' : 'button-shadow'}`}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-controls="start-menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <img src={img.start} alt="" />
        <span>Start</span>
      </button>

      {menuOpen && <StartMenu onClose={() => setMenuOpen(false)} />}

      <div className="taskbar-windows">
        {windows.map((window) => {
          const app = appById(window.id);
          if (!app) return null;
          const pressed = focusedId === window.id && !window.minimized;
          return (
            <button
              key={window.id}
              type="button"
              className={`taskbar-button ${pressed ? 'button-pressed' : 'button-shadow'}`}
              aria-pressed={pressed}
              onClick={() => run({ type: 'taskbar', id: window.id })}
            >
              <img src={app.id === 'weather' ? weatherIcon : app.icon} alt="" />
              <span>{app.title}</span>
            </button>
          );
        })}
      </div>

      <TrayClock />
    </nav>
  );
}

export default Taskbar;
