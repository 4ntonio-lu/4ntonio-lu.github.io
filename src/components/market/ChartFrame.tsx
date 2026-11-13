import { Chart } from 'chart.js';
import { useEffect, useRef, type JSX, type ReactNode } from 'react';

/**
 * Chart.js sizes a responsive chart from the canvas parent. After the window
 * shrinks, that parent keeps the short canvas height, and a later grow is
 * clamped back down to the old aspect box. Pull the canvas out of flow so the
 * parent height does not cap the new width, then put it back.
 */
function refitChart(canvas: HTMLCanvasElement) {
  const chart = Chart.getChart(canvas);
  if (!chart) return;
  const previous = canvas.style.position;
  canvas.style.position = 'absolute';
  chart.resize();
  canvas.style.position = previous;
}

export default function ChartFrame({ children }: { children: ReactNode }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let width = node.clientWidth;
    const fit = () => {
      const next = node.clientWidth;
      if (!next || next === width) return;
      width = next;
      node.querySelectorAll('canvas').forEach((canvas) => {
        if (canvas instanceof HTMLCanvasElement) refitChart(canvas);
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="min-w-0 flex-1">
      {children}
    </div>
  );
}
