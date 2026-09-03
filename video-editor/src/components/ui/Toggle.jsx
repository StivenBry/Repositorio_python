export default function Toggle({ label, description, checked, onChange, icon }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-neutral-800/60 px-4 py-3.5 text-left active:bg-neutral-800"
    >
      <span className="flex items-center gap-3">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-accent-400">
            {icon}
          </span>
        )}
        <span>
          <span className="block text-sm font-medium text-white">{label}</span>
          {description && <span className="block text-xs text-neutral-400">{description}</span>}
        </span>
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-accent-500' : 'bg-neutral-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}
