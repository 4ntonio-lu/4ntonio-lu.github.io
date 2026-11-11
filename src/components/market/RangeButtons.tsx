import { JSX } from 'react';

type RangeButtonsProps = {
  ranges: readonly { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
};

function RangeButtons({ ranges, value, onChange }: RangeButtonsProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Chart range">
      {ranges.map((range) => (
        <button
          key={range.id}
          type="button"
          aria-pressed={range.id === value}
          onClick={() => onChange(range.id)}
          className="button-shadow px-2 py-0.5 text-sm text-[#272727]"
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

export default RangeButtons;
