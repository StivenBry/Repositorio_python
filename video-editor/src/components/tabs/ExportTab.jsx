import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { EXPORT_PROFILES, EXPORT_PROFILE_ORDER } from '../../ffmpeg/profiles'
import { runExport } from '../../ffmpeg/runExport'
import Slider from '../ui/Slider'

export default function ExportTab() {
  const file = useEditorStore((s) => s.file)
  const duration = useEditorStore((s) => s.duration)
  const transform = useEditorStore((s) => s.transform)
  const audio = useEditorStore((s) => s.audio)
  const color = useEditorStore((s) => s.color)
  const exportSettings = useEditorStore((s) => s.exportSettings)
  const processing = useEditorStore((s) => s.processing)
  const setExportProfile = useEditorStore((s) => s.setExportProfile)
  const setCrf = useEditorStore((s) => s.setCrf)
  const setReduction = useEditorStore((s) => s.setReduction)
  const setProcessing = useEditorStore((s) => s.setProcessing)
  const setResult = useEditorStore((s) => s.setResult)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const profile = EXPORT_PROFILES[exportSettings.profile]
  const crf = exportSettings.crf ?? profile.defaultCrf
  const reduction = exportSettings.reduction ?? profile.defaultReduction
  const busy = processing.status !== 'idle' && processing.status !== 'error'

  const startExport = async () => {
    setProcessing({ status: 'loading-engine', progress: 0, error: null })
    try {
      const editorState = { transform, audio, color, exportSettings }
      const { blob } = await runExport({
        file,
        duration,
        editorState,
        onStage: (stage) => setProcessing({ status: stage }),
        onProgress: (progress) => setProcessing({ progress }),
      })
      const url = URL.createObjectURL(blob)
      setResult({ url, size: blob.size })
      setProcessing({ status: 'done', progress: 1 })
    } catch (err) {
      console.error('Export failed:', err)
      setProcessing({ status: 'error', error: err?.message || 'Ocurrió un error inesperado.' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2.5">
        {EXPORT_PROFILE_ORDER.map((id) => {
          const p = EXPORT_PROFILES[id]
          const active = exportSettings.profile === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setExportProfile(id)}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                active ? 'border-accent-500 bg-accent-500/10' : 'border-transparent bg-neutral-800/60'
              }`}
            >
              <span>
                <span className="block text-sm font-medium text-white">{p.label}</span>
                <span className="block text-xs text-neutral-400">{p.description}</span>
              </span>
              <span
                className={`h-5 w-5 shrink-0 rounded-full border-2 ${
                  active ? 'border-accent-400 bg-accent-500' : 'border-neutral-600'
                }`}
              />
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-1.5 px-1 text-xs font-medium text-neutral-400"
      >
        <Settings2 size={13} /> Ajustes avanzados
      </button>

      {showAdvanced && (
        <div className="rounded-2xl bg-neutral-800/60 px-4 py-1">
          {profile.mode === 'crf' ? (
            <Slider
              label="Calidad (CRF)"
              value={crf}
              min={profile.crfRange[0]}
              max={profile.crfRange[1]}
              step={1}
              defaultValue={profile.defaultCrf}
              onChange={setCrf}
            />
          ) : (
            <Slider
              label="Reducción objetivo"
              value={reduction}
              min={profile.reductionRange[0]}
              max={profile.reductionRange[1]}
              step={0.05}
              defaultValue={profile.defaultReduction}
              formatValue={(v) => `-${Math.round(v * 100)}%`}
              onChange={setReduction}
            />
          )}
          <p className="pb-3 text-xs text-neutral-500">
            {profile.mode === 'crf'
              ? 'CRF más bajo = mayor calidad y peso. Rango recomendado: 23-26.'
              : 'Porcentaje de reducción de peso respecto al archivo original.'}
          </p>
        </div>
      )}

      {processing.status === 'error' && (
        <div className="whitespace-pre-line rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {processing.error}
        </div>
      )}

      <button
        type="button"
        onClick={startExport}
        disabled={busy}
        className="w-full rounded-2xl bg-accent-500 py-4 text-center text-sm font-semibold text-white shadow-lg shadow-accent-500/20 active:scale-[0.99] disabled:opacity-50"
      >
        Exportar video
      </button>

      <p className="px-1 text-center text-xs text-neutral-500">
        Metadatos eliminados automáticamente · Codec H.264 · Salida MP4
      </p>
    </div>
  )
}
