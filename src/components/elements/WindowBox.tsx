import { useState, useEffect, useRef, JSX } from 'react';
import Draggable from 'react-draggable';
import WindowHeader from './WindowHeader';
import useWindowDimensions from '../hooks/useWindowDimensions';

// Matches Tailwind's `lg` breakpoint, where the `max-lg:` styles below stop applying.
const LG_BREAKPOINT = 1024;

type WindowBoxProps = {
  name: string;
  content: React.ReactNode;
  width: number;
};

function WindowBox({ name, content, width }: WindowBoxProps): JSX.Element {
  const container = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const { windowHeight, windowWidth } = useWindowDimensions();

  const isCompact = windowWidth < LG_BREAKPOINT;
  const defaultPos = isCompact ? { x: 0, y: 0 } : { x: windowWidth * (0.5 - width / 2), y: 30 };
  const dragBounds = {
    top: 0,
    left: 0,
    right: windowWidth * (1 - width - 0.006),
    bottom: containerHeight !== null ? windowHeight - containerHeight - 65 : windowHeight,
  };

  useEffect(() => {
    if (!container.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(container.current);

    return () => observer.disconnect();
  }, []);

  return (
    <Draggable
      nodeRef={container as React.RefObject<HTMLElement>}
      handle=".windowbox-header"
      defaultPosition={defaultPos}
      bounds={dragBounds}
      disabled={isCompact}
    >
      <div
        ref={container}
        style={isCompact ? undefined : { width: `${width * 100}vw` }}
        className="absolute z-[1] box-border bg-[#C3C3C3] p-[5px] shadow-[0.15rem_0.15rem_0_#272727,inset_0.15rem_0.15rem_0_#F7F7F7,inset_-0.15rem_-0.15rem_0_#828282] max-lg:left-[2.5%] max-lg:top-[2.5vw] max-lg:flex max-lg:max-h-[calc(100dvh-3.5rem-5vw)] max-lg:w-[95%] max-lg:flex-col"
      >
        <WindowHeader header={name} />
        <div className="max-lg:min-h-0 max-lg:overflow-y-auto">{content}</div>
      </div>
    </Draggable>
  );
}

export default WindowBox;
