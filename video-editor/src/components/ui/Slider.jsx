export default function Slider({ label, value, min, max, step = 1, onChange, formatValue, defaultValue = 0 }) {
  const pct = ((value - min) / (max - min)) * 100
  const changed = value !== defaultValue

  return (
    <div className="py-2.5">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-200">{label}</span>
        <span className="flex items-center gap-2">
          {changed && (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              className="text-xs font-medium text-accent-400 active:opacity-70"
            >
              Restablecer
            </button>
          )}
          <span className="w-12 text-right tabular-nums text-neutral-400">
            {formatValue ? formatValue(value) : value}
          </span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ '--range-progress': `${pct}%` }}
        className="w-full"
      />
    </div>
  )
}
