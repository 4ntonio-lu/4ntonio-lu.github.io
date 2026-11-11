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
  errorText = "Couldn't load prices. The next try is automatic.",
}: RefreshStatusProps): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-3 flex items-center gap-2 border-2 border-b-[#ffffff] border-l-[#808080] border-r-[#ffffff] border-t-[#808080] bg-[#c3c3c3] px-2 py-1 text-sm text-[#272727]"
    >
      {refreshing && (
        <span className="inline-flex gap-px" aria-hidden="true">
          {[0, 1, 2, 3].map((block) => (
            <span
              key={block}
              className="inline-block h-3 w-2 animate-pulse bg-[#000080]"
              style={{ animationDelay: `${block * 160}ms` }}
            />
          ))}
        </span>
      )}
      <span>{statusText(refreshing, updatedAt, error, errorText)}</span>
    </div>
  );
}

export default RefreshStatus;
