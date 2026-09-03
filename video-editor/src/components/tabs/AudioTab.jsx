import { Volume2, VolumeX } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import Slider from '../ui/Slider'
import Toggle from '../ui/Toggle'

export default function AudioTab() {
  const audio = useEditorStore((s) => s.audio)
  const updateAudio = useEditorStore((s) => s.updateAudio)

  return (
    <div className="space-y-4">
      <Toggle
        icon={audio.mute ? <VolumeX size={18} /> : <Volume2 size={18} />}
        label="Silenciar audio"
        description={audio.mute ? 'El video se exportará sin audio' : 'Conserva el audio original'}
        checked={audio.mute}
        onChange={(mute) => updateAudio({ mute })}
      />

      <fieldset disabled={audio.mute} className={audio.mute ? 'pointer-events-none opacity-40' : ''}>
        <div className="rounded-2xl bg-neutral-800/60 px-4 py-1">
          <Slider
            label="Tono (pitch)"
            value={audio.pitch}
            min={-6}
            max={6}
            step={0.5}
            defaultValue={0}
            formatValue={(v) => `${v > 0 ? '+' : ''}${v}%`}
            onChange={(pitch) => updateAudio({ pitch })}
          />
        </div>

        <div className="mt-4 divide-y divide-neutral-700/60 rounded-2xl bg-neutral-800/60 px-4 py-1">
          <Slider
            label="Graves"
            value={audio.bass}
            min={-12}
            max={12}
            step={1}
            defaultValue={0}
            formatValue={(v) => `${v > 0 ? '+' : ''}${v} dB`}
            onChange={(bass) => updateAudio({ bass })}
          />
          <Slider
            label="Medios"
            value={audio.mid}
            min={-12}
            max={12}
            step={1}
            defaultValue={0}
            formatValue={(v) => `${v > 0 ? '+' : ''}${v} dB`}
            onChange={(mid) => updateAudio({ mid })}
          />
          <Slider
            label="Agudos"
            value={audio.treble}
            min={-12}
            max={12}
            step={1}
            defaultValue={0}
            formatValue={(v) => `${v > 0 ? '+' : ''}${v} dB`}
            onChange={(treble) => updateAudio({ treble })}
          />
        </div>
      </fieldset>

      <p className="px-1 text-xs leading-relaxed text-neutral-500">
        Ecualizador de 3 bandas y variación ligera de tono para un ajuste discreto del audio.
      </p>
    </div>
  )
}
