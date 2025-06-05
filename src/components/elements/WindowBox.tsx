import { useState, useEffect, useRef, JSX } from 'react';
import Draggable from 'react-draggable';
import WindowHeader from "./WindowHeader";
import useWindowDimensions from '../hooks/useWindowDimensions';

type WindowBoxProps = {
  name: string;
  content: React.ReactNode;
  width: number;
}

function WindowBox({ name, content, width }: WindowBoxProps): JSX.Element {
  const container = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const { windowHeight, windowWidth } = useWindowDimensions();

  const dragDisabled = windowWidth <= 1000;
  const defaultPos = dragDisabled ? { x: 0, y: 0 } : { x: windowWidth * (0.5 - width / 2), y: 30 };
  const dragBounds = {
    top: 0,
    left: 0,
    right: windowWidth * (1 - width - 0.006),
    bottom: containerHeight !== null ? windowHeight - containerHeight - 65 : windowHeight,
  };

  useEffect(() => {
    if (!container.current) return;

    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(container.current);

    return () => observer.disconnect();
  }, []);

  return (
    <Draggable nodeRef={container as React.RefObject<HTMLElement>} handle=".windowbox-header" defaultPosition={defaultPos} bounds={dragBounds} disabled={dragDisabled}>
      <div ref={container} style={{ width: windowWidth <= 1024 ? '95%' : `${width * 100}vw` }} className={`bg-[#C3C3C3] shadow-[0.15rem_0.15rem_0_#272727,inset_0.15rem_0.15rem_0_#F7F7F7,inset_-0.15rem_-0.15rem_0_#828282] p-[5px] absolute z-[1] max-lg:absolute max-lg:left-0 max-lg:top-0 !max-lg:w-[95%] !max-lg:mx-auto !max-lg:mb-[75px]`}>
        <WindowHeader header={name} />
        {content}
      </div>
    </Draggable>
  );
}

export default WindowBox;