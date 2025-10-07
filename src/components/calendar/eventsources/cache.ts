// Generic caching utility for FullCalendar event sources.
// - Fetchers return FullCalendar EventInput objects (must include start; end optional)
// - Events are bucketed automatically by day/week/month in both memory and persistent storage
// - Supports TTL, stale-while-revalidate, in-flight dedupe, and bounded persistent caches

import type { EventInput } from "@fullcalendar/core"

type PersistentStorage = "localStorage" // | "sessionStorage" // sessionStorage disabled for now due to quota issues
export type CacheStorageMode = "memory" | PersistentStorage 

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
  // if (mode === "sessionStorage") return chrome.storage.session
  return null
}

async function getFromPersistent<T>(
  mode: CacheStorageMode,
  k: string
): Promise<CacheEntry<T> | undefined> {
  const area = getStorageArea(mode)
  if (!area) return undefined
  try {
    const raw = await area.get(k).then((res) => res[k])
    return (raw as CacheEntry<T> | undefined) ?? undefined
  } catch (err) {
    console.warn("storage get failed", err)
    return undefined
  }
}

async function setToPersistent<T>(
  mode: CacheStorageMode,
  k: string,
  entry: CacheEntry<T>
) {
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

async function listSourceKeys(
  mode: CacheStorageMode,
  source: string
): Promise<string[]> {
  const area = getStorageArea(mode)
  if (!area) return []
  const prefix = `events:${source}:`

  const keys: string[] = []
  for (const key of await area.getKeys()) {
    if (key && key.startsWith(prefix)) keys.push(key)
  }
  return keys
}

async function tryTrimPersistent(
  mode: CacheStorageMode,
  source: string,
  keep: number
) {
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
  // add PersistentStorage strings to the array if needed
  for (const mode of ["localStorage"] as const) {
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

type EventGrouping = "day" | "week" | "month"

type RangeParams = {
  start: Date
  end: Date
}

type CachedEventFetcherOptions<P extends RangeParams> = {
  source: string
  ttlMs: number
  grouping: EventGrouping
  fetcher: (params: P) => Promise<EventInput[]>
  storage?: CacheStorageMode
  staleWhileRevalidateMs?: number
  maxEntries?: number
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return new Date(value.getTime())
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d
  }
  return null
}

function startOfDay(date: Date) {
  const d = new Date(date.getTime())
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(date: Date) {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = (day + 6) % 7 // convert Sunday (0) -> 6, Monday -> 0
  d.setDate(d.getDate() - diff)
  return d
}

function startOfMonth(date: Date) {
  const d = startOfDay(date)
  d.setDate(1)
  return d
}

function advance(date: Date, grouping: EventGrouping) {
  const next = new Date(date.getTime())
  if (grouping === "day") {
    next.setDate(next.getDate() + 1)
  } else if (grouping === "week") {
    next.setDate(next.getDate() + 7)
  } else {
    next.setMonth(next.getMonth() + 1)
  }
  return next
}

function bucketStart(date: Date, grouping: EventGrouping) {
  if (grouping === "day") return startOfDay(date)
  if (grouping === "week") return startOfWeek(date)
  return startOfMonth(date)
}

function bucketKey(date: Date, grouping: EventGrouping) {
  const b = bucketStart(date, grouping)
  const year = b.getFullYear()
  const month = `${b.getMonth() + 1}`.padStart(2, "0")
  const day = `${b.getDate()}`.padStart(2, "0")
  if (grouping === "day") return `day:${year}-${month}-${day}`
  if (grouping === "week") return `week:${year}-${month}-${day}`
  return `month:${year}-${month}`
}

function enumerateBucketKeys(start: Date, end: Date, grouping: EventGrouping) {
  const keys: string[] = []
  const seen = new Set<string>()
  let cursor = bucketStart(start, grouping)
  const endBucket = bucketStart(end, grouping)
  while (cursor.getTime() <= endBucket.getTime()) {
    const key = bucketKey(cursor, grouping)
    if (!seen.has(key)) {
      keys.push(key)
      seen.add(key)
    }
    cursor = advance(cursor, grouping)
  }
  return keys
}

function enumerateBucketsForEvent(event: EventInput, grouping: EventGrouping) {
  const startDate = toDate(event.start)
  if (!startDate) return []
  const endDate = toDate(event.end) ?? startDate
  if (endDate.getTime() < startDate.getTime()) return []
  const keys: string[] = []
  let cursor = bucketStart(startDate, grouping)
  const endBucket = bucketStart(endDate, grouping)
  while (cursor.getTime() <= endBucket.getTime()) {
    keys.push(bucketKey(cursor, grouping))
    cursor = advance(cursor, grouping)
  }
  return keys
}

function cloneEvent(
  event: EventInput,
  startIso: string,
  endIso?: string
): EventInput {
  const cloned: EventInput = {
    ...event,
    start: startIso
  }
  if (endIso) cloned.end = endIso
  if (event.extendedProps && typeof event.extendedProps === "object") {
    cloned.extendedProps = { ...event.extendedProps }
  }
  return cloned
}

function normalizeEvent(event: EventInput): EventInput | null {
  const startDate = toDate(event.start)
  if (!startDate) return null
  const endDate = toDate(event.end ?? event.start)
  const startIso = startDate.toISOString()
  const endIso = endDate ? endDate.toISOString() : undefined
  return cloneEvent(event, startIso, endIso)
}

function dedupeEvents(events: EventInput[]) {
  const seen = new Set<string>()
  const out: EventInput[] = []
  for (const ev of events) {
    const key = `${ev.id ?? ""}|${ev.start ?? ""}|${ev.end ?? ""}`
    if (!seen.has(key)) {
      seen.add(key)
      out.push(ev)
    }
  }
  return out
}

function eventOverlapsRange(event: EventInput, start: Date, end: Date) {
  const evStart = toDate(event.start)
  if (!evStart) return false
  const evEnd = toDate(event.end) ?? evStart
  return evStart.getTime() < end.getTime() && evEnd.getTime() >= start.getTime()
}

export function createCachedFetcher<P extends RangeParams>(
  opts: CachedEventFetcherOptions<P>
) {
  const {
    source,
    ttlMs,
    grouping,
    fetcher,
    storage = "memory",
    staleWhileRevalidateMs = 0,
    maxEntries = 24
  } = opts

  const getEntry = async (
    k: string
  ): Promise<CacheEntry<EventInput[]> | undefined> => {
    if (storage === "memory") return memoryStore.get(k)
    return await getFromPersistent<EventInput[]>(storage, k)
  }

  const setEntry = async (k: string, entry: CacheEntry<EventInput[]>) => {
    if (storage === "memory") {
      memoryStore.set(k, entry)
      return
    }
    try {
      await setToPersistent<EventInput[]>(storage, k, entry)
    } catch {
      await tryTrimPersistent(
        storage,
        source,
        Math.max(1, Math.floor(maxEntries * 0.9))
      )
      try {
        await setToPersistent<EventInput[]>(storage, k, entry)
      } catch {
        // give up persisting
      }
    }
  }

  const ensureRangeDates = (params: P) => {
    const startDate = toDate(params.start)
    const endDate = toDate(params.end)
    if (!startDate || !endDate) {
      throw new Error(
        "Cached fetcher params must include valid start/end dates"
      )
    }
    if (endDate.getTime() < startDate.getTime()) {
      throw new Error("Cached fetcher end date must not be before start date")
    }
    return { start: startDate, end: endDate }
  }

  const buildRangeKey = (start: Date, end: Date) =>
    `range:${source}:${start.toISOString()}:${end.toISOString()}`

  const fetchAndStore = async (params: P, start: Date, end: Date) => {
    const eventsRaw = await fetcher(params)
    const normalized = dedupeEvents(
      eventsRaw
        .map((ev) => normalizeEvent(ev))
        .filter((ev): ev is EventInput => Boolean(ev))
    )

    const now = Date.now()
    const buckets = new Map<string, EventInput[]>()
    for (const event of normalized) {
      const keys = enumerateBucketsForEvent(event, grouping)
      if (keys.length === 0) continue
      for (const key of keys) {
        const arr = buckets.get(key) ?? []
        arr.push(event)
        buckets.set(key, arr)
      }
    }

    for (const [key, bucketEvents] of buckets.entries()) {
      const storageKey = fullKey(source, key)
      await setEntry(storageKey, { data: dedupeEvents(bucketEvents), ts: now })
    }

    const expectedKeys = enumerateBucketKeys(start, end, grouping)
    for (const key of expectedKeys) {
      if (buckets.has(key)) continue
      const storageKey = fullKey(source, key)
      await setEntry(storageKey, { data: [], ts: now })
    }

    return normalized
  }

  async function get(params: P): Promise<EventInput[]> {
    const { start, end } = ensureRangeDates(params)
    const now = Date.now()
    const keys = enumerateBucketKeys(start, end, grouping)
    const collected: EventInput[] = []
    let needsFetch = false
    let hasServeableStale = false

    for (const key of keys) {
      const storageKey = fullKey(source, key)
      const entry = await getEntry(storageKey)
      if (!entry) {
        needsFetch = true
        break
      }
      const age = now - entry.ts
      if (age <= ttlMs) {
        collected.push(...entry.data)
        continue
      }
      if (staleWhileRevalidateMs > 0 && age <= ttlMs + staleWhileRevalidateMs) {
        collected.push(...entry.data)
        hasServeableStale = true
        continue
      }
      needsFetch = true
      break
    }

    const inflightKey = buildRangeKey(start, end)

    if (needsFetch) {
      const inflightExisting = inFlight.get(inflightKey)
      if (inflightExisting) {
        const data = (await inflightExisting) as EventInput[]
        return dedupeEvents(
          data.filter((ev) => eventOverlapsRange(ev, start, end))
        )
      }
      const p = (async () => {
        try {
          return await fetchAndStore(params, start, end)
        } finally {
          inFlight.delete(inflightKey)
        }
      })()
      inFlight.set(inflightKey, p)
      const data = await p
      return dedupeEvents(
        data.filter((ev) => eventOverlapsRange(ev, start, end))
      )
    }

    if (hasServeableStale) {
      if (!inFlight.has(inflightKey)) {
        const p = (async () => {
          try {
            await fetchAndStore(params, start, end)
          } catch (err) {
            console.warn("Failed background refresh for", source, err)
          } finally {
            inFlight.delete(inflightKey)
          }
        })()
        inFlight.set(inflightKey, p)
      }
    }

    return dedupeEvents(
      collected.filter((ev) => eventOverlapsRange(ev, start, end))
    )
  }

  return get
}
