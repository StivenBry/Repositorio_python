import { useCallback, useSyncExternalStore } from 'react'

/**
 * Pequeño almacén persistente en localStorage, sincronizado entre componentes
 * y pestañas. Si el navegador bloquea el almacenamiento, funciona en memoria.
 */
function createLocalStore<T>(key: string, fallback: T) {
  let cache: T | undefined
  const listeners = new Set<() => void>()

  const read = (): T => {
    if (cache !== undefined) return cache
    try {
      const raw = localStorage.getItem(key)
      cache = raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      cache = fallback
    }
    return cache
  }

  const write = (value: T) => {
    cache = value
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* modo privado o cuota llena: se mantiene en memoria */
    }
    listeners.forEach((l) => l())
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cache = undefined
        listener()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(listener)
      window.removeEventListener('storage', onStorage)
    }
  }

  return { read, write, subscribe }
}

// ----------------------------------------------------------------- Mi lista

const myListStore = createLocalStore<string[]>('pep:my-list', [])

export function useMyList() {
  const ids = useSyncExternalStore(myListStore.subscribe, myListStore.read, myListStore.read)
  const toggle = useCallback((id: string) => {
    const current = myListStore.read()
    myListStore.write(current.includes(id) ? current.filter((x) => x !== id) : [id, ...current])
  }, [])
  const has = useCallback((id: string) => ids.includes(id), [ids])
  return { ids, toggle, has }
}

// ------------------------------------------------------- Continuar viendo

export interface WatchProgress {
  t: number
  d: number
  at: number
}

const progressStore = createLocalStore<Record<string, WatchProgress>>('pep:progress', {})

export function saveProgress(id: string, t: number, d: number) {
  if (!Number.isFinite(d) || d <= 0) return
  const all = { ...progressStore.read() }
  // Al terminar (o casi) se elimina para que no aparezca en "Continuar viendo".
  if (t > d - Math.min(10, d * 0.05)) delete all[id]
  else if (t > Math.min(5, d * 0.05)) all[id] = { t, d, at: Date.now() }
  else return
  progressStore.write(all)
}

export const getProgress = (id: string): WatchProgress | undefined => progressStore.read()[id]

export function clearProgress(id: string) {
  const all = { ...progressStore.read() }
  delete all[id]
  progressStore.write(all)
}

export function useProgress() {
  return useSyncExternalStore(progressStore.subscribe, progressStore.read, progressStore.read)
}

// ------------------------------------------------- Preferencias del player

const volumeStore = createLocalStore<{ volume: number; muted: boolean }>('pep:volume', { volume: 1, muted: false })
export const readVolume = volumeStore.read
export const writeVolume = volumeStore.write
