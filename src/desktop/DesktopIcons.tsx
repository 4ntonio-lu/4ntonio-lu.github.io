import { useRef, type JSX, type MouseEvent, type PointerEvent } from 'react';
import { useWeatherChromeIcon } from '../weather/selection';
import { apps, desktopLinks, type DesktopLink } from './apps';
import { useDesktop } from './useDesktop';

type IconProps = {
  id: string;
  title: string;
  icon: string;
  selected: boolean;
  onOpen: () => void;
};

function openShortcut(url: string): void {
  if (url.startsWith('mailto:')) {
    window.location.href = url;
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function DesktopIcon({ id, title, icon, selected, onOpen }: IconProps): JSX.Element {
  const { dispatch } = useDesktop();
  // A touch tap opens on click, not pointerup, so the new window can't swallow the tap.
  const touch = useRef(false);

  const onPointerDown = (event: PointerEvent) => {
    touch.current = event.pointerType === 'touch';
  };

  const onClick = (event: MouseEvent) => {
    // Keyboard activation (detail 0) and a tap open. A mouse click only selects.
    if (event.detail === 0 || touch.current) {
      onOpen();
      return;
    }
    dispatch({ type: 'select', id });
  };

  return (
    <button
      type="button"
      className="desktop-icon"
      aria-pressed={selected}
      draggable={false}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onDoubleClick={onOpen}
    >
      <img src={icon} alt="" draggable={false} />
      <span className="desktop-icon-label">{title}</span>
    </button>
  );
}

function DesktopLinkIcon({
  link,
  selected,
}: {
  link: DesktopLink;
  selected: boolean;
}): JSX.Element {
  return (
    <DesktopIcon
      id={link.id}
      title={link.title}
      icon={link.icon}
      selected={selected}
      onOpen={() => openShortcut(link.url)}
    />
  );
}

function DesktopIcons(): JSX.Element {
  const { selectedId, run } = useDesktop();
  const weatherIcon = useWeatherChromeIcon();

  return (
    <nav className="desktop-icons" aria-label="Desktop">
      {apps.map((app) => (
        <DesktopIcon
          key={app.id}
          id={app.id}
          title={app.title}
          icon={app.id === 'weather' ? weatherIcon : app.icon}
          selected={selectedId === app.id}
          onOpen={() => run({ type: 'open', id: app.id })}
        />
      ))}
      {desktopLinks.map((link) => (
        <DesktopLinkIcon key={link.id} link={link} selected={selectedId === link.id} />
      ))}
    </nav>
  );
}

export default DesktopIcons;
