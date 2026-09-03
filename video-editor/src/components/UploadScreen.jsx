import { useCallback, useRef, useState } from 'react'
import { Film, FolderOpen, Lock, Sparkles, Wifi } from 'lucide-react'
import { useEditorStore } from '../store/useEditorStore'

const ACCEPTED = 'video/*'

export default function UploadScreen() {
  const loadFile = useEditorStore((s) => s.loadFile)
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')

  const acceptFile = useCallback(
    (fileList) => {
      const file = fileList?.[0]
      if (!file) return
      if (!file.type.startsWith('video/')) {
        setError('Selecciona un archivo de video válido.')
        return
      }
      setError('')
      loadFile(file)
    },
    [loadFile],
  )

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragActive(false)
      acceptFile(e.dataTransfer.files)
    },
    [acceptFile],
  )

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-950 px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="mb-8 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500">
          <Film size={18} className="text-white" strokeWidth={2.25} />
        </div>
        <div>
          <h1 className="text-base font-semibold leading-tight text-white">Editor de Video</h1>
          <p className="text-xs leading-tight text-neutral-400">100% local · sin subir archivos</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={`group flex w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-colors active:scale-[0.99] ${
            dragActive
              ? 'border-accent-400 bg-accent-500/10'
              : 'border-neutral-700 bg-neutral-900/60 hover:border-neutral-600'
          }`}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-500/15 text-accent-400 transition-transform group-active:scale-95">
            <FolderOpen size={28} strokeWidth={1.75} />
          </span>
          <span className="space-y-1">
            <span className="block text-base font-medium text-white">Toca para elegir un video</span>
            <span className="block text-sm text-neutral-400">o arrástralo aquí</span>
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => acceptFile(e.target.files)}
        />

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>

      <ul className="mb-2 grid grid-cols-1 gap-3 text-sm text-neutral-300">
        <Feature icon={<Lock size={16} />} title="Privado" text="Tu video nunca sale del dispositivo." />
        <Feature icon={<Sparkles size={16} />} title="Edición completa" text="Transformar, audio, color y exportar." />
        <Feature icon={<Wifi size={16} />} title="Funciona sin conexión" text="Instálala como app (PWA) y edítalos offline." />
      </ul>
    </div>
  )
}

function Feature({ icon, title, text }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-neutral-900/60 p-3.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-accent-400">
        {icon}
      </span>
      <span>
        <span className="block font-medium text-white">{title}</span>
        <span className="block text-neutral-400">{text}</span>
      </span>
    </li>
  )
}
