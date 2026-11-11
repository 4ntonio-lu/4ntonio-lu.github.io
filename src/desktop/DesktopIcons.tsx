import { useRef, type JSX } from 'react';
import { apps, type DesktopApp } from './apps';
import { useDesktop } from './useDesktop';

function DesktopIconButton({ app, selected }: { app: DesktopApp; selected: boolean }): JSX.Element {
  const { dispatch, run } = useDesktop();
  // A touch tap opens on click, not pointerup, so the new window can't swallow the tap.
  const touch = useRef(false);
  const open = () => run({ type: 'open', id: app.id });

  return (
    <button
      type="button"
      className="desktop-icon"
      aria-pressed={selected}
      onPointerDown={(event) => {
        touch.current = event.pointerType === 'touch';
      }}
      onClick={(event) => {
        // Keyboard activation (detail 0) and a tap open. A mouse click only selects.
        if (event.detail === 0 || touch.current) {
          open();
          return;
        }
        dispatch({ type: 'select', id: app.id });
      }}
      onDoubleClick={open}
    >
      <img src={app.icon} alt="" draggable={false} />
      <span className="desktop-icon-label">{app.title}</span>
    </button>
  );
}

function DesktopIcons(): JSX.Element {
  const { selectedId } = useDesktop();

  return (
    <nav className="desktop-icons" aria-label="Desktop">
      {apps.map((app) => (
        <DesktopIconButton key={app.id} app={app} selected={selectedId === app.id} />
      ))}
    </nav>
  );
}

export default DesktopIcons;
