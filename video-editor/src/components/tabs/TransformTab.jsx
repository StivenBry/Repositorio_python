import { FlipHorizontal2 } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import Slider from '../ui/Slider'
import Toggle from '../ui/Toggle'

export default function TransformTab() {
  const transform = useEditorStore((s) => s.transform)
  const updateTransform = useEditorStore((s) => s.updateTransform)

  return (
    <div className="space-y-4">
      <Toggle
        icon={<FlipHorizontal2 size={18} />}
        label="Invertir horizontal"
        description="Efecto espejo (flip)"
        checked={transform.flip}
        onChange={(flip) => updateTransform({ flip })}
      />

      <div className="rounded-2xl bg-neutral-800/60 px-4 py-1">
        <Slider
          label="Zoom / recorte"
          value={transform.zoom}
          min={0}
          max={5}
          step={0.5}
          defaultValue={0}
          formatValue={(v) => `${v}%`}
          onChange={(zoom) => updateTransform({ zoom })}
        />
      </div>

      <div className="rounded-2xl bg-neutral-800/60 px-4 py-1">
        <Slider
          label="Velocidad"
          value={transform.speed}
          min={1}
          max={1.05}
          step={0.01}
          defaultValue={1}
          formatValue={(v) => `${v.toFixed(2)}x`}
          onChange={(speed) => updateTransform({ speed })}
        />
      </div>

      <p className="px-1 text-xs leading-relaxed text-neutral-500">
        Ajustes sutiles de encuadre y velocidad. La vista previa aproxima el resultado; el recorte y la
        velocidad reales se aplican al exportar.
      </p>
    </div>
  )
}
