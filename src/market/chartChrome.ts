import type { Plugin } from 'chart.js';

export const win95Font = 'W95FA, sans-serif';

/** Yellow system-tooltip chrome, shared by the line and candlestick charts. */
export const win95Tooltip = {
  backgroundColor: '#ffffe1',
  titleColor: '#000000',
  bodyColor: '#000000',
  borderColor: '#000000',
  borderWidth: 1,
  cornerRadius: 0,
  displayColors: false,
  padding: 8,
  titleFont: { family: win95Font, size: 13 },
  bodyFont: { family: win95Font, size: 13 },
} as const;

export const crosshairPlugin: Plugin = {
  id: 'win95Crosshair',
  afterDatasetsDraw(chart) {
    const active = chart.getActiveElements();
    const element = active[0]?.element;
    const area = chart.chartArea;
    if (!element || !area) return;
    const { x, y } = element;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const { ctx } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
    ctx.clip();
    ctx.beginPath();
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000080';
    ctx.moveTo(x, area.top);
    ctx.lineTo(x, area.bottom);
    ctx.moveTo(area.left, y);
    ctx.lineTo(area.right, y);
    ctx.stroke();
    ctx.restore();
  },
};
