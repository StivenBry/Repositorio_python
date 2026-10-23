/** Envoltorio mínimo de IndexedDB para guardar archivos en el modo demo. */
const DB_NAME = 'pasiones-demo'
const STORE = 'files'

let dbPromise: Promise<IDBDatabase> | null = null

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const req = fn(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(req.result)
        tx.onerror = () => reject(tx.error ?? req.error)
        tx.onabort = () => reject(tx.error ?? new Error('Operación cancelada'))
      }),
  )
}

export const idbPut = (key: string, blob: Blob) => run('readwrite', (s) => s.put(blob, key)).then(() => undefined)
export const idbGet = (key: string) => run<Blob | undefined>('readonly', (s) => s.get(key))
export const idbDelete = (key: string) => run('readwrite', (s) => s.delete(key)).then(() => undefined)
