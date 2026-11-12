import { useRef, type JSX, type MouseEvent, type PointerEvent } from 'react';
import { apps, desktopLinks, type DesktopLink } from './apps';
import { useDesktop } from './useDesktop';

type IconProps = {
  id: string;
  title: string;
  icon: string;
  selected: boolean;
  href?: string;
};

function DesktopIcon({ id, title, icon, selected, href }: IconProps): JSX.Element {
  const { dispatch, run } = useDesktop();
  // A touch tap opens on click, not pointerup, so the new window can't swallow the tap.
  const touch = useRef(false);

  const onPointerDown = (event: PointerEvent) => {
    touch.current = event.pointerType === 'touch';
  };

  const onClick = (event: MouseEvent) => {
    const activate = event.detail === 0 || touch.current;
    if (href) {
      // A mouse click only selects. The second click of a double-click follows the link.
      if (activate || event.detail >= 2) return;
      event.preventDefault();
      dispatch({ type: 'select', id });
      return;
    }
    if (activate) {
      run({ type: 'open', id });
      return;
    }
    dispatch({ type: 'select', id });
  };

  const label = (
    <>
      <img src={icon} alt="" draggable={false} />
      <span className="desktop-icon-label">{title}</span>
    </>
  );

  if (href) {
    return (
      <a
        className="desktop-icon"
        href={href}
        aria-pressed={selected}
        {...(href.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
        onPointerDown={onPointerDown}
        onClick={onClick}
      >
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      className="desktop-icon"
      aria-pressed={selected}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onDoubleClick={() => run({ type: 'open', id })}
    >
      {label}
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
      href={link.url}
    />
  );
}

function DesktopIcons(): JSX.Element {
  const { selectedId } = useDesktop();

  return (
    <nav className="desktop-icons" aria-label="Desktop">
      {apps.map((app) => (
        <DesktopIcon
          key={app.id}
          id={app.id}
          title={app.title}
          icon={app.icon}
          selected={selectedId === app.id}
        />
      ))}
      {desktopLinks.map((link) => (
        <DesktopLinkIcon key={link.id} link={link} selected={selectedId === link.id} />
      ))}
    </nav>
  );
}

export default DesktopIcons;
