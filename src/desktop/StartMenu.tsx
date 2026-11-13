import { JSX, useEffect, useRef, type KeyboardEvent } from 'react';
import { useWeatherChromeIcon } from '../weather/selection';
import { apps, desktopLinks } from './apps';
import { useDesktop } from './useDesktop';

function StartMenu({ onClose }: { onClose: () => void }): JSX.Element {
  const { run } = useDesktop();
  const weatherIcon = useWeatherChromeIcon();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    items?.[0]?.focus();
  }, []);

  const launch = (id: string) => {
    run({ type: 'open', id });
    onClose();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const start = current < 0 ? (event.key === 'ArrowUp' ? 0 : -1) : current;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      items[(start + delta + items.length) % items.length]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      id="start-menu"
      className="start-menu"
      role="menu"
      aria-label="Start"
      onKeyDown={onKeyDown}
    >
      <div className="start-banner" aria-hidden="true">
        <span>Windows 95</span>
      </div>
      <div className="start-menu-items">
        {apps.map((app) => (
          <button
            key={app.id}
            type="button"
            role="menuitem"
            className="start-item"
            onClick={() => launch(app.id)}
          >
            <img src={app.id === 'weather' ? weatherIcon : app.icon} alt="" draggable={false} />
            <span>{app.title}</span>
          </button>
        ))}
        {desktopLinks.map((link) => (
          <a
            key={link.id}
            role="menuitem"
            className="start-item"
            href={link.url}
            {...(link.url.startsWith('mailto:')
              ? {}
              : { target: '_blank', rel: 'noopener noreferrer' })}
            onClick={onClose}
          >
            <img src={link.icon} alt="" draggable={false} />
            <span>{link.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default StartMenu;
