'use client';

export function FilterToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="filter-toggle"
      data-on={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="filter-toggle-track" aria-hidden>
        <span className="filter-toggle-thumb" />
      </span>
      <span className="filter-toggle-label">{label}</span>
    </button>
  );
}
