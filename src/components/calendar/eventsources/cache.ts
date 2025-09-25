// Generic caching utility for event sources (or any async fetchers)
// - Keyed by source + a caller-provided key builder
// - Supports TTL, in-flight request dedupe, optional persistent storage
// - Bounded persistent cache with simple LRU trimming to prevent bloat

export type CacheStorageMode = "memory" | "localStorage" | "sessionStorage"

type CacheEntry<T> = {
  data: T
  ts: number // epoch ms
}

const memoryStore: Map<string, CacheEntry<any>> = new Map()
const inFlight: Map<string, Promise<unknown>> = new Map()

function fullKey(source: string, key: string) {
  return `events:${source}:${key}`
}

function getStorage(mode: CacheStorageMode) {
  if (mode === "localStorage") return window.localStorage
  if (mode === "sessionStorage") return window.sessionStorage
  return null
}

function getFromPersistent<T>(mode: CacheStorageMode, k: string): CacheEntry<T> | undefined {
  const store = getStorage(mode)
  if (!store) return undefined
  try {
    const raw = store.getItem(k)
    if (!raw) return undefined
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

function setToPersistent<T>(mode: CacheStorageMode, k: string, entry: CacheEntry<T>) {
  const store = getStorage(mode)
  if (!store) return
  try {
    store.setItem(k, JSON.stringify(entry))
  } catch {
    // best effort; ignore quota/serialization issues handled by caller
    throw new Error("PERSIST_FAIL")
  }
}

function listSourceKeys(mode: CacheStorageMode, source: string): string[] {
  const store = getStorage(mode)
  if (!store) return []
  const prefix = `events:${source}:`
  const keys: string[] = []
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i)
    if (key && key.startsWith(prefix)) keys.push(key)
  }
  return keys
}

function tryTrimPersistent(mode: CacheStorageMode, source: string, keep: number) {
  // Remove oldest entries for this source until length <= keep
  const store = getStorage(mode)
  if (!store) return
  const keys = listSourceKeys(mode, source)
  const withTs = keys
    .map((k) => {
      const e = getFromPersistent<any>(mode, k)
      return { k, ts: e?.ts ?? 0 }
    })
    .sort((a, b) => b.ts - a.ts) // newest first
  if (withTs.length <= keep) return
  for (const { k } of withTs.slice(keep)) {
    try {
      store.removeItem(k)
    } catch {
      // ignore
    }
  }
}

export function clearCache(source?: string) {
  if (!source) {
    memoryStore.clear()
    return
  }
  const prefix = `events:${source}:`
  for (const k of Array.from(memoryStore.keys())) {
    if (k.startsWith(prefix)) memoryStore.delete(k)
  }
  // purge both localStorage and sessionStorage
  for (const mode of ["localStorage", "sessionStorage"] as const) {
    const store = getStorage(mode)
    if (!store) continue

    try {
      // iterate backwards to be safe when removing
      for (let i = store.length - 1; i >= 0; i--) {
        const key = store.key(i)
        if (key && key.startsWith(prefix)) store.removeItem(key)
      }
    } catch {
      // ignore
    }
  }
}

export function createCachedFetcher<P, R>(opts: {
  source: string // logical source name, used for key prefixing
  ttlMs: number // time to live for cached data
  buildKey: (params: P) => string // build a per-call key (e.g., `${year}-${month}`)
  fetcher: (params: P) => Promise<R> // actual fetcher
  storage?: CacheStorageMode // default 'memory'
  staleWhileRevalidateMs?: number // if set, can return stale and refresh in background
  maxEntries?: number // only for persistent modes
}) {
  const {
    source,
    ttlMs,
    buildKey,
    fetcher,
    storage = "memory",
    staleWhileRevalidateMs = 0,
    maxEntries = 24
  } = opts

  const getEntry = <T,>(k: string): CacheEntry<T> | undefined => {
    if (storage === "memory") return memoryStore.get(k)
    return getFromPersistent<T>(storage, k)
  }
  const setEntry = <T,>(k: string, entry: CacheEntry<T>) => {
    if (storage === "memory") return memoryStore.set(k, entry)
    try {
      setToPersistent<T>(storage, k, entry)
    } catch {
      // Quota or serialization error: trim and retry once
      tryTrimPersistent(storage, source, Math.max(1, Math.floor(maxEntries * 0.9)))
      try {
        setToPersistent<T>(storage, k, entry)
      } catch {
        // give up persisting
      }
    }
  }

  async function get(params: P): Promise<R> {
    const k = fullKey(source, buildKey(params))
    const now = Date.now()

    const inflightKey = `${k}:inflight`
    const inflightExisting = inFlight.get(inflightKey)
    if (inflightExisting) return inflightExisting as Promise<R>

    const entry = getEntry<R>(k)
    if (entry) {
      const age = now - entry.ts
      if (age <= ttlMs) {
        return entry.data
      }
      if (staleWhileRevalidateMs > 0 && age <= ttlMs + staleWhileRevalidateMs) {
        // serve stale and refresh in background
        const p = (async () => {
          try {
            const fresh = await fetcher(params)
            setEntry<R>(k, { data: fresh, ts: Date.now() })
            return fresh
          } finally {
            inFlight.delete(inflightKey)
          }
        })()
        inFlight.set(inflightKey, p)
        return entry.data
      }
      // else expired, fetch fresh below
    }

    // Fetch fresh
    const p = (async () => {
      try {
        const data = await fetcher(params)
        setEntry<R>(k, { data, ts: Date.now() })
        return data
      } finally {
        inFlight.delete(inflightKey)
      }
    })()
    inFlight.set(inflightKey, p)
    return p as Promise<R>
  }

  return get
}
