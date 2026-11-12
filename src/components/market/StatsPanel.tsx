import { JSX } from 'react';
import type { StatRow } from '../../market/stats';

function StatsPanel({ rows }: { rows: StatRow[] }): JSX.Element | null {
  if (rows.length === 0) return null;
  return (
    <aside
      aria-label="Market stats"
      className="w-full shrink-0 border-2 border-b-[#808080] border-l-[#ffffff] border-r-[#808080] border-t-[#ffffff] bg-white sm:w-52"
    >
      <div className="bg-[#000082] px-2 py-0.5 text-sm text-white">Stats</div>
      <dl className="m-0">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-3 border-b border-[#d4d0c8] px-2 py-1 text-sm"
          >
            <dt className="text-[#272727]">{row.label}</dt>
            <dd className="m-0 text-right font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

export default StatsPanel;
