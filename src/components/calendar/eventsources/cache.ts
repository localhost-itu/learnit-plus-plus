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

function getStorageArea(mode: CacheStorageMode) {
  if (mode === "localStorage") return chrome.storage.local
  if (mode === "sessionStorage") return chrome.storage.session
  return null
}

async function getFromPersistent<T>(mode: CacheStorageMode, k: string): Promise<CacheEntry<T> | undefined> {
  const area = getStorageArea(mode)
  if (!area) return undefined
  try {
    // const raw = await chrome.storage.session.get(k).then((res) => res[k])
    const raw = await area.get(k).then((res) => res[k])
    console.log('getFromPersistent', { mode, k, raw })
    // raw should already be the stored object (you should store the CacheEntry object directly)
    return (raw as CacheEntry<T> | undefined) ?? undefined
  } catch (err) {
    console.warn('storage get failed', err)
    return undefined
  }
}

async function setToPersistent<T>(mode: CacheStorageMode, k: string, entry: CacheEntry<T>) {
  const area = getStorageArea(mode)
  if (!area) return
  try {
    await area.set({ [k]: entry })
    const test = await area.get(k).then((res) => res[k])
  } catch (e) {
    // best effort; ignore quota/serialization issues handled by caller
    throw new Error("PERSIST_FAIL", { cause: e })
  }
}

async function listSourceKeys(mode: CacheStorageMode, source: string): Promise<string[]> {
  const area = getStorageArea(mode)
  if (!area) return []
  const prefix = `events:${source}:`
  
  const keys: string[] = []
  for (const key of await area.getKeys()) {
    if (key && key.startsWith(prefix)) keys.push(key)
  }
  return keys
}

async function tryTrimPersistent(mode: CacheStorageMode, source: string, keep: number) {
  // Remove oldest entries for this source until length <= keep
  const area = getStorageArea(mode)
  if (!area) return
  const keys = await listSourceKeys(mode, source)

  let withTs: { k: string; ts: number }[] = []
  try {
    // Fetch all keys in one call instead of one-by-one
    const all = await area.get(keys)
    for (const k of keys) {
      const raw = (all as Record<string, unknown>)[k]
      const e = raw as CacheEntry<any> | undefined
      withTs.push({ k, ts: e?.ts ?? 0 })
    }
  } catch (err) {
    // Fallback to per-key reads if bulk get fails
    for (const k of keys) {
      try {
        const raw = await area.get(k).then((v: any) => v?.[k])
        const e = raw as CacheEntry<any> | undefined
        withTs.push({ k, ts: e?.ts ?? 0 })
      } catch {
        withTs.push({ k, ts: 0 })
      }
    }
  }
  withTs = withTs.sort((a, b) => b.ts - a.ts) // newest first

  if (withTs.length <= keep) return
  for (const { k } of withTs.slice(keep)) {
    try {
      area.remove(k)
    } catch {
      // ignore
    }
  }
}

export async function clearCalendarCache() {
  memoryStore.clear()
  const prefix = `events:`
  for (const k of memoryStore.keys()) {
    if (k.startsWith(prefix)) memoryStore.delete(k)
  }

  // purge both localStorage and sessionStorage
  for (const mode of ["localStorage", "sessionStorage"] as const) {
    const area = getStorageArea(mode)
    if (!area) continue

    try {
      // iterate backwards to be safe when removing
      const keys = await area.getKeys()
      for (const key of keys) {
        if (key && key.startsWith(prefix)) area.remove(key)
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
  const getEntry = async <T,>(k: string): Promise<CacheEntry<T> | undefined> => {
    if (storage === "memory") return memoryStore.get(k)
    return await getFromPersistent<T>(storage, k)
  }

  const setEntry = async <T,>(k: string, entry: CacheEntry<T>) => {
    if (storage === "memory") return memoryStore.set(k, entry)
    try {
      await setToPersistent<T>(storage, k, entry)
    } catch {
      // Quota or serialization error: trim and retry once
      await tryTrimPersistent(storage, source, Math.max(1, Math.floor(maxEntries * 0.9)))
      try {
        await setToPersistent<T>(storage, k, entry)
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

    const entry = await getEntry<R>(k)
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
