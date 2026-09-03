import { useEditorStore } from '../../store/useEditorStore'
import Slider from '../ui/Slider'
import Toggle from '../ui/Toggle'

const SWATCHES = ['#ffffff', '#000000', '#facc15', '#ef4444', '#38bdf8', '#4ade80']

export default function TextTab() {
  const text = useEditorStore((s) => s.text)
  const updateText = useEditorStore((s) => s.updateText)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-neutral-800/60 p-3">
        <textarea
          value={text.content}
          onChange={(e) => updateText({ content: e.target.value.slice(0, 200) })}
          placeholder="Escribe un texto para superponer…"
          rows={3}
          className="w-full resize-none bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
        />
        <div className="text-right text-[11px] text-neutral-500">{text.content.length}/200</div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-neutral-800/60 px-4 py-3.5">
        <span className="text-sm font-medium text-white">Color</span>
        <div className="flex items-center gap-2">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => updateText({ color: c })}
              aria-label={`Color ${c}`}
              className={`h-6 w-6 rounded-full border-2 transition-transform active:scale-90 ${
                text.color.toLowerCase() === c ? 'border-accent-400' : 'border-neutral-700'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={text.color}
            onChange={(e) => updateText({ color: e.target.value })}
            aria-label="Color personalizado"
            className="h-7 w-7 cursor-pointer rounded-full border-2 border-neutral-600 bg-transparent p-0"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-neutral-800/60 px-4 py-1">
        <Slider
          label="Tamaño"
          value={text.size}
          min={2}
          max={16}
          step={0.5}
          defaultValue={6}
          formatValue={(v) => `${v}%`}
          onChange={(size) => updateText({ size })}
        />
      </div>

      <Toggle label="Negrita" checked={text.bold} onChange={(bold) => updateText({ bold })} />
      <Toggle
        label="Fondo semitransparente"
        description="Mejora la legibilidad sobre cualquier video"
        checked={text.box}
        onChange={(box) => updateText({ box })}
      />

      <p className="px-1 text-xs leading-relaxed text-neutral-500">
        Arrastra el texto directamente en la vista previa para moverlo.
      </p>
    </div>
  )
}
