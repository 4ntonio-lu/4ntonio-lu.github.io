import { JSX } from 'react';
import { formatUsd } from '../../market/format';

function RangeSummary({
  change,
  high,
  low,
}: {
  change: number | null;
  high: number | null;
  low: number | null;
}): JSX.Element | null {
  if (change == null && high == null && low == null) return null;
  const up = (change ?? 0) >= 0;
  return (
    <div
      role="group"
      aria-label="Selected range"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-2 border-b-[#808080] border-l-[#ffffff] border-r-[#808080] border-t-[#ffffff] bg-white px-2 py-1 text-sm leading-none text-[#272727]"
    >
      {change != null && (
        <span className={up ? 'text-green-700' : 'text-red-700'}>
          {up ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
        </span>
      )}
      {high != null && <span>High ${formatUsd(high)}</span>}
      {low != null && <span>Low ${formatUsd(low)}</span>}
    </div>
  );
}

export default RangeSummary;
