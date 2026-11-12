import { JSX } from 'react';
import { formatClock } from '../../market/format';

type RefreshStatusProps = {
  refreshing: boolean;
  updatedAt: number | null;
  error: boolean;
  errorText?: string;
};

function statusText(
  refreshing: boolean,
  updatedAt: number | null,
  error: boolean,
  errorText: string,
): string {
  if (refreshing && updatedAt) return 'Updating prices…';
  if (refreshing) return 'Loading prices…';
  if (error && updatedAt) return `Couldn't refresh. Showing prices from ${formatClock(updatedAt)}.`;
  if (error) return errorText;
  if (updatedAt) return `Last updated ${formatClock(updatedAt)}`;
  return 'Waiting for prices';
}

function RefreshStatus({
  refreshing,
  updatedAt,
  error,
  errorText = "Couldn't load prices.",
}: RefreshStatusProps): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-3 flex items-center gap-3 border-2 border-b-[#ffffff] border-l-[#808080] border-r-[#ffffff] border-t-[#808080] bg-[#c3c3c3] text-sm text-[#272727] ${refreshing ? 'px-3 py-3' : 'px-2 py-1'}`}
    >
      {refreshing && (
        <span className="inline-flex items-end gap-1" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((block) => (
            <span
              key={block}
              className="inline-block h-8 w-4 animate-pulse bg-[#000080]"
              style={{ animationDelay: `${block * 140}ms` }}
            />
          ))}
        </span>
      )}
      <span className={refreshing ? 'text-lg' : undefined}>
        {statusText(refreshing, updatedAt, error, errorText)}
      </span>
    </div>
  );
}

export default RefreshStatus;
