import { JSX, useEffect, useRef, type KeyboardEvent } from 'react';
import { contentImage, profile, resumeUrl } from '../content';
import { apps } from './apps';
import { useDesktop } from './useDesktop';

function StartMenu({ onClose }: { onClose: () => void }): JSX.Element {
  const { run } = useDesktop();
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

  const shortcuts = [
    ...profile.links.map((link) => ({
      label: link.label,
      url: link.url,
      icon: contentImage(link.icon),
    })),
    { label: 'Resume PDF', url: resumeUrl, icon: apps.find((app) => app.id === 'resume')!.icon },
  ];

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
            <img src={app.icon} alt="" draggable={false} />
            <span>{app.title}</span>
          </button>
        ))}
        <div className="start-sep" role="separator" />
        {shortcuts.map((shortcut) => (
          <a
            key={shortcut.url}
            role="menuitem"
            className="start-item"
            href={shortcut.url}
            {...(shortcut.url.startsWith('mailto:')
              ? {}
              : { target: '_blank', rel: 'noopener noreferrer' })}
            onClick={onClose}
          >
            <img src={shortcut.icon} alt="" draggable={false} />
            <span>{shortcut.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default StartMenu;
