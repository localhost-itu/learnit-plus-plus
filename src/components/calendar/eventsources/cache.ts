// Generic caching utility for event sources (or any async fetchers)
// - Keyed by source + a caller-provided key builder
// - Supports TTL, in-flight request dedupe, optional localStorage backing
// - Stays simple and browser-friendly

export type CacheStorageMode = "memory" | "localStorage"

type CacheEntry<T> = {
  data: T
  ts: number // epoch ms
  promise?: Promise<T> // in-flight fetch promise for deduplication
}

const memoryStore: Map<string, CacheEntry<any>> = new Map()

function fullKey(source: string, key: string) {
  return `events:${source}:${key}`
}

function getFromLocalStorage<T>(k: string): CacheEntry<T> | undefined {
  try {
    const raw = localStorage.getItem(k)
    if (!raw) return undefined
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

function setToLocalStorage<T>(k: string, entry: CacheEntry<T>) {
  try {
    localStorage.setItem(k, JSON.stringify(entry))
  } catch {
    // best effort; ignore quota/serialization issues
  }
}

export function clearCache(source?: string) {
  if (!source) {
    memoryStore.clear()
    return
  }
  // delete subset from memory
  for (const k of Array.from(memoryStore.keys())) {
    if (k.startsWith(`events:${source}:`)) memoryStore.delete(k)
  }
  // optionally purge localStorage entries with the prefix
  try {
    const prefix = `events:${source}:`
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) localStorage.removeItem(key)
    }
  } catch {
    // ignore
  }
}

export function createCachedFetcher<P, R>(opts: {
  source: string // logical source name, used for key prefixing
  ttlMs: number // time to live for cached data
  buildKey: (params: P) => string // build a per-call key (e.g., `${year}-${month}`)
  fetcher: (params: P) => Promise<R> // actual fetcher
  storage?: CacheStorageMode // default 'memory'
  staleWhileRevalidateMs?: number // if set, can return stale and refresh in background
}) {
  const {
    source,
    ttlMs,
    buildKey,
    fetcher,
    storage = "memory",
    staleWhileRevalidateMs
  } = opts

  const getEntry = <T>(k: string): CacheEntry<T> | undefined => {
    if (storage === "localStorage") return getFromLocalStorage<T>(k)
    return memoryStore.get(k)
  }
  const setEntry = <T>(k: string, entry: CacheEntry<T>) => {
    if (storage === "localStorage") return setToLocalStorage<T>(k, entry)
    memoryStore.set(k, entry)
  }

  async function get(params: P): Promise<R> {
    const k = fullKey(source, buildKey(params))
    const now = Date.now()

    let entry = getEntry<R>(k)

    // If there is an in-flight fetch, await it (dedupe)
    if (entry?.promise) {
      try {
        const data = await entry.promise
        return data
      } catch {
        // fall through to try again below
      }
    }

    // If we have fresh data, return it
    if (entry && now - entry.ts <= ttlMs) {
      return entry.data
    }

    // If stale-while-revalidate is enabled and we have stale data, return it and refresh in background
    if (
      entry &&
      staleWhileRevalidateMs &&
      now - entry.ts <= staleWhileRevalidateMs
    ) {
      const staleData = entry.data as R
      const bgPromise: Promise<R> = fetcher(params)
        .then((data) => {
          setEntry<R>(k, { data, ts: Date.now() })
          return data
        })
        .catch(() => {
          // keep stale if refresh fails
          return staleData
        })
      // store the background promise to dedupe concurrent calls
      setEntry<R>(k, { ...entry, promise: bgPromise })
      return entry.data
    }

    // Otherwise fetch fresh, store, and return
    const p = fetcher(params)
    entry = { data: undefined as unknown as R, ts: now, promise: p }
    setEntry<R>(k, entry)

    try {
      const data = await p
      setEntry<R>(k, { data, ts: Date.now() })
      return data
    } catch (err) {
      // If there's an old value, we can return it as a last resort
      if (entry && (entry as any).data !== undefined) {
        return (entry as any).data as R
      }
      // Else rethrow
      throw err
    }
  }

  return get
}
