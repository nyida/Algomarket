'use client';

export function UiToggle({
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
      className="ui-toggle"
      data-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="ui-toggle-track" aria-hidden>
        <span className="ui-toggle-thumb" />
      </span>
      <span className="ui-toggle-label">{label}</span>
    </button>
  );
}
