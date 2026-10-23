import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useToast } from '../../../context/ToastContext'
import { backend } from '../../../services'

export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Usa al menos 8 caracteres.')
    if (password !== confirm) return setError('Las contraseñas no coinciden.')
    setBusy(true)
    try {
      await backend.changePassword(password)
      toast.success('Contraseña actualizada')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => !busy && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwd-title"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="animate-scale-in card w-full max-w-sm bg-panel p-6 shadow-2xl"
        noValidate
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand/15 text-brand">
            <KeyRound className="size-5" />
          </span>
          <h2 id="pwd-title" className="text-lg font-bold">
            Cambiar contraseña
          </h2>
        </div>
        <label className="label mt-5" htmlFor="new-password">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            ref={firstRef}
            id="new-password"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field pr-10"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-white/50 hover:text-white"
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <label className="label mt-4" htmlFor="confirm-password">
          Repite la contraseña
        </label>
        <input
          id="confirm-password"
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="field"
        />
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-ghost py-2.5" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary py-2.5" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}
