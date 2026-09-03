import { useEditorStore } from '../../store/useEditorStore'
import Slider from '../ui/Slider'

export default function ColorTab() {
  const color = useEditorStore((s) => s.color)
  const updateColor = useEditorStore((s) => s.updateColor)

  return (
    <div className="space-y-4">
      <div className="divide-y divide-neutral-700/60 rounded-2xl bg-neutral-800/60 px-4 py-1">
        <Slider
          label="Brillo"
          value={color.brightness}
          min={-50}
          max={50}
          step={1}
          defaultValue={0}
          formatValue={(v) => `${v > 0 ? '+' : ''}${v}`}
          onChange={(brightness) => updateColor({ brightness })}
        />
        <Slider
          label="Contraste"
          value={color.contrast}
          min={-50}
          max={50}
          step={1}
          defaultValue={0}
          formatValue={(v) => `${v > 0 ? '+' : ''}${v}`}
          onChange={(contrast) => updateColor({ contrast })}
        />
        <Slider
          label="Saturación"
          value={color.saturation}
          min={-50}
          max={50}
          step={1}
          defaultValue={0}
          formatValue={(v) => `${v > 0 ? '+' : ''}${v}`}
          onChange={(saturation) => updateColor({ saturation })}
        />
      </div>
      <p className="px-1 text-xs leading-relaxed text-neutral-500">
        La vista previa se actualiza en tiempo real. La corrección final se aplica al exportar con FFmpeg.
      </p>
    </div>
  )
}
