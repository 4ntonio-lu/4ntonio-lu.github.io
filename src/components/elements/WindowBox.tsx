import { useRef, type JSX, type ReactNode, type RefObject } from 'react';
import Draggable from 'react-draggable';
import { appByWindowName } from '../../desktop/apps';
import { useDesktop } from '../../desktop/useDesktop';
import WindowHeader from './WindowHeader';

type WindowBoxProps = {
  name: string;
  content: ReactNode;
  width: number;
};

function WindowBox({ name, content, width }: WindowBoxProps): JSX.Element | null {
  const { windows, focusedId, compact, run, dispatch } = useDesktop();
  const nodeRef = useRef<HTMLDivElement>(null);
  const app = appByWindowName(name);
  if (!app) {
    throw new Error(
      `No desktop app has windowName "${name}". Add it to src/desktop/apps.ts and src/desktop/appComponents.tsx.`,
    );
  }

  const windowState = windows.find((item) => item.id === app.id);
  if (!windowState) return null;

  const fill = compact || windowState.maximized;
  const active = focusedId === app.id;
  const titleId = `window-title-${app.id}`;

  const focus = () => {
    if (focusedId !== app.id || windowState.minimized) run({ type: 'focus', id: app.id });
  };

  return (
    <Draggable
      nodeRef={nodeRef as RefObject<HTMLElement>}
      handle=".win95-title"
      cancel=".caption-buttons"
      position={fill ? { x: 0, y: 0 } : { x: windowState.x, y: windowState.y }}
      disabled={fill}
      bounds="parent"
      // react-draggable replaces the child's onMouseDown, so focus is passed here.
      onMouseDown={focus}
      onDrag={(_, data) => dispatch({ type: 'move', id: app.id, x: data.x, y: data.y })}
    >
      <div
        ref={nodeRef}
        role="dialog"
        aria-labelledby={titleId}
        hidden={windowState.minimized}
        data-maximized={windowState.maximized}
        data-fill={fill}
        className={fill ? 'win95-window window-fill' : 'win95-window'}
        style={{
          zIndex: windowState.z,
          width: fill ? '100%' : `${width * 100}%`,
          height: fill ? '100%' : undefined,
          maxHeight: fill ? undefined : `calc(100% - ${windowState.y}px)`,
        }}
      >
        <WindowHeader
          title={name}
          titleId={titleId}
          icon={app.icon}
          active={active}
          maximized={windowState.maximized}
          onMinimize={() => run({ type: 'minimize', id: app.id })}
          onToggleMaximize={() => run({ type: 'toggleMaximize', id: app.id })}
          onClose={() => run({ type: 'close', id: app.id })}
        />
        <div className="win95-body">{content}</div>
      </div>
    </Draggable>
  );
}

export default WindowBox;
