import {
  useEffect,
  useRef,
  type JSX,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import Draggable from 'react-draggable';
import { appByWindowName } from '../../desktop/apps';
import { useDesktop } from '../../desktop/useDesktop';
import { useWeatherChromeIcon } from '../../weather/selection';
import WindowHeader from './WindowHeader';

type WindowBoxProps = {
  name: string;
  content: ReactNode;
  width: number;
  /** Stretch the window down to the taskbar so the page inside can fill the frame. */
  fillHeight?: boolean;
};

function WindowBox({
  name,
  content,
  width,
  fillHeight = false,
}: WindowBoxProps): JSX.Element | null {
  const { windows, focusedId, compact, run, dispatch } = useDesktop();
  const weatherIcon = useWeatherChromeIcon();
  const nodeRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const stopDrag = useRef<((event: PointerEvent) => void) | null>(null);

  useEffect(() => {
    return () => {
      const stop = stopDrag.current;
      if (!stop) return;
      window.removeEventListener('pointerup', stop, true);
      window.removeEventListener('pointercancel', stop, true);
      stopDrag.current = null;
    };
  }, []);
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

  const rememberPointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest('.caption-buttons')) return;
    if (!target.closest('.win95-title')) return;
    activePointer.current = event.pointerId;
  };

  const clearDragEnd = () => {
    const stop = stopDrag.current;
    if (!stop) return;
    window.removeEventListener('pointerup', stop, true);
    window.removeEventListener('pointercancel', stop, true);
    stopDrag.current = null;
  };

  // react-draggable ends a drag on mouseup. A release over the resume frame, or
  // outside this window, never reaches that listener, so the window keeps moving.
  const beginDrag = () => {
    const node = nodeRef.current;
    const pointerId = activePointer.current;
    const title = node?.querySelector('.win95-title');
    if (title && pointerId !== null) {
      try {
        title.setPointerCapture(pointerId);
      } catch {
        // The pointer is already gone, or this environment cannot capture it.
      }
    }

    const stop = (event: PointerEvent) => {
      if (pointerId !== null && event.pointerId !== pointerId) return;
      clearDragEnd();
      const captured = nodeRef.current?.querySelector('.win95-title');
      if (captured && pointerId !== null) {
        try {
          if (captured.hasPointerCapture(pointerId)) captured.releasePointerCapture(pointerId);
        } catch {
          // This browser or test environment has no pointer capture.
        }
      }
      const doc = node?.ownerDocument ?? document;
      doc.dispatchEvent(
        new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          clientX: event.clientX,
          clientY: event.clientY,
          button: 0,
        }),
      );
    };
    stopDrag.current = stop;
    window.addEventListener('pointerup', stop, true);
    window.addEventListener('pointercancel', stop, true);
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
      onStart={beginDrag}
      onStop={clearDragEnd}
      onDrag={(_, data) => dispatch({ type: 'move', id: app.id, x: data.x, y: data.y })}
    >
      <div
        ref={nodeRef}
        role="dialog"
        onPointerDown={rememberPointer}
        aria-labelledby={titleId}
        hidden={windowState.minimized}
        data-maximized={windowState.maximized}
        data-fill={fill}
        className={fill ? 'win95-window window-fill' : 'win95-window'}
        style={{
          zIndex: windowState.z,
          width: fill ? '100%' : `${width * 100}%`,
          height: fill ? '100%' : fillHeight ? `calc(100% - ${windowState.y}px)` : undefined,
          maxHeight: fill || fillHeight ? undefined : `calc(100% - ${windowState.y}px)`,
        }}
      >
        <WindowHeader
          title={name}
          titleId={titleId}
          icon={app.id === 'weather' ? weatherIcon : app.icon}
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
