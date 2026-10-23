import { X } from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'

interface Props {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
}

/** Etiquetas tipo "chip": Enter o coma agrega, Retroceso borra la última. */
export function TagInput({ value, onChange, suggestions = [], placeholder = 'Escribe y presiona Enter' }: Props) {
  const [draft, setDraft] = useState('')
  const listId = useId()

  const add = (raw: string) => {
    const tag = raw.trim().replace(/\s+/g, ' ')
    if (!tag) return
    if (!value.some((t) => t.toLowerCase() === tag.toLowerCase())) onChange([...value, tag].slice(0, 15))
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="field flex min-h-11 flex-wrap items-center gap-1.5 py-1.5 focus-within:border-brand/70 focus-within:ring-2 focus-within:ring-brand/25">
      {value.map((tag) => (
        <span key={tag} className="animate-scale-in inline-flex items-center gap-1 rounded-md bg-brand/15 py-1 pr-1 pl-2.5 text-xs font-semibold text-orange-200">
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="rounded p-0.5 text-orange-200/70 transition hover:bg-white/10 hover:text-white"
            aria-label={`Quitar ${tag}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => {
          const v = e.target.value
          if (v.endsWith(',')) add(v.slice(0, -1))
          else setDraft(v)
        }}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        list={listId}
        placeholder={value.length ? '' : placeholder}
        className="min-w-32 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-white/35"
        aria-label="Agregar etiqueta"
      />
      <datalist id={listId}>
        {suggestions
          .filter((s) => !value.includes(s))
          .slice(0, 30)
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  )
}
